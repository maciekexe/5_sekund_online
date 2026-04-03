require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const Groq = require('groq-sdk');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const rooms = new Map();

function generateRoomCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

async function generateAIQuestion(category) {
  const categoryPrompts = {
    "Bajki": "postaci z bajek i animacji.",
    "Przyjaciele": "sytuacji z życia i relacji.",
    "Filmy": "kina i aktorów.",
    "Impreza": "zabawy, tańca i jedzenia.",
    "Polska": "polskiej kultury i tradycji.",
    "Różne": "wiedzy ogólnej i absurdalnych pytań."
  };
  const theme = categoryPrompts[category] || "wszystkiego.";
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: `Jesteś hostem gry '5 sekund'. Kategoria: ${theme}. Wygeneruj 'Wymień 3...'. Krótko, po polsku.` },
        { role: "user", content: "Podaj 1 unikalne zadanie." }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.9,
    });
    return completion.choices[0]?.message?.content;
  } catch (e) { 
    return "Wymień 3 polskie miasta."; 
  }
}

io.on('connection', (socket) => {
  socket.on('createRoom', ({ playerData, targetScore, sessionId }) => {
    const code = generateRoomCode();
    socket.join(code);
    const roomState = {
      code,
      hostSessionId: sessionId, 
      targetScore: targetScore || 11,
      players: [{ id: socket.id, sessionId, name: playerData.name, color: playerData.color, position: 0 }],
      currentTurnId: socket.id,
      currentQuestion: "Czekaj na start Hosta...",
      timeLeft: 5,
      currentPhase: "",
      currentCategory: "Różne",
      isPlaying: false,
      showVoting: false,
      votes: {},
      winnerId: null
    };
    rooms.set(code, roomState);
    socket.emit('roomJoined', roomState);
  });

  socket.on('joinRoom', ({ code, playerData, sessionId }) => {
    const room = rooms.get(code);
    if (!room) return socket.emit('error', 'Pokój nie istnieje!');

    socket.join(code);
    const existingPlayer = room.players.find(p => p.sessionId === sessionId);
    
    if (existingPlayer) {
      existingPlayer.id = socket.id; 
      if (room.currentTurnId === existingPlayer.id) room.currentTurnId = socket.id; 
    } else {
      room.players.push({ id: socket.id, sessionId, name: playerData.name, color: playerData.color, position: 0 });
    }
    
    io.to(code).emit('gameStateUpdate', room);
    socket.emit('roomJoined', room);
  });

  const startTurnLogic = async (roomCode, category = null) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    if (category) room.currentCategory = category;
    room.currentQuestion = "🤖 AI generuje pytanie...";
    room.currentPhase = "";
    room.isPlaying = true;
    io.to(roomCode).emit('gameStateUpdate', room);

    room.currentQuestion = await generateAIQuestion(room.currentCategory);
    room.timeLeft = 5;
    room.currentPhase = "reading";
    room.showVoting = false;
    room.votes = {};
    
    io.to(roomCode).emit('playSound', 'start_reading');
    io.to(roomCode).emit('gameStateUpdate', room);

    if (room.timer) clearInterval(room.timer);
    room.timer = setInterval(() => {
      room.timeLeft -= 1;
      
      if (room.timeLeft <= 0 && room.currentPhase === "reading") {
        room.timeLeft = 5;
        room.currentPhase = "answering";
        io.to(roomCode).emit('playSound', 'start_answering');
      } 
      else if (room.timeLeft <= 0 && room.currentPhase === "answering") {
        clearInterval(room.timer);
        room.isPlaying = false;
        room.currentPhase = "voting";
        room.showVoting = true;
        io.to(roomCode).emit('playSound', 'buzzer');
      }
      else if (room.timeLeft <= 3 && room.currentPhase === "answering") {
        io.to(roomCode).emit('playSound', 'tick'); 
      }
      
      io.to(roomCode).emit('gameStateUpdate', room);
    }, 1000);
  };

  socket.on('startTurn', ({ roomCode, category }) => startTurnLogic(roomCode, category));
  socket.on('skipQuestion', ({ roomCode }) => startTurnLogic(roomCode));

  socket.on('kickPlayer', ({ roomCode, targetSessionId }) => {
    const room = rooms.get(roomCode);
    if (!room) return;
    room.players = room.players.filter(p => p.sessionId !== targetSessionId);
    
    const currentPlayerExists = room.players.find(p => p.id === room.currentTurnId);
    if (!currentPlayerExists && room.players.length > 0) {
      room.currentTurnId = room.players[0].id;
      room.isPlaying = false;
      room.showVoting = false;
      if (room.timer) clearInterval(room.timer);
    }
    io.to(roomCode).emit('gameStateUpdate', room);
  });

  socket.on('submitVote', ({ roomCode, vote }) => {
    const room = rooms.get(roomCode);
    if (!room || !room.showVoting || socket.id === room.currentTurnId) return;
    
    room.votes[socket.id] = vote;
    const reqVotes = room.players.length - 1;
    
    if (Object.keys(room.votes).length >= reqVotes && reqVotes > 0) {
      const yes = Object.values(room.votes).filter(v => v === 'success').length;
      if (yes > reqVotes / 2) {
        room.players = room.players.map(p => {
          if (p.id === room.currentTurnId) {
            const nPos = Math.min(p.position + 1, room.targetScore);
            if (nPos === room.targetScore) room.winnerId = p.id;
            return { ...p, position: nPos };
          }
          return p;
        });
      }
      
      if (!room.winnerId) {
        const idx = room.players.findIndex(p => p.id === room.currentTurnId);
        room.currentTurnId = room.players[(idx + 1) % room.players.length].id;
        room.currentQuestion = "Przygotuj się!";
        room.currentPhase = "";
      }
      room.showVoting = false;
      room.votes = {};
    }
    io.to(roomCode).emit('gameStateUpdate', room);
  });

  socket.on('disconnect', () => {
    rooms.forEach((room, code) => {
      const disconnectedPlayer = room.players.find(p => p.id === socket.id);
      if (disconnectedPlayer) {
        const activePlayers = room.players.filter(p => p.id !== socket.id);
        if (room.hostSessionId === disconnectedPlayer.sessionId && activePlayers.length > 0) {
           room.hostSessionId = activePlayers[0].sessionId; 
        }
      }
    });
  });
});

server.listen(3001, () => console.log(`🚀 Serwer Multi-Room śmiga!`));