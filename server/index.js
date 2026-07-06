require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const Groq = require('groq-sdk');
const { z } = require('zod');

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
    "Filmy": "postacie z bajek i animacji oraz filmów.",
    "Przyjaciele": "sytuacje z życia i relacji.",
    "Impreza": "zabawy, tańce, jedzenie.",
    "Wszystko": "mieszanka wszystkiego",
    "🌶️ 18+": "odważnych pytań i pikantnych tematów.",
    "🌍 Świat": "podróży, geografii i marek."
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
    const fallbackQuestions = [
      "Wymień 3 marki samochodów.", "Wymień 3 popularne sporty.",
      "Wymień 3 gatunki filmowe.", "Wymień 3 zwierzęta domowe.",
      "Wymień 3 polskie miasta.", "Wymień 3 owoce cytrusowe.",
      "Wymień 3 kraje w Europie.", "Wymień 3 rodzaje pizzy."
    ];
    return fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
  }
}

const playerSchema = z.object({
  name: z.string().min(1).max(15),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).or(z.string().min(1)) // basic validation
});

io.on('connection', (socket) => {
  socket.on('createRoom', ({ playerData, targetScore, sessionId }) => {
    try {
      playerSchema.parse(playerData);
    } catch(e) {
      return socket.emit('error', 'Nieprawidłowe dane gracza.');
    }
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
    try {
      playerSchema.parse(playerData);
    } catch(e) {
      return socket.emit('error', 'Nieprawidłowe dane gracza.');
    }
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

  
    if (room.timer) clearInterval(room.timer);

   
    if (category) room.currentCategory = category;
    room.currentQuestion = "🤖 AI generuje pytanie...";
    room.currentPhase = "";
    room.isPlaying = true;
    room.showVoting = false; 
    room.votes = {};
    io.to(roomCode).emit('gameStateUpdate', room);

  
    const newQuestion = await generateAIQuestion(room.currentCategory);

    
    const roomCheck = rooms.get(roomCode);
    if (!roomCheck) return;

 
    roomCheck.currentQuestion = newQuestion;
    roomCheck.timeLeft = 3;
    roomCheck.currentPhase = "reading";

    io.to(roomCode).emit('playSound', 'start_reading');
    io.to(roomCode).emit('gameStateUpdate', roomCheck);


    roomCheck.timer = setInterval(() => {
      roomCheck.timeLeft -= 1;
      
      if (roomCheck.timeLeft <= 0 && roomCheck.currentPhase === "reading") {
        roomCheck.timeLeft = 5;
        roomCheck.currentPhase = "answering";
        io.to(roomCode).emit('playSound', 'start_answering');
      } 
      else if (roomCheck.timeLeft <= 0 && roomCheck.currentPhase === "answering") {
        clearInterval(roomCheck.timer);
        roomCheck.isPlaying = false;
        roomCheck.currentPhase = "voting";
        roomCheck.showVoting = true;
        io.to(roomCode).emit('playSound', 'buzzer');
      }
      else if (roomCheck.timeLeft <= 3 && roomCheck.currentPhase === "answering") {
        io.to(roomCode).emit('playSound', 'tick'); 
      }
      
      io.to(roomCode).emit('gameStateUpdate', roomCheck);
    }, 1000);
  };

  socket.on('startTurn', ({ roomCode, category }) => {
    const room = rooms.get(roomCode);
    if (room && room.players.find(p => p.id === socket.id)?.sessionId === room.hostSessionId) {
      startTurnLogic(roomCode, category);
    }
  });
  socket.on('skipQuestion', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (room && room.players.find(p => p.id === socket.id)?.sessionId === room.hostSessionId) {
      startTurnLogic(roomCode);
    }
  });


  socket.on('kickPlayer', ({ roomCode, targetSessionId }) => {
    const room = rooms.get(roomCode);
    if (!room || room.players.find(p => p.id === socket.id)?.sessionId !== room.hostSessionId) return;

    
    const playerToKick = room.players.find(p => p.sessionId === targetSessionId);

    
    room.players = room.players.filter(p => p.sessionId !== targetSessionId);
    
   
    const currentPlayerExists = room.players.find(p => p.id === room.currentTurnId);
    if (!currentPlayerExists && room.players.length > 0) {
      room.currentTurnId = room.players[0].id;
      room.isPlaying = false;
      room.showVoting = false;
      if (room.timer) clearInterval(room.timer);
    }

    if (playerToKick) {
      io.to(playerToKick.id).emit('kickedOut');
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


socket.on('restartGame', ({ roomCode, sessionId }) => {
    console.log("=== PRÓBA RESTARTU ===");
    console.log("Otrzymany roomCode:", roomCode);
    console.log("Otrzymany sessionId (klikającego):", sessionId);

    const room = rooms.get(roomCode);
    if (!room) {
      console.log("Błąd: Nie znaleziono pokoju o takim kodzie!");
      return;
    }
    
    console.log("Host zapisany w pokoju to:", room.hostSessionId);
    
    if (room.hostSessionId !== sessionId) {
      console.log("Błąd: Osoba klikająca nie jest Hostem na serwerze!");
      return;
    }

  
    room.players = room.players.map(p => ({ ...p, position: 0 }));
    room.winnerId = null;
    room.isPlaying = false;
    room.showVoting = false;
    room.currentPhase = "";
    room.currentQuestion = "Czekaj na start Hosta...";
    
    if (room.players.length > 0) {
      room.currentTurnId = room.players[0].id;
    }

    console.log("Sukces! Gra zresetowana, wysyłam nowy stan do graczy.");
    io.to(roomCode).emit('gameStateUpdate', room);
  });


  socket.on('leaveRoom', ({ roomCode, sessionId }) => {
    const room = rooms.get(roomCode);
    if (!room) return;

  
    room.players = room.players.filter(p => p.sessionId !== sessionId);

    if (room.players.length === 0) {
      rooms.delete(roomCode); 
    } else {
      
      if (room.hostSessionId === sessionId) {
        room.hostSessionId = room.players[0].sessionId;
      }
     
      const currentPlayerExists = room.players.find(p => p.id === room.currentTurnId);
      if (!currentPlayerExists) {
        room.currentTurnId = room.players[0].id;
        room.isPlaying = false;
        room.showVoting = false;
        if (room.timer) clearInterval(room.timer);
      }
      io.to(roomCode).emit('gameStateUpdate', room);
    }
    socket.leave(roomCode);
  });




  socket.on('disconnect', () => {
    rooms.forEach((room, code) => {
      const disconnectedPlayer = room.players.find(p => p.id === socket.id);
      if (disconnectedPlayer) {
        room.players = room.players.filter(p => p.id !== socket.id);
        if (room.players.length === 0) {
          rooms.delete(code);
        } else if (room.hostSessionId === disconnectedPlayer.sessionId) {
           room.hostSessionId = room.players[0].sessionId; 
        }
      }
    });
  });
});

server.listen(3001, () => console.log(`🚀 Serwer Multi-Room śmiga!`));