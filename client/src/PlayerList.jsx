import React from 'react';
import './PlayerList.css';

const PlayerList = ({ players, currentTurnId, votes, isHost, roomCode, socket }) => {
  return (
    <div className="player-list-container">
      <h3>Gracze</h3>
      <ul className="player-list">
        {players.map((p) => (
          <li key={p.sessionId} className={`player-item ${p.id === currentTurnId ? 'active-turn' : ''}`}>
            <div className="player-color-box" style={{ backgroundColor: p.color }}></div>
            <div className="player-info"><span className="player-name">{p.name}</span><span>Pkt: {p.position}</span></div>
            {votes && votes[p.id] && <span style={{ color: '#2ed573', marginRight: '10px' }}>✓</span>}
            {p.id === currentTurnId && <span className="turn-indicator">TURA</span>}
            {isHost && socket.id !== p.id && (
               <button onClick={() => socket.emit('kickPlayer', { roomCode, targetSessionId: p.sessionId })} style={{ background: 'transparent', border: 'none', color: '#ff4757', cursor: 'pointer', fontSize: '1.2rem', marginLeft: '10px' }}>✖</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
export default PlayerList;