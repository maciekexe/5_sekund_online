import React, { useState } from 'react';

const Lobby = ({ onJoin, sessionId }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#00d2ff');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState('menu'); 
  const [targetScore, setTargetScore] = useState(11);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (mode === 'create') onJoin({ type: 'create', playerData: { name, color }, targetScore, sessionId });
    else onJoin({ type: 'join', code, playerData: { name, color }, sessionId });
  };

  if (mode === 'menu') {
    return (
      <div className="lobby-container">
        <h1>5 SEKUND</h1>
        <button className="premium-btn" onClick={() => setMode('create')} style={{width: '100%', marginBottom: '15px'}}>👑 STWÓRZ POKÓJ</button>
        <button className="premium-btn" onClick={() => setMode('join')} style={{width: '100%', background: '#3498db'}}>🎮 DOŁĄCZ DO GRY</button>
        {localStorage.getItem('5sek_lastRoom') && (
           <p style={{ marginTop: '20px', cursor: 'pointer', color: '#ff4757' }} onClick={() => { setMode('join'); setCode(localStorage.getItem('5sek_lastRoom')); }}>Wróć do pokoju {localStorage.getItem('5sek_lastRoom')}</p>
        )}
      </div>
    );
  }

  return (
    <div className="lobby-container">
      <button onClick={() => setMode('menu')} style={{ background: 'none', color: '#aaa', border: 'none', cursor: 'pointer', marginBottom: '20px' }}>← Wróć do menu</button>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Twój Nick..." value={name} onChange={(e) => setName(e.target.value)} maxLength={15} required style={{ width: '100%', padding: '15px', borderRadius: '10px', border: 'none', marginBottom: '15px' }} />
        {mode === 'join' && <input type="text" placeholder="KOD PIN (np. 1234)" value={code} onChange={(e) => setCode(e.target.value)} required style={{ width: '100%', padding: '15px', borderRadius: '10px', border: 'none', marginBottom: '15px', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }} />}
        {mode === 'create' && (
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>Punkty do wygranej:</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              {[5, 11, 20].map(score => (
                <button type="button" key={score} onClick={() => setTargetScore(score)} style={{ padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: targetScore === score ? '#6c5ce7' : '#333', color: 'white' }}>{score}</button>
              ))}
            </div>
          </div>
        )}
        <div style={{ marginBottom: '30px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
          {['#ff4757', '#00d2ff', '#2ed573', '#ffa502', '#9c88ff'].map(c => (
            <div key={c} onClick={() => setColor(c)} style={{ width: '35px', height: '35px', borderRadius: '50%', background: c, border: color === c ? '4px solid white' : 'none', cursor: 'pointer' }} />
          ))}
        </div>
        <button type="submit" className="premium-btn" style={{ width: '100%' }}>{mode === 'create' ? 'TWORZĘ POKÓJ' : 'WCHODZĘ'}</button>
      </form>
    </div>
  );
};
export default Lobby;