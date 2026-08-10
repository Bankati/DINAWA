'use client';

import { useEffect, useState } from 'react';
import { subscribeApiLoading } from '@/lib/api';

export function GlobalProgressBar() {
  const [active, setActive] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    return subscribeApiLoading((loading) => {
      clearTimeout(timer);
      if (loading) {
        setDone(false);
        setActive(true);
      } else {
        setDone(true);
        // Laisse l'animation "terminé" se jouer avant de masquer
        timer = setTimeout(() => {
          setActive(false);
          setDone(false);
        }, 500);
      }
    });
  }, []);

  if (!active) return null;

  return (
    <>
      <style>{`
        @keyframes warah-bar-slide {
          0%   { left: -40%; width: 40%; }
          60%  { left: 90%;  width: 70%; }
          100% { left: 130%; width: 40%; }
        }
        @keyframes warah-bar-done {
          0%   { left: 0; width: 0%;   opacity: 1; }
          60%  { left: 0; width: 100%; opacity: 1; }
          100% { left: 0; width: 100%; opacity: 0; }
        }
      `}</style>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 3,
        zIndex: 99999, overflow: 'hidden',
        background: 'rgba(15,76,129,0.08)',
        pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute', height: '100%',
          background: 'linear-gradient(90deg, #C9982E 0%, #0F4C81 50%, #C9982E 100%)',
          backgroundSize: '200% 100%',
          ...(done
            ? { animation: 'warah-bar-done 0.45s ease forwards', left: 0 }
            : { animation: 'warah-bar-slide 1.4s ease-in-out infinite', left: 0 }
          ),
        }} />
      </div>
    </>
  );
}
