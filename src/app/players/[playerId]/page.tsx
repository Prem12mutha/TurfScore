'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Trophy, Award, TrendingUp, Shield, Zap, Calendar } from 'lucide-react';
import { useMatchContext } from '@/lib/store/match-context';
import { Match, Delivery, BatterStats, BowlerStats } from '@/lib/cricket/types';
import { formatOvers } from '@/lib/cricket/innings';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function PlayerStatsPage({ params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = use(params);
  const router = useRouter();
  const { globalPlayers, matches } = useMatchContext();

  const player = globalPlayers.find((p) => p.id === playerId) || { id: playerId, name: 'Player' };

  // Calculate career statistics from all saved matches
  const playerMatches: {
    match: Match;
    batting?: BatterStats;
    bowling?: BowlerStats;
  }[] = [];

  let careerRuns = 0;
  let careerBalls = 0;
  let careerFours = 0;
  let careerSixes = 0;
  let careerDismissals = 0;
  let highestScore = 0;

  let careerWickets = 0;
  let careerBallsBowled = 0;
  let careerRunsConceded = 0;
  let bestBowlingWickets = 0;
  let bestBowlingRuns = 999;

  matches.forEach((m) => {
    let played = false;
    let bStat: BatterStats | undefined;
    let bwStat: BowlerStats | undefined;

    [m.firstInnings, m.secondInnings].forEach((inn) => {
      if (!inn) return;

      if (inn.batterStats && inn.batterStats[playerId]) {
        played = true;
        const bs = inn.batterStats[playerId];
        bStat = bs;
        careerRuns += bs.runs;
        careerBalls += bs.balls;
        careerFours += bs.fours;
        careerSixes += bs.sixes;
        if (bs.isOut) careerDismissals += 1;
        if (bs.runs > highestScore) highestScore = bs.runs;
      }

      if (inn.bowlerStats && inn.bowlerStats[playerId]) {
        played = true;
        const bws = inn.bowlerStats[playerId];
        bwStat = bws;
        careerWickets += bws.wickets;
        careerBallsBowled += bws.ballsBowled;
        careerRunsConceded += bws.runsConceded;

        if (bws.wickets > bestBowlingWickets || (bws.wickets === bestBowlingWickets && bws.runsConceded < bestBowlingRuns)) {
          bestBowlingWickets = bws.wickets;
          bestBowlingRuns = bws.runsConceded;
        }
      }
    });

    if (played) {
      playerMatches.push({ match: m, batting: bStat, bowling: bwStat });
    }
  });

  const matchesCount = playerMatches.length;
  const battingAverage = careerDismissals > 0 ? Number((careerRuns / careerDismissals).toFixed(2)) : careerRuns;
  const strikeRate = careerBalls > 0 ? Number(((careerRuns / careerBalls) * 100).toFixed(1)) : 0;

  const bowlerOversDecimal = careerBallsBowled / 6;
  const economy = bowlerOversDecimal > 0 ? Number((careerRunsConceded / bowlerOversDecimal).toFixed(2)) : 0;
  const bowlingAverage = careerWickets > 0 ? Number((careerRunsConceded / careerWickets).toFixed(2)) : 0;

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.push('/players')} className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Back to Players
        </button>
        <Badge variant="emerald">{matchesCount} {matchesCount === 1 ? 'Match' : 'Matches'}</Badge>
      </div>

      {/* Profile Banner */}
      <Card variant="highlight" className="p-5 space-y-3 relative overflow-hidden border-emerald-500/30">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-gray-950 font-black text-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            {player.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">{player.name}</h2>
            <p className="text-xs text-emerald-400 font-extrabold uppercase tracking-wider mt-0.5">Career Profile</p>
          </div>
        </div>
      </Card>

      {/* Batting Career Stats */}
      <Card variant="glass" className="p-4 space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
          <Zap className="w-4 h-4 fill-emerald-400" /> Batting Statistics
        </h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
            <span className="text-[10px] text-gray-400 uppercase font-bold block">Runs</span>
            <span className="text-xl font-black text-white mt-0.5 block">{careerRuns}</span>
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
            <span className="text-[10px] text-gray-400 uppercase font-bold block">Average</span>
            <span className="text-xl font-black text-emerald-400 mt-0.5 block">{battingAverage}</span>
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
            <span className="text-[10px] text-gray-400 uppercase font-bold block">Strike Rate</span>
            <span className="text-xl font-black text-emerald-400 mt-0.5 block">{strikeRate}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          <div className="bg-slate-900/60 p-2 rounded-xl border border-white/5">
            <span className="text-[10px] text-gray-400 font-bold block">High Score</span>
            <span className="text-sm font-bold text-white mt-0.5 block">{highestScore}</span>
          </div>
          <div className="bg-slate-900/60 p-2 rounded-xl border border-white/5">
            <span className="text-[10px] text-gray-400 font-bold block">Fours (4s)</span>
            <span className="text-sm font-bold text-white mt-0.5 block">{careerFours}</span>
          </div>
          <div className="bg-slate-900/60 p-2 rounded-xl border border-white/5">
            <span className="text-[10px] text-gray-400 font-bold block">Sixes (6s)</span>
            <span className="text-sm font-bold text-white mt-0.5 block">{careerSixes}</span>
          </div>
        </div>
      </Card>

      {/* Bowling Career Stats */}
      <Card variant="glass" className="p-4 space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-blue-400" /> Bowling Statistics
        </h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
            <span className="text-[10px] text-gray-400 uppercase font-bold block">Wickets</span>
            <span className="text-xl font-black text-white mt-0.5 block">{careerWickets}</span>
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
            <span className="text-[10px] text-gray-400 uppercase font-bold block">Economy</span>
            <span className="text-xl font-black text-blue-400 mt-0.5 block">{economy}</span>
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
            <span className="text-[10px] text-gray-400 uppercase font-bold block">Average</span>
            <span className="text-xl font-black text-blue-400 mt-0.5 block">{bowlingAverage}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center pt-1">
          <div className="bg-slate-900/60 p-2 rounded-xl border border-white/5">
            <span className="text-[10px] text-gray-400 font-bold block">Overs Bowled</span>
            <span className="text-sm font-bold text-white mt-0.5 block">{formatOvers(careerBallsBowled)}</span>
          </div>
          <div className="bg-slate-900/60 p-2 rounded-xl border border-white/5">
            <span className="text-[10px] text-gray-400 font-bold block">Best Bowling</span>
            <span className="text-sm font-bold text-white mt-0.5 block">
              {bestBowlingWickets > 0 ? `${bestBowlingWickets}/${bestBowlingRuns}` : '—'}
            </span>
          </div>
        </div>
      </Card>

      {/* Recent Matches Log */}
      <Card variant="glass" className="p-4 space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-emerald-400" /> Recent Matches
        </h3>
        {playerMatches.length === 0 ? (
          <p className="text-xs text-gray-500 py-2 text-center">No match history for this player yet.</p>
        ) : (
          <div className="space-y-2">
            {playerMatches.slice(0, 5).map(({ match: m, batting: b, bowling: bw }) => (
              <div key={m.id} className="bg-slate-950/60 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">{m.name}</p>
                  <p className="text-[10px] text-gray-400">{new Date(m.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right text-xs">
                  {b && <span className="font-extrabold text-emerald-400 block">{b.runs} <span className="text-[10px] text-gray-400 font-normal">({b.balls}b)</span></span>}
                  {bw && bw.ballsBowled > 0 && <span className="font-bold text-blue-400 text-[11px] block">{bw.wickets}/{bw.runsConceded}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
