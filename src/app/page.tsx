'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, History, Users, Zap, Shield, ChevronRight, Award, Trophy, PlayCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMatchContext } from '@/lib/store/match-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function HomePage() {
  const router = useRouter();
  const { matches, activeMatch, resetDraft, setActiveMatchId } = useMatchContext();

  const handleStartNewMatch = () => {
    resetDraft();
    router.push('/create');
  };

  // Find any in-progress match
  const liveMatch = matches.find((m) => m.status === 'IN_PROGRESS' || m.status === 'INNINGS_BREAK');

  return (
    <div className="space-y-6">
      {/* Active Match Banner */}
      {liveMatch && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link href={`/match/${liveMatch.id}/scoring`}>
            <Card variant="highlight" className="p-4 border-red-500/40 bg-red-950/20 hover:bg-red-950/30 cursor-pointer transition-all group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-500/30 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
                    <PlayCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Live Match</span>
                      <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                    </div>
                    <p className="text-sm font-extrabold text-white mt-0.5">{liveMatch.name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {liveMatch.teamA.shortName} vs {liveMatch.teamB.shortName}
                      {' — '}
                      {liveMatch.currentInningsNumber === 1 ? '1st' : '2nd'} Innings
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-red-400 group-hover:text-white transition-colors">
                  <span className="text-xs font-bold">Continue</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Card>
          </Link>
        </motion.div>
      )}

      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950/60 via-[#0d1526] to-[#090d16] p-6 border border-emerald-500/20 shadow-xl">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 fill-emerald-400" /> Fast 1-Tap Scoring
          </div>

          <h2 className="text-3xl font-black text-white tracking-tight leading-tight">
            Turf<span className="text-emerald-400">Score</span>
          </h2>
          
          <p className="text-sm font-medium text-emerald-200/80 italic">
            &ldquo;Your game. Your score.&rdquo;
          </p>

          <p className="text-xs text-gray-400 leading-relaxed pt-1">
            Built for fast turf and box cricket matches between friends. Record deliveries instantly on your phone.
          </p>

          {/* Primary Action Button */}
          <div className="pt-3">
            <Button
              variant="primary"
              size="xl"
              fullWidth
              icon={PlusCircle}
              onClick={handleStartNewMatch}
              className="shadow-emerald-500/30"
            >
              New Match
            </Button>
          </div>
        </div>
      </section>

      {/* Secondary Actions Grid */}
      <section className="grid grid-cols-2 gap-3">
        <Link href="/history">
          <Card variant="glass" className="p-4 hover:border-emerald-500/40 transition-all group cursor-pointer h-full flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-blue-950/70 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                <History className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors" />
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">Match History</h3>
              <p className="text-xs text-gray-400 mt-0.5">{matches.length} saved {matches.length === 1 ? 'game' : 'games'}</p>
            </div>
          </Card>
        </Link>

        <Link href="/players">
          <Card variant="glass" className="p-4 hover:border-emerald-500/40 transition-all group cursor-pointer h-full flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-purple-950/70 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-purple-400 transition-colors" />
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">Players</h3>
              <p className="text-xs text-gray-400 mt-0.5">Roster directory</p>
            </div>
          </Card>
        </Link>
      </section>

      {/* Recent Matches Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-emerald-400" /> Recent Matches
          </h3>
          {matches.length > 0 && (
            <Link href="/history" className="text-xs font-semibold text-emerald-400 hover:underline">
              View All
            </Link>
          )}
        </div>

        {matches.length === 0 ? (
          /* Empty State */
          <Card variant="glass" className="py-10 px-6 text-center space-y-4 border-dashed border-white/15">
            <div className="w-16 h-16 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <Trophy className="w-8 h-8 opacity-80" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-white">No matches played yet</h4>
              <p className="text-xs text-gray-400 max-w-xs mx-auto">
                Ready for some cricket? Tap below to setup teams, overs, and toss in seconds.
              </p>
            </div>
            <Button variant="primary" size="md" icon={PlusCircle} onClick={handleStartNewMatch}>
              Create First Match
            </Button>
          </Card>
        ) : (
          /* Match Cards List */
          <div className="space-y-3">
            {matches.slice(0, 3).map((match) => (
              <motion.div key={match.id} whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
                <Card variant="highlight" className="p-4 relative group">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="text-xs font-extrabold text-white truncate max-w-[200px]">
                      {match.name}
                    </span>
                    <Badge variant={match.status === 'COMPLETED' ? 'emerald' : 'amber'}>
                      {match.totalOvers} Overs
                    </Badge>
                  </div>

                  <div className="py-3 grid grid-cols-2 gap-2 text-center">
                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                      <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                        {match.teamA.shortName || match.teamA.name}
                      </span>
                      <span className="text-sm font-black text-white mt-0.5 block">
                        {match.teamA.players.length} Players
                      </span>
                    </div>

                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                      <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block">
                        {match.teamB.shortName || match.teamB.name}
                      </span>
                      <span className="text-sm font-black text-white mt-0.5 block">
                        {match.teamB.players.length} Players
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <p className="text-xs font-semibold text-emerald-300 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{match.resultString || 'Setup Completed'}</span>
                    </p>
                    
                    <button
                      onClick={() => {
                        setActiveMatchId(match.id);
                        router.push('/history');
                      }}
                      className="text-xs text-gray-400 hover:text-white flex items-center gap-1 font-bold"
                    >
                      Summary <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
