import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import GameBoard from './GameBoard'; 
import PlayerList from './PlayerList';
import Lobby from './Lobby';
import './App.css';

const socket = io('http://localhost:3001');

function App() {
  const [hasJoined, setHasJoined] = useState(false);
  const [gameState, setGameState] = useState(null);
  
  const [sessionId] = useState(() => {
    let sid = localStorage.getItem('5sek_sessionId');
    if (!sid) {
      sid = Math.random().toString(36).substring(2, 10);
      localStorage.setItem('5sek_sessionId', sid);
    }
    return sid;
  });

  useEffect(() => {
    socket.on('roomJoined', (data) => { 
      setGameState(data); 
      setHasJoined(true); 
      localStorage.setItem('5sek_lastRoom', data.code);
    });
    
    socket.on('gameStateUpdate', (data) => setGameState(data));
    socket.on('error', (msg) => { alert(msg); setHasJoined(false); });

    socket.on('playSound', (type) => {
      console.log(`[AUDIO]: Odtwórz -> ${type}.mp3`);
    });

    return () => { 
      socket.off('roomJoined'); 
      socket.off('gameStateUpdate'); 
      socket.off('error'); 
      socket.off('playSound');
    };
  }, []);

  if (!hasJoined) return <Lobby sessionId={sessionId} onJoin={(d) => {
    if (d.type === 'create') socket.emit('createRoom', d);
    else socket.emit('joinRoom', d);
  }} />;

  const isHost = gameState.hostSessionId === sessionId;
  const isMyTurn = socket.id === gameState.currentTurnId;
  const winner = gameState.players.find(p => p.id === gameState.winnerId);

  return (
    <div className="main-wrapper">
      <div className="game-area">
        <h1 className="game-logo" onClick={() => {navigator.clipboard.writeText(gameState.code); alert('Skopiowano!');}} style={{ cursor: 'pointer' }}>
          PIN POKOJU: <span style={{ color: '#6c5ce7' }}>{gameState.code}</span> 📋
        </h1>
        
        {winner && (
          <div className="winner-overlay">
            <div className="winner-card">
              <span className="winner-icon">🏆</span>
              <h1>GRATULACJE!</h1>
              <h2>Wygrywa <span style={{ color: winner?.color }}>{winner?.name}</span></h2>
              {isHost && <p style={{marginTop: '20px'}}>Załóż nowy pokój, by zagrać ponownie!</p>}
            </div>
          </div>
        )}

        <div className={`question-panel phase-${gameState.currentPhase}`}>
          {isHost && !gameState.isPlaying && !gameState.showVoting && (
            <div className="category-btns">
              {['Bajki', 'Przyjaciele', 'Filmy', 'Impreza', 'Polska', 'Różne'].map(cat => (
                <button key={cat} onClick={() => socket.emit('startTurn', { roomCode: gameState.code, category: cat })} className="cat-btn">
                  {cat}
                </button>
              ))}
            </div>
          )}

          {isHost && gameState.isPlaying && (
            <button className="premium-btn" style={{ background: '#ff4757', padding: '10px', fontSize: '0.8rem' }} 
              onClick={() => socket.emit('skipQuestion', { roomCode: gameState.code })}>
              ⏭ POMIŃ PYTANIE
            </button>
          )}

          <div className="timer-badge">{gameState.timeLeft}</div>
          <h2 className="question-text">{gameState.currentQuestion}</h2>
          
          {gameState.showVoting && !isMyTurn && !gameState.votes[socket.id] && (
            <div className="voting-section">
              <p>Oceń gracza:</p>
              <div className="vote-btns">
                <button className="vote-btn yes" onClick={() => socket.emit('submitVote', { roomCode: gameState.code, vote: 'success' })}>ZALICZONE</button>
                <button className="vote-btn no" onClick={() => socket.emit('submitVote', { roomCode: gameState.code, vote: 'fail' })}>SKUCHA</button>
              </div>
            </div>
          )}
        </div>

        <div className="middle-section">
          <PlayerList players={gameState.players} currentTurnId={gameState.currentTurnId} votes={gameState.votes} isHost={isHost} roomCode={gameState.code} socket={socket} />
          <GameBoard players={gameState.players} targetScore={gameState.targetScore} />
        </div>
      </div>
    </div>
  );
}

export default App;