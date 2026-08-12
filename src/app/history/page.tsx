'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { History, Trophy, PlusCircle, Calendar, MapPin, ChevronRight, ChevronDown, Award, Trash2, PlayCircle } from 'lucide-react';
import { useMatchContext } from '@/lib/store/match-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Match, Innings } from '@/lib/cricket/types';
import { formatOvers } from '@/lib/cricket/innings';

export default function HistoryPage() {
  const { matches, deleteMatch, setActiveMatchId } = useMatchContext();
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(matches[0]?.id || null);

  const renderInningsScorecard = (innings: Innings, title: string) => {
    const batters = Object.values(innings.batterStats || {});
    const bowlers = Object.values(innings.bowlerStats || {}).filter((b) => b.ballsBowled > 0);

    return (
      <div className="space-y-3 bg-slate-950/60 p-3 rounded-xl border border-white/5 mt-2">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div>
            <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">{title}: {innings.battingTeamName}</span>
            <p className="text-[10px] text-gray-400">{formatOvers(innings.validBallsBowled)} Overs</p>
          </div>
          <div className="text-right">
            <span className="text-lg font-black text-white">{innings.totalRuns}</span>
            <span className="text-sm font-bold text-gray-400">/{innings.totalWickets}</span>
          </div>
        </div>

        {/* Batting Table */}
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase">Batting</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="text-gray-400 border-b border-white/5 text-[10px]">
                  <th className="pb-1 font-semibold">Batter</th>
                  <th className="pb-1 text-right font-semibold">R</th>
                  <th className="pb-1 text-right font-semibold">B</th>
                  <th className="pb-1 text-right font-semibold">4s</th>
                  <th className="pb-1 text-right font-semibold">6s</th>
                  <th className="pb-1 text-right font-semibold">SR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {batters.map((b) => (
                  <tr key={b.playerId} className={b.isBatting || b.isOut ? 'text-white' : 'text-gray-500'}>
                    <td className="py-1 pr-2 font-medium">
                      {b.playerName}
                      {b.isOut && (
                        <span className="block text-[9px] text-rose-400 font-normal">
                          b {b.bowlerName || 'bowler'}{b.dismissalType ? ` (${b.dismissalType})` : ''}
                        </span>
                      )}
                      {!b.isOut && b.isBatting && (
                        <span className="block text-[9px] text-emerald-400 font-normal">not out</span>
                      )}
                    </td>
                    <td className="py-1 text-right font-bold tabular-nums">{b.runs}</td>
                    <td className="py-1 text-right tabular-nums text-gray-400">{b.balls}</td>
                    <td className="py-1 text-right tabular-nums text-gray-400">{b.fours}</td>
                    <td className="py-1 text-right tabular-nums text-gray-400">{b.sixes}</td>
                    <td className="py-1 text-right tabular-nums text-emerald-400 font-semibold">{b.strikeRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bowling Table */}
        {bowlers.length > 0 && (
          <div className="space-y-1 pt-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase">Bowling</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="text-gray-400 border-b border-white/5 text-[10px]">
                    <th className="pb-1 font-semibold">Bowler</th>
                    <th className="pb-1 text-right font-semibold">O</th>
                    <th className="pb-1 text-right font-semibold">R</th>
                    <th className="pb-1 text-right font-semibold">W</th>
                    <th className="pb-1 text-right font-semibold">ECO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {bowlers.map((bw) => (
                    <tr key={bw.playerId} className="text-white">
                      <td className="py-1 pr-2 font-medium">{bw.playerName}</td>
                      <td className="py-1 text-right tabular-nums text-gray-400">{bw.overs}</td>
                      <td className="py-1 text-right tabular-nums text-gray-400">{bw.runsConceded}</td>
                      <td className="py-1 text-right tabular-nums font-bold text-emerald-400">{bw.wickets}</td>
                      <td className="py-1 text-right tabular-nums text-blue-400 font-semibold">{bw.economy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Extras Summary */}
        <div className="text-[10px] text-gray-400 flex items-center justify-between pt-1 border-t border-white/5">
          <span>Extras: <strong className="text-white">{innings.extras.total}</strong> (wd {innings.extras.wides}, nb {innings.extras.noBalls}, b {innings.extras.byes}, lb {innings.extras.legByes})</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-blue-400" /> Match History
          </h2>
          <p className="text-xs text-gray-400">Past games and scorecard summaries</p>
        </div>
        <Badge variant="blue">{matches.length} Total</Badge>
      </div>

      {matches.length === 0 ? (
        <Card variant="glass" className="py-10 px-6 text-center space-y-4 border-dashed border-white/15">
          <div className="w-16 h-16 rounded-full bg-blue-950/50 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto">
            <Trophy className="w-8 h-8 opacity-80" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-white">No matches found</h4>
            <p className="text-xs text-gray-400 max-w-xs mx-auto">
              Start your first turf match to see detailed stats and scorecards here.
            </p>
          </div>
          <Link href="/create">
            <Button variant="primary" size="md" icon={PlusCircle}>
              Create New Match
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => {
            const isSelected = selectedMatchId === match.id;
            const isLive = match.status === 'IN_PROGRESS' || match.status === 'INNINGS_BREAK';

            return (
              <Card
                key={match.id}
                variant={isSelected ? 'highlight' : 'glass'}
                className="p-4 space-y-3 transition-all"
              >
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setSelectedMatchId(isSelected ? null : match.id)}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-white">{match.name}</h3>
                      {isLive && (
                        <span className="px-2 py-0.5 rounded-full bg-red-950/80 border border-red-500/40 text-red-400 text-[10px] font-bold animate-pulse">
                          LIVE
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-emerald-400" />
                        {new Date(match.createdAt).toLocaleDateString()}
                      </span>
                      {match.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-blue-400" />
                          {match.location}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="emerald">{match.totalOvers} Overs</Badge>
                    {isSelected ? <ChevronDown className="w-4 h-4 text-emerald-400" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                  </div>
                </div>

                {/* Teams & Squad Count */}
                <div className="grid grid-cols-2 gap-2 text-center py-1">
                  <div className="bg-slate-900/60 p-2 rounded-xl border border-white/5">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                      {match.teamA.name}
                    </span>
                    <span className="text-xs text-gray-300 block">
                      {match.firstInnings?.battingTeamId === match.teamA.id && match.firstInnings
                        ? `${match.firstInnings.totalRuns}/${match.firstInnings.totalWickets}`
                        : match.secondInnings?.battingTeamId === match.teamA.id && match.secondInnings
                        ? `${match.secondInnings.totalRuns}/${match.secondInnings.totalWickets}`
                        : `${match.teamA.players.length} Players`}
                    </span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded-xl border border-white/5">
                    <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block">
                      {match.teamB.name}
                    </span>
                    <span className="text-xs text-gray-300 block">
                      {match.firstInnings?.battingTeamId === match.teamB.id && match.firstInnings
                        ? `${match.firstInnings.totalRuns}/${match.firstInnings.totalWickets}`
                        : match.secondInnings?.battingTeamId === match.teamB.id && match.secondInnings
                        ? `${match.secondInnings.totalRuns}/${match.secondInnings.totalWickets}`
                        : `${match.teamB.players.length} Players`}
                    </span>
                  </div>
                </div>

                {/* Outcome Banner & Actions */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-semibold">
                    <Award className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{match.resultString || (isLive ? 'Match in progress' : 'Completed')}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {isLive && (
                      <Link href={`/match/${match.id}/scoring`}>
                        <button className="px-2.5 py-1 rounded-lg bg-emerald-500 text-gray-950 text-xs font-bold flex items-center gap-1">
                          <PlayCircle className="w-3.5 h-3.5" /> Score
                        </button>
                      </Link>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMatch(match.id);
                        if (selectedMatchId === match.id) {
                          setSelectedMatchId(null);
                        }
                      }}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-950/40"
                      title="Delete match"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Match Scorecard Details */}
                {isSelected && (
                  <div className="pt-3 border-t border-white/10 space-y-3">
                    {match.firstInnings && renderInningsScorecard(match.firstInnings, '1st Innings')}
                    {match.secondInnings && renderInningsScorecard(match.secondInnings, '2nd Innings')}

                    {/* Squad Roster if no innings played yet */}
                    {!match.firstInnings && (
                      <div className="space-y-2 text-xs">
                        <h4 className="font-bold text-gray-300 uppercase tracking-wider">Lineup Summary</h4>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="font-bold text-emerald-400 block mb-1">{match.teamA.name}:</span>
                            <ul className="space-y-0.5 text-gray-300">
                              {match.teamA.players.map((p) => (
                                <li key={p.id}>• {p.name}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <span className="font-bold text-blue-400 block mb-1">{match.teamB.name}:</span>
                            <ul className="space-y-0.5 text-gray-300">
                              {match.teamB.players.map((p) => (
                                <li key={p.id}>• {p.name}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
