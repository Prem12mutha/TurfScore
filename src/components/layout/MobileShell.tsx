'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Trophy, PlusCircle, History, Users, Home } from 'lucide-react';
import { motion } from 'framer-motion';

interface MobileShellProps {
  children: React.ReactNode;
}

export function MobileShell({ children }: MobileShellProps) {
  const pathname = usePathname();

  // Hide shell chrome on the scoring page — need max real estate
  const isScoring = pathname.includes('/match/') && pathname.includes('/scoring');

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/create', label: 'New Match', icon: PlusCircle, highlight: true },
    { href: '/history', label: 'History', icon: History },
    { href: '/players', label: 'Players', icon: Users },
  ];

  if (isScoring) {
    return (
      <div className="min-h-screen bg-[#060911] text-gray-100 flex justify-center items-stretch antialiased selection:bg-emerald-500 selection:text-white">
        <div className="w-full max-w-md bg-[#090d16] min-h-screen flex flex-col relative shadow-2xl border-x border-white/5">
          {/* Minimal Scoring Header */}
          <header className="sticky top-0 z-30 px-4 py-2.5 bg-[#090d16]/95 backdrop-blur-md border-b border-white/5 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-900/30">
                <Trophy className="w-4 h-4 text-gray-950 font-bold" />
              </div>
              <span className="font-extrabold text-sm tracking-tight text-white">
                Turf<span className="text-emerald-400">Score</span>
              </span>
            </Link>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-950/60 border border-red-500/30 text-red-400 text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              Live
            </div>
          </header>

          <main className="flex-1 px-4 py-3 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060911] text-gray-100 flex justify-center items-stretch antialiased selection:bg-emerald-500 selection:text-white">
      {/* Desktop Container Wrapper */}
      <div className="w-full max-w-md bg-[#090d16] min-h-screen flex flex-col relative shadow-2xl border-x border-white/5 pb-20">
        
        {/* Header Bar */}
        <header className="sticky top-0 z-30 px-4 py-3 bg.glass-panel bg-[#090d16]/90 backdrop-blur-md border-b border-white/5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-900/30 group-hover:scale-105 transition-transform">
              <Trophy className="w-5 h-5 text-gray-950 font-bold" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1">
                Turf<span className="text-emerald-400">Score</span>
              </h1>
              <p className="text-[10px] text-gray-400 font-medium tracking-wide uppercase">Turf Cricket Scorer</p>
            </div>
          </Link>

          {/* Quick status pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Ready
          </div>
        </header>

        {/* Main Scrollable Content */}
        <main className="flex-1 px-4 py-5 overflow-y-auto">
          {children}
        </main>

        {/* Mobile Sticky Bottom Navigation */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 bg-[#0c121e]/95 backdrop-blur-xl border-t border-white/10 px-2 py-2">
          <div className="flex items-center justify-around">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              if (item.highlight) {
                return (
                  <Link href={item.href} key={item.href} className="relative group">
                    <motion.div
                      whileTap={{ scale: 0.92 }}
                      className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-gray-950 font-bold flex items-center justify-center shadow-lg shadow-emerald-500/30 -mt-5 border-2 border-[#090d16]"
                    >
                      <Icon className="w-6 h-6 stroke-[2.5]" />
                    </motion.div>
                    <span className="block text-[10px] font-semibold text-center text-emerald-400 mt-1">
                      {item.label}
                    </span>
                  </Link>
                );
              }

              return (
                <Link
                  href={item.href}
                  key={item.href}
                  className={`flex flex-col items-center py-1 px-3 rounded-xl transition-colors ${
                    isActive ? 'text-emerald-400 font-semibold' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                  <span className="text-[11px] mt-0.5">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="w-1 h-1 rounded-full bg-emerald-400 mt-0.5"
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

      </div>
    </div>
  );
}
