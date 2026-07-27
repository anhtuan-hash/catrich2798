import React, { useMemo } from 'react';

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
}

export const CosmicStarfield: React.FC<{ isFullCanvas?: boolean }> = ({ isFullCanvas = false }) => {
  const stars = useMemo<Star[]>(() => {
    const colors = ['#ffffff', '#a78bfa', '#60a5fa', '#f472b6', '#38bdf8'];
    return Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2.5 + 1,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
  }, []);

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${isFullCanvas ? 'z-0' : 'z-0'}`}>
      {/* Nebulae Gradient Glows */}
      <div className="absolute -top-20 -left-20 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-nebula" />
      <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-nebula" style={{ animationDelay: '3s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-600/10 rounded-full blur-3xl animate-nebula" style={{ animationDelay: '6s' }} />

      {/* Star Particles */}
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full animate-twinkle"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            backgroundColor: star.color,
            boxShadow: `0 0 ${star.size * 2}px ${star.color}`,
            animationDuration: `${star.duration}s`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}

      {/* Distant Planet Illustration Ornaments */}
      <div className="absolute top-8 right-12 w-14 h-14 rounded-full bg-gradient-to-tr from-purple-800 via-indigo-600 to-pink-500 opacity-30 blur-[1px] animate-float-cosmic shadow-lg shadow-purple-500/20 pointer-events-none flex items-center justify-center">
        {/* Saturn Ring Accent */}
        <div className="w-20 h-3 border-t-2 border-purple-300/40 rounded-full transform -rotate-12" />
      </div>

      <div className="absolute bottom-10 left-10 w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-400 opacity-25 animate-float-cosmic" style={{ animationDelay: '2s' }} />
    </div>
  );
};
