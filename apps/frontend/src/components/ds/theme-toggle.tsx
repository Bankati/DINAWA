'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';

// `mounted` évite le mismatch d'hydratation (next-themes ne connaît le
// thème réel qu'après montage côté client).
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="w-9 h-9" />;

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground bg-ds-secondary hover:text-foreground transition-colors"
      aria-label={isDark ? 'Passer en thème clair' : 'Passer en thème sombre'}
    >
      {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
    </button>
  );
}
