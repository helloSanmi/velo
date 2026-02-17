
import React, { useState, useEffect } from 'react';
import { User } from '../types';

interface RemoteCursor {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
}

const PresenceOverlay: React.FC<{ users: User[] }> = ({ users }) => {
  const [cursors, setCursors] = useState<RemoteCursor[]>([]);

  useEffect(() => {
    const remoteUsers = users.filter(u => u.username !== 'admin').slice(0, 2);
    
    const initialCursors = remoteUsers.map(u => ({
      id: u.id,
      name: u.displayName,
      color: ['#6366f1', '#10b981', '#f59e0b', '#ec4899'][Math.floor(Math.random() * 4)],
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight
    }));

    setCursors(initialCursors);

    const interval = setInterval(() => {
      setCursors(prev => prev.map(c => ({
        ...c,
        x: Math.max(0, Math.min(window.innerWidth - 100, c.x + (Math.random() - 0.5) * 150)),
        y: Math.max(0, Math.min(window.innerHeight - 100, c.y + (Math.random() - 0.5) * 150))
      })));
    }, 2000);

    return () => clearInterval(interval);
  }, [users]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[40] overflow-hidden">
      {cursors.map(c => (
        <div 
          key={c.id}
          className="absolute transition-all duration-[2000ms] ease-in-out flex flex-col items-start gap-1"
          style={{ transform: `translate(${c.x}px, ${c.y}px)` }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5.65376 12.3822L2.99999 3.14711L12.2351 5.80088L7.84279 8.16315L5.65376 12.3822Z" fill={c.color} stroke="white" strokeWidth="2"/>
          </svg>
          <div 
            className="px-2 py-0.5 rounded-full text-[9px] font-black text-white uppercase tracking-widest shadow-lg"
            style={{ backgroundColor: c.color }}
          >
            {c.name}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PresenceOverlay;
