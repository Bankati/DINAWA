import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';

export interface SkeletonProps {
  className?: string;
  height?: number | string;
  width?: number | string;
  style?: CSSProperties;
}

// Fine enveloppe autour de la classe .sk (globals.css) — le shimmer était
// jusqu'ici redéfini inline dans 16 pages différentes.
export function Skeleton({ className, height = 44, width = '100%', style }: SkeletonProps) {
  return <div className={cn('sk', className)} style={{ height, width, margin: '8px 16px', ...style }} />;
}
