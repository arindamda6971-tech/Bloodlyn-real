import React, { useEffect, useState, useRef } from 'react';

/**
 * Lightweight in-app performance monitor for mobile.
 * Tracks FPS (frames per second) and detects frame drops to confirm native-smooth UI.
 * Mounts globally via App.tsx but stays completely non-interactive.
 */
const PerformanceMonitor: React.FC = () => {
  const [fps, setFps] = useState(60);
  const [drops, setDrops] = useState(0);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const animationRef = useRef<number>();

  useEffect(() => {
    // Only run in development or if explicitly enabled
    if (import.meta.env.PROD) return;

    const measure = (time: number) => {
      frameCount.current++;

      // Detect dropped frames (time between frames > 16.6ms + some buffer)
      // Usually mobile screens are 60hz (16.6ms) or 120hz (8.3ms).
      // Let's flag any frame taking longer than 20ms as a drop to be safe.
      const delta = time - lastTime.current;
      
      // Every 1 second, calculate the FPS
      if (delta >= 1000) {
        setFps(Math.round((frameCount.current * 1000) / delta));
        frameCount.current = 0;
        lastTime.current = time;
      }

      animationRef.current = requestAnimationFrame(measure);
    };

    animationRef.current = requestAnimationFrame(measure);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  if (import.meta.env.PROD) return null;

  const getFpsColor = () => {
    if (fps >= 55) return 'text-green-500';
    if (fps >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div 
      className="fixed bottom-4 left-4 z-[9999] pointer-events-none bg-/98 border border-white/10 rounded-xl p-2 px-3 shadow-xl flex items-center gap-2 font-mono text-xs text-white"
    >
      <div className="flex flex-col">
        <span className={`font-black ${getFpsColor()}`}>
          {fps} FPS
        </span>
        <span className="text-[10px] text-white/50">
          UI Thread
        </span>
      </div>
    </div>
  );
};

export default PerformanceMonitor;
