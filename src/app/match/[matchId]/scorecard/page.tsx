'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trophy, Award, Calendar, MapPin, ChevronDown, ChevronUp, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMatchContext } from '@/lib/store/match-context';
import { formatOvers } from '@/lib/cricket/innings';
import { getDeliveriesByOver } from '@/lib/cricket/scoring-engine';
import { calculatePlayerOfTheMatch } from '@/lib/cricket/player-of-match';
import { Match, Innings, Delivery } from '@/lib/cricket/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function ScorecardPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = use(params);
  const router = useRouter();
  const { matches, loadActiveMatch } = useMatchContext();

  const [match, setMatch] = useState<Match | null>(null);
  const [activeTab, setActiveTab] = useState<'inn1' | 'inn2' | 'ballbyball'>('inn1');
  const [expandedOver, setExpandedOver] = useState<number | null>(null);

  useEffect(() => {
    const loaded = loadActiveMatch(matchId) || matches.find((m) => m.id === matchId);
    if (loaded) {
      setMatch(loaded);
    }
  }, [matchId, loadActiveMatch, matches]);

  if (!match) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <p className="text-gray-400 text-sm">Loading match scorecard...</p>
        <Link href="/history">
          <button className="text-xs text-emerald-400 font-bold underline">Back to History</button>
        </Link>
      </div>
    );
  }

  const potm = calculatePlayerOfTheMatch(match.firstInnings, match.secondInnings);
  const firstInnings = match.firstInnings;
  const secondInnings = match.secondInnings;

  const currentInningsForTab = activeTab === 'inn1' ? firstInnings : secondInnings;

  const formatBallBadge = (d: Delivery) => {
    if (d.wicket) return { label: 'W', color: 'bg-rose-500 text-white' };
    if (d.extraType === 'WIDE') return { label: `${1 + d.extraRuns}WD`, color: 'bg-amber-600 text-white' };
    if (d.extraType === 'NO_BALL') return { label: `${d.runsScored}NB`, color: 'bg-orange-500 text-white' };
    if (d.extraType === 'BYE') return { label: `${d.extraRuns}B`, color: 'bg-sky-600 text-white' };
    if (d.extraType === 'LEG_BYE') return { label: `${d.extraRuns}LB`, color: 'bg-sky-600 text-white' };
    if (d.runsScored === 4) return { label: '4', color: 'bg-emerald-500 text-white' };
    if (d.runsScored === 6) return { label: '6', color: 'bg-purple-500 text-white' };
    if (d.runsScored === 0) return { label: '0', color: 'bg-gray-700 text-gray-300' };
    return { label: String(d.runsScored), color: 'bg-slate-600 text-white' };
  };

  const renderInningsDetails = (inn: Innings) => {
    const batters = Object.values(inn.batterStats || {});
    const bowlers = Object.values(inn.bowlerStats || {}).filter((b) => b.ballsBowled > 0);

    return (
      <div className="space-y-4">
        {/* Batting Section */}
        <Card variant="glass" className="p-4 space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400">Batting Scorecard</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-white/10 text-[10px] uppercase">
                  <th className="pb-2 font-bold">Batter</th>
                  <th className="pb-2 text-right font-bold">R</th>
                  <th className="pb-2 text-right font-bold">B</th>
                  <th className="pb-2 text-right font-bold">4s</th>
                  <th className="pb-2 text-right font-bold">6s</th>
                  <th className="pb-2 text-right font-bold">SR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {batters.map((b) => (
                  <tr key={b.playerId} className="text-white">
                    <td className="py-2 pr-2">
                      <p className="font-bold text-sm">{b.playerName}</p>
                      {b.isOut ? (
                        <span className="text-[10px] text-rose-400 block font-normal">
                          b {b.bowlerName || 'bowler'}{b.dismissalType ? ` (${b.dismissalType.replace('_', ' ')})` : ''}
                        </span>
                      ) : b.isBatting ? (
                        <span className="text-[10px] text-emerald-400 block font-normal">not out</span>
                      ) : (
                        <span className="text-[10px] text-gray-500 block font-normal">did not bat</span>
                      )}
                    </td>
                    <td className="py-2 text-right font-black text-sm tabular-nums">{b.runs}</td>
                    <td className="py-2 text-right tabular-nums text-gray-400">{b.balls}</td>
                    <td className="py-2 text-right tabular-nums text-gray-400">{b.fours}</td>
                    <td className="py-2 text-right tabular-nums text-gray-400">{b.sixes}</td>
                    <td className="py-2 text-right tabular-nums font-semibold text-emerald-400">{b.strikeRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Bowling Section */}
        <Card variant="glass" className="p-4 space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-blue-400">Bowling Figures</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-white/10 text-[10px] uppercase">
                  <th className="pb-2 font-bold">Bowler</th>
                  <th className="pb-2 text-right font-bold">O</th>
                  <th className="pb-2 text-right font-bold">R</th>
                  <th className="pb-2 text-right font-bold">W</th>
                  <th className="pb-2 text-right font-bold">ECO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {bowlers.map((bw) => (
                  <tr key={bw.playerId} className="text-white">
                    <td className="py-2 pr-2 font-bold text-sm">{bw.playerName}</td>
                    <td className="py-2 text-right tabular-nums text-gray-400">{bw.overs}</td>
                    <td className="py-2 text-right tabular-nums text-gray-400">{bw.runsConceded}</td>
                    <td className="py-2 text-right tabular-nums font-black text-emerald-400 text-sm">{bw.wickets}</td>
                    <td className="py-2 text-right tabular-nums font-semibold text-blue-400">{bw.economy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Extras Summary */}
        <Card variant="glass" className="p-4 flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-gray-300 uppercase tracking-wider block text-[10px]">Total Extras</span>
            <p className="text-sm font-black text-white mt-0.5">{inn.extras.total} runs</p>
          </div>
          <div className="flex gap-2 text-[11px] text-gray-400">
            <span>wd: <strong className="text-white">{inn.extras.wides}</strong></span>
            <span>nb: <strong className="text-white">{inn.extras.noBalls}</strong></span>
            <span>b: <strong className="text-white">{inn.extras.byes}</strong></span>
            <span>lb: <strong className="text-white">{inn.extras.legByes}</strong></span>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.push('/history')} className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Back to History
        </button>
        <Badge variant="emerald">{match.totalOvers} Overs</Badge>
      </div>

      {/* Match Result Card */}
      <Card variant="highlight" className="p-5 space-y-4 relative overflow-hidden border-emerald-500/30">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h2 className="text-lg font-black text-white">{match.name}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{new Date(match.createdAt).toLocaleDateString()}</p>
          </div>
          <div className="px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-extrabold flex items-center gap-1.5">
            <Award className="w-4 h-4 text-emerald-400" />
            {match.resultString || 'Match Summary'}
          </div>
        </div>

        {/* Scores Grid */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="bg-slate-900/80 p-3 rounded-xl border border-white/5">
            <p className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider">{match.firstInnings?.battingTeamName || match.teamA.name}</p>
            <p className="text-2xl font-black text-white mt-1 tabular-nums">
              {match.firstInnings?.totalRuns || 0}
              <span className="text-sm text-gray-400 font-bold">/{match.firstInnings?.totalWickets || 0}</span>
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">({formatOvers(match.firstInnings?.validBallsBowled || 0)} ov)</p>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-xl border border-white/5">
            <p className="text-xs font-extrabold text-blue-400 uppercase tracking-wider">{match.secondInnings?.battingTeamName || match.teamB.name}</p>
            <p className="text-2xl font-black text-white mt-1 tabular-nums">
              {match.secondInnings?.totalRuns || 0}
              <span className="text-sm text-gray-400 font-bold">/{match.secondInnings?.totalWickets || 0}</span>
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {match.secondInnings ? `(${formatOvers(match.secondInnings.validBallsBowled)} ov)` : 'Yet to bat'}
            </p>
          </div>
        </div>

        {/* Player of the Match Banner */}
        {potm && (
          <div className="bg-gradient-to-r from-amber-950/60 via-slate-900/80 to-amber-950/60 border border-amber-500/40 rounded-xl p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500 text-gray-950 font-black flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider block">PLAYER OF THE MATCH</span>
              <p className="text-sm font-black text-white mt-0.5">{potm.playerName}</p>
              <p className="text-xs text-gray-300 font-medium">{potm.summary}</p>
            </div>
          </div>
        )}
      </Card>

      {/* Innings Tabs */}
      <div className="grid grid-cols-3 gap-2 bg-slate-900/80 p-1 rounded-xl border border-white/5 text-xs font-bold">
        <button
          onClick={() => setActiveTab('inn1')}
          className={`py-2 rounded-lg transition-all ${activeTab === 'inn1' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
        >
          1st Innings
        </button>
        <button
          onClick={() => setActiveTab('inn2')}
          disabled={!secondInnings}
          className={`py-2 rounded-lg transition-all ${activeTab === 'inn2' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:text-white disabled:opacity-30'}`}
        >
          2nd Innings
        </button>
        <button
          onClick={() => setActiveTab('ballbyball')}
          className={`py-2 rounded-lg transition-all ${activeTab === 'ballbyball' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
        >
          Ball by Ball
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'inn1' && firstInnings && renderInningsDetails(firstInnings)}
      {activeTab === 'inn2' && secondInnings && renderInningsDetails(secondInnings)}

      {/* Ball-by-Ball View */}
      {activeTab === 'ballbyball' && (
        <Card variant="glass" className="p-4 space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400">Complete Delivery Log</h3>
          {firstInnings && (
            <div className="space-y-3">
              <p className="text-xs font-extrabold text-white border-b border-white/10 pb-1">1st Innings — {firstInnings.battingTeamName}</p>
              {Array.from(getDeliveriesByOver(firstInnings).entries()).map(([overNum, deliveries]) => (
                <div key={overNum} className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5 space-y-2">
                  <p className="text-[11px] font-bold text-gray-400">Over {overNum + 1}</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {deliveries.map((d) => {
                      const { label, color } = formatBallBadge(d);
                      return (
                        <span key={d.id} className={`w-8 h-8 rounded-lg ${color} text-xs font-bold flex items-center justify-center`}>
                          {label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {secondInnings && (
            <div className="space-y-3 pt-3">
              <p className="text-xs font-extrabold text-white border-b border-white/10 pb-1">2nd Innings — {secondInnings.battingTeamName}</p>
              {Array.from(getDeliveriesByOver(secondInnings).entries()).map(([overNum, deliveries]) => (
                <div key={overNum} className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5 space-y-2">
                  <p className="text-[11px] font-bold text-gray-400">Over {overNum + 1}</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {deliveries.map((d) => {
                      const { label, color } = formatBallBadge(d);
                      return (
                        <span key={d.id} className={`w-8 h-8 rounded-lg ${color} text-xs font-bold flex items-center justify-center`}>
                          {label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
