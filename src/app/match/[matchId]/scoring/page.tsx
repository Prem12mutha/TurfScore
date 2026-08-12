'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Undo2, ChevronDown, ChevronUp, X, Trophy, Target, TrendingUp,
  ArrowRight, AlertCircle, CheckCircle2, Users,
} from 'lucide-react';
import { useMatchContext } from '@/lib/store/match-context';
import { recordDelivery, getCurrentOverDeliveries, getDeliveriesByOver } from '@/lib/cricket/scoring-engine';
import { calculateRunRate, calculateRequiredRunRate, checkInningsCompletion, formatOvers } from '@/lib/cricket/innings';
import { calculateMatchResult } from '@/lib/cricket/match-result';
import { queueAndSyncDelivery } from '@/lib/supabase/sync';
import { Innings, Match, Delivery, WicketType, ExtraType, Player } from '@/lib/cricket/types';

// === Types for UI state ===
type ModalType = 'none' | 'wicket' | 'wide' | 'noball' | 'bye' | 'legbye' | 'over-complete' | 'innings-complete' | 'second-innings-setup' | 'match-result';

export default function ScoringPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = use(params);
  const router = useRouter();
  const {
    activeMatch, loadActiveMatch, updateActiveMatch,
    pushInningsSnapshot, popInningsSnapshot, inningsHistory,
    startSecondInnings, completeMatch,
  } = useMatchContext();

  const [match, setMatch] = useState<Match | null>(null);
  const [modalType, setModalType] = useState<ModalType>('none');
  const [showHistory, setShowHistory] = useState(false);

  // Wicket modal state
  const [wicketType, setWicketType] = useState<WicketType>('BOWLED');
  const [dismissedBatterId, setDismissedBatterId] = useState<string>('');
  const [newBatterId, setNewBatterId] = useState<string>('');
  const [wicketRuns, setWicketRuns] = useState(0);

  // No-ball modal state
  const [noBallBatRuns, setNoBallBatRuns] = useState(0);

  // Wide/Bye/LB modal state
  const [extraRunsCount, setExtraRunsCount] = useState(1);

  // Over complete: next bowler
  const [nextBowlerId, setNextBowlerId] = useState<string>('');

  // Second innings setup
  const [si_strikerId, setSiStrikerId] = useState('');
  const [si_nonStrikerId, setSiNonStrikerId] = useState('');
  const [si_bowlerId, setSiBowlerId] = useState('');

  // Load match on mount
  useEffect(() => {
    if (activeMatch && activeMatch.id === matchId) {
      setMatch(activeMatch);
    } else {
      const loaded = loadActiveMatch(matchId);
      if (loaded) {
        setMatch(loaded);
      }
    }
  }, [matchId, activeMatch, loadActiveMatch]);

  // Sync with context
  useEffect(() => {
    if (activeMatch && activeMatch.id === matchId) {
      setMatch(activeMatch);
    }
  }, [activeMatch, matchId]);

  // ---- Helpers ----
  const getCurrentInnings = useCallback((): Innings | null => {
    if (!match) return null;
    return match.currentInningsNumber === 1 ? match.firstInnings || null : match.secondInnings || null;
  }, [match]);

  const getBattingTeam = useCallback(() => {
    if (!match) return null;
    const innings = getCurrentInnings();
    if (!innings) return null;
    return innings.battingTeamId === match.teamA.id ? match.teamA : match.teamB;
  }, [match, getCurrentInnings]);

  const getBowlingTeam = useCallback(() => {
    if (!match) return null;
    const innings = getCurrentInnings();
    if (!innings) return null;
    return innings.bowlingTeamId === match.teamA.id ? match.teamA : match.teamB;
  }, [match, getCurrentInnings]);

  // ---- Core scoring function ----
  const scoreDelivery = useCallback((params: {
    runs: number;
    extraType?: ExtraType;
    extraRuns?: number;
    wicket?: { dismissedBatterId: string; wicketType: WicketType; fielderId?: string; fielderName?: string; };
    newBatterId?: string;
  }) => {
    if (!match) return;
    const innings = getCurrentInnings();
    if (!innings || innings.isCompleted) return;

    // Push current state for undo
    pushInningsSnapshot(innings);

    const updatedInnings = recordDelivery({
      innings,
      runsScored: params.runs,
      extraType: params.extraType,
      extraRuns: params.extraRuns,
      wicket: params.wicket,
      newBatterId: params.newBatterId,
    });

    // Async sync latest delivery to Supabase without blocking UI
    const lastDelivery = updatedInnings.deliveries[updatedInnings.deliveries.length - 1];
    if (lastDelivery) {
      queueAndSyncDelivery(lastDelivery, updatedInnings.deliveries.length - 1).catch(() => {});
    }

    // Check innings completion
    const battingTeam = getBattingTeam();
    const squadSize = battingTeam?.players.length || 6;
    const isComplete = checkInningsCompletion(updatedInnings, match.totalOvers, squadSize);

    let newMatch: Match;
    if (isComplete) {
      const completedInnings = { ...updatedInnings, isCompleted: true };
      if (match.currentInningsNumber === 1) {
        newMatch = { ...match, firstInnings: completedInnings, status: 'INNINGS_BREAK', updatedAt: Date.now() };
      } else {
        newMatch = { ...match, secondInnings: completedInnings, updatedAt: Date.now() };
        // Calculate result
        const result = calculateMatchResult(newMatch);
        newMatch.status = 'COMPLETED';
        newMatch.winnerTeamId = result.winnerTeamId;
        newMatch.resultString = result.resultString;
      }
    } else {
      if (match.currentInningsNumber === 1) {
        newMatch = { ...match, firstInnings: updatedInnings, updatedAt: Date.now() };
      } else {
        newMatch = { ...match, secondInnings: updatedInnings, updatedAt: Date.now() };
      }
    }

    setMatch(newMatch);
    updateActiveMatch(newMatch);

    // Check if over is complete (and innings is not done)
    if (!isComplete) {
      const newValidBalls = updatedInnings.validBallsBowled;
      if (newValidBalls > 0 && newValidBalls % 6 === 0) {
        setModalType('over-complete');
        return;
      }
    } else {
      if (match.currentInningsNumber === 1) {
        setModalType('innings-complete');
      } else {
        setModalType('match-result');
      }
    }
  }, [match, getCurrentInnings, getBattingTeam, pushInningsSnapshot, updateActiveMatch]);

  // ---- Undo ----
  const handleUndo = useCallback(() => {
    if (!match || inningsHistory.length === 0) return;
    const prevInnings = popInningsSnapshot();
    if (!prevInnings) return;

    let newMatch: Match;
    if (match.currentInningsNumber === 1) {
      newMatch = { ...match, firstInnings: prevInnings, status: 'IN_PROGRESS', updatedAt: Date.now() };
    } else {
      newMatch = { ...match, secondInnings: prevInnings, status: 'IN_PROGRESS', updatedAt: Date.now() };
    }

    // Reset completion state if needed
    if (newMatch.status === 'COMPLETED' || newMatch.status === 'INNINGS_BREAK') {
      newMatch.status = 'IN_PROGRESS';
      newMatch.winnerTeamId = undefined;
      newMatch.resultString = undefined;
    }

    setMatch(newMatch);
    updateActiveMatch(newMatch);
    setModalType('none');
  }, [match, inningsHistory, popInningsSnapshot, updateActiveMatch]);

  // ---- Confirm over complete ----
  const handleConfirmNextBowler = useCallback(() => {
    if (!match || !nextBowlerId) return;
    const innings = getCurrentInnings();
    if (!innings) return;

    const updatedInnings = { ...innings, currentBowlerId: nextBowlerId };

    let newMatch: Match;
    if (match.currentInningsNumber === 1) {
      newMatch = { ...match, firstInnings: updatedInnings, updatedAt: Date.now() };
    } else {
      newMatch = { ...match, secondInnings: updatedInnings, updatedAt: Date.now() };
    }

    setMatch(newMatch);
    updateActiveMatch(newMatch);
    setModalType('none');
    setNextBowlerId('');
  }, [match, nextBowlerId, getCurrentInnings, updateActiveMatch]);

  // ---- Start second innings ----
  const handleStartSecondInnings = useCallback(() => {
    if (!si_strikerId || !si_nonStrikerId || !si_bowlerId) return;
    const newMatch = startSecondInnings(si_strikerId, si_nonStrikerId, si_bowlerId);
    setMatch(newMatch);
    setModalType('none');
  }, [si_strikerId, si_nonStrikerId, si_bowlerId, startSecondInnings]);

  // ---- Render gates ----
  if (!match) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400 text-sm">Loading match...</div>
      </div>
    );
  }

  const innings = getCurrentInnings();
  if (!innings) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400 text-sm">No innings data available.</div>
      </div>
    );
  }

  // ---- Derived data ----
  const battingTeam = getBattingTeam()!;
  const bowlingTeam = getBowlingTeam()!;
  const striker = innings.currentStrikerId ? innings.batterStats[innings.currentStrikerId] : null;
  const nonStriker = innings.currentNonStrikerId ? innings.batterStats[innings.currentNonStrikerId] : null;
  const currentBowler = innings.currentBowlerId ? innings.bowlerStats[innings.currentBowlerId] : null;
  const crr = calculateRunRate(innings.totalRuns, innings.validBallsBowled);
  const rrr = innings.targetRuns ? calculateRequiredRunRate(innings.targetRuns, innings.totalRuns, match.totalOvers, innings.validBallsBowled) : null;
  const currentOverBalls = getCurrentOverDeliveries(innings);
  const allOverGroups = getDeliveriesByOver(innings);
  const isSecondInnings = match.currentInningsNumber === 2;
  const runsNeeded = innings.targetRuns ? innings.targetRuns - innings.totalRuns : null;
  const ballsRemaining = match.totalOvers * 6 - innings.validBallsBowled;

  // Eligible batsmen for wicket modal
  const eligibleBatsmen = battingTeam.players.filter((p) => {
    const stats = innings.batterStats[p.id];
    if (!stats) return true;
    return !stats.isOut && !stats.isBatting;
  });

  // Bowlers for over-complete modal
  const bowlingPlayers = bowlingTeam.players;

  // Second innings teams
  const secondBattingTeam = match.battingFirstTeamId === match.teamA.id ? match.teamB : match.teamA;
  const secondBowlingTeam = match.battingFirstTeamId === match.teamA.id ? match.teamA : match.teamB;

  // Format delivery for display
  const formatBall = (d: Delivery): { label: string; color: string } => {
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

  return (
    <div className="space-y-3 -mx-4 -my-5 px-3 py-3 min-h-screen bg-[#060911]">
      {/* ===== SCOREBOARD HEADER ===== */}
      <div className="glass-card rounded-2xl p-4 space-y-3">
        {/* Team & Score */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">{innings.battingTeamName}</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-4xl font-black text-white tabular-nums">{innings.totalRuns}</span>
              <span className="text-xl font-bold text-gray-400">/ {innings.totalWickets}</span>
            </div>
          </div>
          <div className="text-right space-y-1">
            <div className="text-2xl font-black text-white tabular-nums">{formatOvers(innings.validBallsBowled)}</div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">of {match.totalOvers} Overs</p>
          </div>
        </div>

        {/* Run Rates & Target */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-white/5 text-xs">
            <span className="text-gray-400">CRR </span>
            <span className="font-bold text-white tabular-nums">{crr}</span>
          </div>
          {rrr !== null && (
            <div className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/20 text-xs">
              <span className="text-emerald-400">RRR </span>
              <span className="font-bold text-emerald-300 tabular-nums">{rrr}</span>
            </div>
          )}
          {isSecondInnings && runsNeeded !== null && runsNeeded > 0 && (
            <div className="px-2.5 py-1 rounded-lg bg-amber-950/40 border border-amber-500/20 text-xs">
              <span className="text-amber-400">Need </span>
              <span className="font-bold text-amber-300 tabular-nums">{runsNeeded}</span>
              <span className="text-amber-400"> in {ballsRemaining}b</span>
            </div>
          )}
        </div>
      </div>

      {/* ===== ACTIVE BATSMEN ===== */}
      <div className="grid grid-cols-2 gap-2">
        {/* Striker */}
        <div className={`rounded-xl p-3 border ${striker?.isOnStrike ? 'bg-emerald-950/40 border-emerald-500/40' : 'bg-slate-900/60 border-white/5'}`}>
          <div className="flex items-center gap-1.5 mb-1">
            {striker?.isOnStrike && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Striker</p>
          </div>
          <p className="text-sm font-extrabold text-white truncate">{striker?.playerName || '—'}</p>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-black text-white tabular-nums">{striker?.runs || 0}</span>
            <span className="text-xs text-gray-400 tabular-nums">({striker?.balls || 0})</span>
          </div>
          <div className="flex gap-2 mt-1 text-[10px] text-gray-400">
            <span>4s: <span className="text-white font-bold">{striker?.fours || 0}</span></span>
            <span>6s: <span className="text-white font-bold">{striker?.sixes || 0}</span></span>
            <span>SR: <span className="text-white font-bold">{striker?.strikeRate || 0}</span></span>
          </div>
        </div>

        {/* Non-Striker */}
        <div className="rounded-xl p-3 bg-slate-900/60 border border-white/5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Non-Striker</p>
          <p className="text-sm font-extrabold text-white truncate">{nonStriker?.playerName || '—'}</p>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-black text-white tabular-nums">{nonStriker?.runs || 0}</span>
            <span className="text-xs text-gray-400 tabular-nums">({nonStriker?.balls || 0})</span>
          </div>
          <div className="flex gap-2 mt-1 text-[10px] text-gray-400">
            <span>4s: <span className="text-white font-bold">{nonStriker?.fours || 0}</span></span>
            <span>6s: <span className="text-white font-bold">{nonStriker?.sixes || 0}</span></span>
            <span>SR: <span className="text-white font-bold">{nonStriker?.strikeRate || 0}</span></span>
          </div>
        </div>
      </div>

      {/* ===== BOWLER ===== */}
      <div className="rounded-xl p-3 bg-slate-900/60 border border-white/5">
        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">Bowler</p>
        <div className="flex items-center justify-between">
          <p className="text-sm font-extrabold text-white">{currentBowler?.playerName || '—'}</p>
          <div className="flex gap-3 text-xs">
            <span className="text-gray-400">{currentBowler?.overs || 0} <span className="text-[10px]">OV</span></span>
            <span className="text-gray-400">{currentBowler?.runsConceded || 0} <span className="text-[10px]">R</span></span>
            <span className="text-gray-400">{currentBowler?.wickets || 0} <span className="text-[10px]">W</span></span>
            <span className="text-gray-400">{currentBowler?.economy || 0} <span className="text-[10px]">ECO</span></span>
          </div>
        </div>
      </div>

      {/* ===== CURRENT OVER ===== */}
      <div className="rounded-xl p-3 bg-slate-900/60 border border-white/5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Over {Math.floor(innings.validBallsBowled / 6) + (innings.validBallsBowled % 6 === 0 && innings.validBallsBowled > 0 ? 0 : 1)}
          </p>
          <div className="flex items-center gap-3">
            <Link href={`/match/${match.id}/scorecard`} className="text-[10px] text-blue-400 font-bold hover:underline">
              Full Scorecard
            </Link>
            <button onClick={() => setShowHistory(!showHistory)} className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
              {showHistory ? 'Hide' : 'History'}
              {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {currentOverBalls.length === 0 ? (
            <span className="text-xs text-gray-500">No deliveries yet</span>
          ) : (
            currentOverBalls.map((d, i) => {
              const { label, color } = formatBall(d);
              return (
                <span key={d.id} className={`w-9 h-9 rounded-lg ${color} text-xs font-bold flex items-center justify-center`}>
                  {label}
                </span>
              );
            })
          )}
        </div>
      </div>

      {/* ===== BALL-BY-BALL HISTORY ===== */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl p-3 bg-slate-900/60 border border-white/5 space-y-3 max-h-64 overflow-y-auto">
              {Array.from(allOverGroups.entries())
                .sort(([a], [b]) => b - a)
                .map(([overNum, deliveries]) => (
                  <div key={overNum}>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1.5">Over {overNum + 1}</p>
                    <div className="space-y-1">
                      {deliveries.map((d, i) => {
                        const { label, color } = formatBall(d);
                        return (
                          <div key={d.id} className="flex items-center gap-2 text-xs">
                            <span className={`w-7 h-7 rounded-md ${color} text-[10px] font-bold flex items-center justify-center shrink-0`}>
                              {label}
                            </span>
                            <span className="text-gray-400 truncate">{d.commentary}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== SCORING PAD ===== */}
      {match.status === 'IN_PROGRESS' && !innings.isCompleted && (
        <div className="space-y-2.5 pt-1">
          {/* Run Buttons - Primary */}
          <div className="grid grid-cols-6 gap-2">
            {[0, 1, 2, 3, 4, 6].map((runs) => (
              <motion.button
                key={runs}
                whileTap={{ scale: 0.9 }}
                onClick={() => scoreDelivery({ runs })}
                className={`h-14 rounded-xl font-black text-lg flex items-center justify-center transition-all active:scale-95 ${
                  runs === 4
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 border border-emerald-500/50'
                    : runs === 6
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40 border border-purple-500/50'
                    : 'bg-slate-800 text-white border border-white/10 hover:bg-slate-700'
                }`}
              >
                {runs}
              </motion.button>
            ))}
          </div>

          {/* Extras & Wicket Buttons - Secondary */}
          <div className="grid grid-cols-5 gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                setDismissedBatterId(innings.currentStrikerId || '');
                setWicketType('BOWLED');
                setWicketRuns(0);
                setNewBatterId(eligibleBatsmen[0]?.id || '');
                setModalType('wicket');
              }}
              className="h-12 rounded-xl bg-rose-700 text-white font-extrabold text-sm flex items-center justify-center border border-rose-500/40 shadow-lg shadow-rose-900/30"
            >
              W
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => { setExtraRunsCount(0); setModalType('wide'); }}
              className="h-12 rounded-xl bg-amber-800/80 text-amber-200 font-bold text-xs flex items-center justify-center border border-amber-600/30"
            >
              WD
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => { setNoBallBatRuns(0); setModalType('noball'); }}
              className="h-12 rounded-xl bg-orange-800/80 text-orange-200 font-bold text-xs flex items-center justify-center border border-orange-600/30"
            >
              NB
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => { setExtraRunsCount(1); setModalType('bye'); }}
              className="h-12 rounded-xl bg-sky-800/60 text-sky-200 font-bold text-xs flex items-center justify-center border border-sky-600/30"
            >
              BYE
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => { setExtraRunsCount(1); setModalType('legbye'); }}
              className="h-12 rounded-xl bg-sky-800/60 text-sky-200 font-bold text-xs flex items-center justify-center border border-sky-600/30"
            >
              LB
            </motion.button>
          </div>

          {/* Undo Button */}
          <div className="flex justify-center pt-1">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleUndo}
              disabled={inningsHistory.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white bg-slate-900/60 border border-white/5 disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <Undo2 className="w-4 h-4" /> Undo Last Ball
            </motion.button>
          </div>
        </div>
      )}

      {/* ===== MODALS ===== */}
      <AnimatePresence>
        {modalType !== 'none' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => {
              if (['wide', 'noball', 'bye', 'legbye'].includes(modalType)) setModalType('none');
            }}
          >
            <motion.div
              initial={{ y: 200 }}
              animate={{ y: 0 }}
              exit={{ y: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-[#111827] border-t border-white/10 rounded-t-3xl p-5 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto"
            >
              {/* Close Button */}
              {!['innings-complete', 'match-result'].includes(modalType) && (
                <div className="flex justify-end">
                  <button onClick={() => setModalType('none')} className="p-1 rounded-lg text-gray-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* ---- WIDE MODAL ---- */}
              {modalType === 'wide' && (
                <div className="space-y-3">
                  <h3 className="text-lg font-extrabold text-amber-400">Wide Ball</h3>
                  <p className="text-xs text-gray-400">Select total extra runs (including 1 penalty)</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[0, 1, 2, 3, 4].map((extra) => (
                      <motion.button
                        key={extra}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          scoreDelivery({ runs: 0, extraType: 'WIDE', extraRuns: extra });
                          setModalType('none');
                        }}
                        className="h-14 rounded-xl bg-amber-800/60 text-amber-200 font-black text-lg border border-amber-600/30 flex items-center justify-center"
                      >
                        +{1 + extra}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* ---- NO BALL MODAL ---- */}
              {modalType === 'noball' && (
                <div className="space-y-3">
                  <h3 className="text-lg font-extrabold text-orange-400">No Ball</h3>
                  <p className="text-xs text-gray-400">+1 penalty run. Select runs off the bat:</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[0, 1, 2, 3, 4, 6].map((batRuns) => (
                      <motion.button
                        key={batRuns}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          scoreDelivery({ runs: batRuns, extraType: 'NO_BALL', extraRuns: 0 });
                          setModalType('none');
                        }}
                        className="h-14 rounded-xl bg-orange-800/60 text-orange-200 font-black text-lg border border-orange-600/30 flex items-center justify-center"
                      >
                        {batRuns}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* ---- BYE MODAL ---- */}
              {modalType === 'bye' && (
                <div className="space-y-3">
                  <h3 className="text-lg font-extrabold text-sky-400">Bye</h3>
                  <p className="text-xs text-gray-400">Byes scored (legal delivery, no batter credit)</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((byeRuns) => (
                      <motion.button
                        key={byeRuns}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          scoreDelivery({ runs: 0, extraType: 'BYE', extraRuns: byeRuns });
                          setModalType('none');
                        }}
                        className="h-14 rounded-xl bg-sky-800/50 text-sky-200 font-black text-lg border border-sky-600/30 flex items-center justify-center"
                      >
                        {byeRuns}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* ---- LEG BYE MODAL ---- */}
              {modalType === 'legbye' && (
                <div className="space-y-3">
                  <h3 className="text-lg font-extrabold text-sky-400">Leg Bye</h3>
                  <p className="text-xs text-gray-400">Leg byes scored (legal delivery, no batter credit)</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((lbRuns) => (
                      <motion.button
                        key={lbRuns}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          scoreDelivery({ runs: 0, extraType: 'LEG_BYE', extraRuns: lbRuns });
                          setModalType('none');
                        }}
                        className="h-14 rounded-xl bg-sky-800/50 text-sky-200 font-black text-lg border border-sky-600/30 flex items-center justify-center"
                      >
                        {lbRuns}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* ---- WICKET MODAL ---- */}
              {modalType === 'wicket' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-extrabold text-rose-400 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" /> Wicket
                  </h3>

                  {/* Dismissed Batter */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-300 uppercase">Dismissed Batter</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: innings.currentStrikerId!, label: striker?.playerName || 'Striker' },
                        { id: innings.currentNonStrikerId!, label: nonStriker?.playerName || 'Non-Striker' },
                      ].map((b) => (
                        <button
                          key={b.id}
                          onClick={() => setDismissedBatterId(b.id)}
                          className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${
                            dismissedBatterId === b.id
                              ? 'bg-rose-600 text-white border-rose-500'
                              : 'bg-slate-800 text-gray-300 border-white/10'
                          }`}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Wicket Type */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-300 uppercase">Dismissal Type</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['BOWLED', 'CAUGHT', 'LBW', 'RUN_OUT', 'STUMPED', 'HIT_WICKET'] as WicketType[]).map((wt) => (
                        <button
                          key={wt}
                          onClick={() => setWicketType(wt)}
                          className={`py-2 rounded-lg text-[11px] font-bold border transition-all ${
                            wicketType === wt
                              ? 'bg-rose-600 text-white border-rose-500'
                              : 'bg-slate-800 text-gray-300 border-white/10'
                          }`}
                        >
                          {wt.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Runs scored on wicket ball */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-300 uppercase">Runs scored (if any)</label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[0, 1, 2, 3].map((r) => (
                        <button
                          key={r}
                          onClick={() => setWicketRuns(r)}
                          className={`py-2 rounded-lg text-sm font-bold border transition-all ${
                            wicketRuns === r
                              ? 'bg-emerald-600 text-white border-emerald-500'
                              : 'bg-slate-800 text-gray-300 border-white/10'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* New Batsman */}
                  {eligibleBatsmen.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-300 uppercase">New Batsman</label>
                      <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto">
                        {eligibleBatsmen.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => setNewBatterId(p.id)}
                            className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                              newBatterId === p.id
                                ? 'bg-emerald-600 text-white border-emerald-500'
                                : 'bg-slate-800 text-gray-300 border-white/10'
                            }`}
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Confirm */}
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      scoreDelivery({
                        runs: wicketRuns,
                        wicket: {
                          dismissedBatterId,
                          wicketType,
                        },
                        newBatterId: newBatterId || undefined,
                      });
                      setModalType('none');
                    }}
                    disabled={!dismissedBatterId || (eligibleBatsmen.length > 0 && !newBatterId)}
                    className="w-full py-3.5 rounded-xl bg-rose-600 text-white font-extrabold text-sm disabled:opacity-40 disabled:pointer-events-none"
                  >
                    Confirm Wicket
                  </motion.button>
                </div>
              )}

              {/* ---- OVER COMPLETE MODAL ---- */}
              {modalType === 'over-complete' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-extrabold text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" /> Over Complete
                  </h3>
                  <p className="text-xs text-gray-400">Select the next bowler</p>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {bowlingPlayers.map((p) => {
                      const isLastBowler = p.id === innings.currentBowlerId;
                      return (
                        <button
                          key={p.id}
                          onClick={() => setNextBowlerId(p.id)}
                          disabled={isLastBowler}
                          className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                            nextBowlerId === p.id
                              ? 'bg-emerald-600 text-white border-emerald-500'
                              : isLastBowler
                              ? 'bg-slate-900 text-gray-600 border-white/5 opacity-50'
                              : 'bg-slate-800 text-gray-300 border-white/10'
                          }`}
                        >
                          {p.name}
                          {isLastBowler && <span className="text-[9px] block text-gray-500">(Last bowler)</span>}
                        </button>
                      );
                    })}
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleConfirmNextBowler}
                    disabled={!nextBowlerId}
                    className="w-full py-3.5 rounded-xl bg-emerald-500 text-gray-950 font-extrabold text-sm disabled:opacity-40 disabled:pointer-events-none"
                  >
                    Start Next Over
                  </motion.button>
                </div>
              )}

              {/* ---- INNINGS COMPLETE MODAL ---- */}
              {modalType === 'innings-complete' && (
                <div className="space-y-5 text-center py-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-950/60 border-2 border-emerald-500/40 flex items-center justify-center mx-auto">
                    <Target className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">Innings Complete</h3>
                    <p className="text-sm text-gray-400 mt-1">{innings.battingTeamName}</p>
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-4xl font-black text-white">{innings.totalRuns}/{innings.totalWickets}</span>
                    <span className="text-lg text-gray-400 font-bold">({formatOvers(innings.validBallsBowled)} ov)</span>
                  </div>
                  <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-3">
                    <p className="text-xs text-amber-400 font-bold uppercase">Target for {innings.bowlingTeamName}</p>
                    <p className="text-3xl font-black text-white mt-1">{innings.totalRuns + 1} runs</p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      const sbt = secondBattingTeam;
                      setSiStrikerId(sbt.players[0]?.id || '');
                      setSiNonStrikerId(sbt.players[1]?.id || '');
                      setSiBowlerId(secondBowlingTeam.players[0]?.id || '');
                      setModalType('second-innings-setup');
                    }}
                    className="w-full py-3.5 rounded-xl bg-emerald-500 text-gray-950 font-extrabold text-sm"
                  >
                    Setup Second Innings
                  </motion.button>
                </div>
              )}

              {/* ---- SECOND INNINGS SETUP MODAL ---- */}
              {modalType === 'second-innings-setup' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-extrabold text-emerald-400">Second Innings Setup</h3>
                  <p className="text-xs text-gray-400">
                    {secondBattingTeam.name} batting — Target: <span className="text-white font-bold">{(match.firstInnings?.totalRuns || 0) + 1}</span>
                  </p>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-300 uppercase">Opening Striker</label>
                    <select value={si_strikerId} onChange={(e) => setSiStrikerId(e.target.value)}
                      className="w-full bg-[#161f30] border border-white/10 text-white rounded-xl py-3 px-4 text-sm">
                      {secondBattingTeam.players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-300 uppercase">Opening Non-Striker</label>
                    <select value={si_nonStrikerId} onChange={(e) => setSiNonStrikerId(e.target.value)}
                      className="w-full bg-[#161f30] border border-white/10 text-white rounded-xl py-3 px-4 text-sm">
                      {secondBattingTeam.players.filter((p) => p.id !== si_strikerId).map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-300 uppercase">Opening Bowler</label>
                    <select value={si_bowlerId} onChange={(e) => setSiBowlerId(e.target.value)}
                      className="w-full bg-[#161f30] border border-white/10 text-white rounded-xl py-3 px-4 text-sm">
                      {secondBowlingTeam.players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleStartSecondInnings}
                    disabled={!si_strikerId || !si_nonStrikerId || !si_bowlerId}
                    className="w-full py-3.5 rounded-xl bg-emerald-500 text-gray-950 font-extrabold text-sm disabled:opacity-40"
                  >
                    Start Second Innings
                  </motion.button>
                </div>
              )}

              {/* ---- MATCH RESULT MODAL ---- */}
              {modalType === 'match-result' && (
                <div className="space-y-5 text-center py-3">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                    <Trophy className="w-10 h-10 text-gray-950" />
                  </div>
                  <h3 className="text-2xl font-black text-white">Match Result</h3>

                  {/* Scores */}
                  <div className="space-y-3">
                    <div className="bg-slate-900/60 rounded-xl p-3 border border-white/5">
                      <p className="text-xs font-bold text-emerald-400 uppercase">{match.firstInnings?.battingTeamName}</p>
                      <p className="text-2xl font-black text-white mt-0.5">
                        {match.firstInnings?.totalRuns}/{match.firstInnings?.totalWickets}
                        <span className="text-sm text-gray-400 font-bold ml-2">({formatOvers(match.firstInnings?.validBallsBowled || 0)} ov)</span>
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 font-bold">vs</p>
                    <div className="bg-slate-900/60 rounded-xl p-3 border border-white/5">
                      <p className="text-xs font-bold text-blue-400 uppercase">{match.secondInnings?.battingTeamName}</p>
                      <p className="text-2xl font-black text-white mt-0.5">
                        {match.secondInnings?.totalRuns}/{match.secondInnings?.totalWickets}
                        <span className="text-sm text-gray-400 font-bold ml-2">({formatOvers(match.secondInnings?.validBallsBowled || 0)} ov)</span>
                      </p>
                    </div>
                  </div>

                  {/* Result Banner */}
                  <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-xl p-4">
                    <p className="text-lg font-black text-emerald-400">{match.resultString}</p>
                  </div>

                  {/* Top Performers */}
                  {(() => {
                    const allBatters = [
                      ...Object.values(match.firstInnings?.batterStats || {}),
                      ...Object.values(match.secondInnings?.batterStats || {}),
                    ];
                    const allBowlers = [
                      ...Object.values(match.firstInnings?.bowlerStats || {}),
                      ...Object.values(match.secondInnings?.bowlerStats || {}),
                    ];
                    const topBatter = allBatters.sort((a, b) => b.runs - a.runs)[0];
                    const topBowler = allBowlers.filter((b) => b.wickets > 0).sort((a, b) => b.wickets - a.wickets || a.runsConceded - b.runsConceded)[0];

                    return (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {topBatter && (
                          <div className="bg-slate-900/60 rounded-xl p-2.5 border border-white/5">
                            <p className="text-[10px] text-gray-400 uppercase font-bold">Top Batter</p>
                            <p className="font-bold text-white mt-0.5">{topBatter.playerName}</p>
                            <p className="text-emerald-400 font-bold">{topBatter.runs} ({topBatter.balls})</p>
                          </div>
                        )}
                        {topBowler && (
                          <div className="bg-slate-900/60 rounded-xl p-2.5 border border-white/5">
                            <p className="text-[10px] text-gray-400 uppercase font-bold">Top Bowler</p>
                            <p className="font-bold text-white mt-0.5">{topBowler.playerName}</p>
                            <p className="text-blue-400 font-bold">{topBowler.wickets}/{topBowler.runsConceded}</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setModalType('none');
                      router.push('/');
                    }}
                    className="w-full py-3.5 rounded-xl bg-emerald-500 text-gray-950 font-extrabold text-sm"
                  >
                    Back to Home
                  </motion.button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
