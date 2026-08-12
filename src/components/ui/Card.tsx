'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'highlight' | 'outlined';
  children: React.ReactNode;
}

export function Card({
  variant = 'glass',
  className,
  children,
  ...props
}: CardProps) {
  const variants = {
    default: 'bg-[#111827] border border-white/10 shadow-lg',
    glass: 'glass-card backdrop-blur-md',
    highlight: 'bg-gradient-to-br from-emerald-950/40 via-[#111827] to-[#0d1424] border border-emerald-500/30 shadow-lg shadow-emerald-950/20',
    outlined: 'bg-[#0e1524] border border-white/15',
  };

  return (
    <div
      className={cn(
        'rounded-2xl p-4 sm:p-5 transition-all',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
