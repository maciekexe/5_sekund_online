import React from 'react';
import './GameBoard.css';

const GameBoard = ({ players, targetScore }) => {
  const path = [];
  let cx = 1, cy = 1, dir = 1;
  for (let i = 0; i <= targetScore; i++) {
    path.push({ id: i, x: cx, y: cy, t: i === 0 ? 'start' : (i === targetScore ? 'finish' : '') });
    if ((i + 1) % 5 === 0) { cy++; dir *= -1; } else { cx += dir; }
  }

  return (
    <div className="board-box" style={{ gridTemplateRows: `repeat(${Math.ceil(targetScore/5)}, 85px)` }}>
      {path.map(p => (
        <div key={p.id} className={`tile ${p.t || ''}`} style={{ gridColumn: p.x, gridRow: p.y }}>
          {p.t === 'start' ? '🚀' : p.t === 'finish' ? '🏆' : p.id}
        </div>
      ))}
      {players.map((p) => {
        const tile = path.find(t => t.id === Math.min(p.position, targetScore));
        if (!tile) return null;
        return (
          <div key={p.sessionId} className="pawn" style={{ backgroundColor: p.color, gridColumn: tile.x, gridRow: tile.y, boxShadow: `0 0 15px ${p.color}` }}>
            {p.name.charAt(0).toUpperCase()}
          </div>
        );
      })}
    </div>
  );
};
export default GameBoard;