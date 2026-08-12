'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  children: React.ReactNode;
  icon?: React.ElementType;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  children,
  icon: Icon,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-bold tracking-wide rounded-2xl transition-all disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none';

  const variants = {
    primary: 'bg-emerald-500 hover:bg-emerald-400 text-gray-950 shadow-lg shadow-emerald-500/25 border border-emerald-400/30',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-white border border-white/10 shadow-md',
    outline: 'bg-transparent border-2 border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/40',
    ghost: 'bg-transparent hover:bg-white/5 text-gray-300 hover:text-white',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/30',
  };

  const sizes = {
    sm: 'text-xs px-3.5 py-2 min-h-[38px] gap-1.5',
    md: 'text-sm px-4 py-3 min-h-[48px] gap-2',
    lg: 'text-base px-5 py-3.5 min-h-[52px] gap-2.5',
    xl: 'text-lg px-6 py-4 min-h-[58px] gap-3 font-extrabold',
  };

  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.96 }}
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled}
      {...(props as any)}
    >
      {Icon && <Icon className="w-5 h-5 shrink-0" />}
      <span>{children}</span>
    </motion.button>
  );
}
