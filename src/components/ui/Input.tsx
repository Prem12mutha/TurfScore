'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ElementType;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon: Icon, className, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {Icon && (
            <div className="absolute left-3.5 text-gray-400 pointer-events-none">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full bg-[#161f30] border border-white/10 text-white placeholder-gray-500 rounded-xl py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all min-h-[48px]',
              Icon ? 'pl-11 pr-4' : 'px-4',
              error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500',
              className
            )}
            {...props}
          />
        </div>
        {hint && !error && <p className="text-[11px] text-gray-400">{hint}</p>}
        {error && <p className="text-[11px] text-rose-400 font-medium">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
