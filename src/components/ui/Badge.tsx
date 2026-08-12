'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  variant?: 'emerald' | 'blue' | 'amber' | 'rose' | 'slate';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'slate', children, className }: BadgeProps) {
  const variants = {
    emerald: 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30',
    blue: 'bg-blue-950/80 text-blue-400 border-blue-500/30',
    amber: 'bg-amber-950/80 text-amber-400 border-amber-500/30',
    rose: 'bg-rose-950/80 text-rose-400 border-rose-500/30',
    slate: 'bg-slate-800 text-gray-300 border-white/10',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border tracking-wide uppercase',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
