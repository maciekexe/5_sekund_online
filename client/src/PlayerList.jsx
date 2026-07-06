import React from 'react';
import './PlayerList.css';

const PlayerList = ({ players, currentTurnId, votes, showVoting, isHost, roomCode, socket }) => {
  return (
    <div className="player-list-container">
      <h3>Gracze</h3>
      <ul className="player-list">
        {players.map((p) => (
          <li key={p.sessionId} className={`player-item ${p.id === currentTurnId ? 'active-turn' : ''}`}>
            <div className="player-color-box" style={{ backgroundColor: p.color, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <img src={`https://api.dicebear.com/9.x/bottts/svg?seed=${p.name}`} alt="avatar" style={{width: '90%', height: '90%', borderRadius: '50%'}} />
            </div>
            <div className="player-info"><span className="player-name">{p.name}</span><span>Pkt: {p.position}</span></div>
            {showVoting && p.id !== currentTurnId && (
              votes && votes[p.id] ? <span style={{ color: '#2ed573', marginRight: '10px' }} title="Zagłosował">✅</span> : <span style={{ marginRight: '10px' }} title="Czeka na głos...">⏳</span>
            )}
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