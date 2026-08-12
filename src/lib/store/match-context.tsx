'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Match, Player, Team, Innings } from '../cricket/types';
import { createInnings, checkInningsCompletion } from '../cricket/innings';
import { calculateMatchResult } from '../cricket/match-result';
import { SAMPLE_MATCHES, SAMPLE_PLAYERS } from './sample-data';
import { syncMatchToSupabase, flushPendingDeliveries } from '../supabase/sync';

export interface DraftMatchState {
  name: string;
  totalOvers: number;
  isCustomOvers: boolean;
  teamAName: string;
  teamBName: string;
  teamAPlayers: Player[];
  teamBPlayers: Player[];
  tossWinnerTeamId?: string;
  tossDecision?: 'BAT' | 'BOWL';
  openingStrikerId?: string;
  openingNonStrikerId?: string;
  openingBowlerId?: string;
}

interface MatchContextType {
  matches: Match[];
  activeMatch: Match | null;
  draftMatch: DraftMatchState;
  globalPlayers: Player[];
  // State history for undo
  inningsHistory: Innings[];
  
  // Draft Actions
  updateDraftConfig: (fields: Partial<DraftMatchState>) => void;
  addPlayerToTeam: (teamKey: 'teamA' | 'teamB', playerName: string) => void;
  removePlayerFromTeam: (teamKey: 'teamA' | 'teamB', playerId: string) => void;
  updatePlayerName: (teamKey: 'teamA' | 'teamB', playerId: string, newName: string) => void;
  resetDraft: () => void;
  
  // Match Lifecycle
  initializeMatchFromDraft: () => Match;
  saveMatch: (match: Match) => void;
  deleteMatch: (matchId: string) => void;
  setActiveMatchId: (matchId: string | null) => void;
  loadActiveMatch: (matchId: string) => Match | null;

  // Live Scoring
  updateActiveMatch: (match: Match) => void;
  pushInningsSnapshot: (innings: Innings) => void;
  popInningsSnapshot: () => Innings | null;
  clearInningsHistory: () => void;
  
  // Innings transitions
  startSecondInnings: (openingStrikerId: string, openingNonStrikerId: string, openingBowlerId: string) => Match;
  completeMatch: () => Match;

  // Player Directory Actions
  addGlobalPlayer: (name: string) => void;
  deleteGlobalPlayer: (id: string) => void;
}

const DEFAULT_DRAFT: DraftMatchState = {
  name: 'Super Turf League',
  totalOvers: 8,
  isCustomOvers: false,
  teamAName: 'Royal Strikers',
  teamBName: 'Turf Kings',
  teamAPlayers: [
    { id: 'p_1', name: 'Prem' },
    { id: 'p_2', name: 'Rahul' },
    { id: 'p_3', name: 'Amit' },
    { id: 'p_4', name: 'Jay' },
    { id: 'p_5', name: 'Karan' },
    { id: 'p_6', name: 'Rohan' },
  ],
  teamBPlayers: [
    { id: 'p_7', name: 'Vicky' },
    { id: 'p_8', name: 'Sachin' },
    { id: 'p_9', name: 'Virat' },
    { id: 'p_10', name: 'Rohit' },
    { id: 'p_11', name: 'Hardik' },
    { id: 'p_12', name: 'Bumrah' },
  ],
};

const MatchContext = createContext<MatchContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY_MATCHES = 'turfscore_matches_v1';
const LOCAL_STORAGE_KEY_PLAYERS = 'turfscore_players_v1';
const LOCAL_STORAGE_KEY_ACTIVE = 'turfscore_active_match_v1';
const LOCAL_STORAGE_KEY_HISTORY = 'turfscore_innings_history_v1';

export function MatchProvider({ children }: { children: React.ReactNode }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [draftMatch, setDraftMatch] = useState<DraftMatchState>(DEFAULT_DRAFT);
  const [globalPlayers, setGlobalPlayers] = useState<Player[]>([]);
  const [inningsHistory, setInningsHistory] = useState<Innings[]>([]);
  const inningsHistoryRef = useRef<Innings[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    try {
      const savedMatchesStr = localStorage.getItem(LOCAL_STORAGE_KEY_MATCHES);
      if (savedMatchesStr) {
        const parsed = JSON.parse(savedMatchesStr);
        setMatches(parsed.length > 0 ? parsed : SAMPLE_MATCHES);
      } else {
        setMatches(SAMPLE_MATCHES);
      }

      const savedPlayersStr = localStorage.getItem(LOCAL_STORAGE_KEY_PLAYERS);
      if (savedPlayersStr) {
        setGlobalPlayers(JSON.parse(savedPlayersStr));
      } else {
        setGlobalPlayers(SAMPLE_PLAYERS);
      }

      // Load active match
      const activeStr = localStorage.getItem(LOCAL_STORAGE_KEY_ACTIVE);
      if (activeStr) {
        const parsed = JSON.parse(activeStr);
        if (parsed && (parsed.status === 'IN_PROGRESS' || parsed.status === 'INNINGS_BREAK' || parsed.status === 'SETUP_COMPLETED')) {
          setActiveMatch(parsed);
        }
      }

      // Load innings history for undo
      const historyStr = localStorage.getItem(LOCAL_STORAGE_KEY_HISTORY);
      if (historyStr) {
        const parsed = JSON.parse(historyStr);
        if (Array.isArray(parsed)) {
          setInningsHistory(parsed);
          inningsHistoryRef.current = parsed;
        }
      }
    } catch (err) {
      console.error('Failed loading state from LocalStorage:', err);
      setMatches(SAMPLE_MATCHES);
      setGlobalPlayers(SAMPLE_PLAYERS);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save matches to local storage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(LOCAL_STORAGE_KEY_MATCHES, JSON.stringify(matches));
    }
  }, [matches, isLoaded]);

  // Save global players
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(LOCAL_STORAGE_KEY_PLAYERS, JSON.stringify(globalPlayers));
    }
  }, [globalPlayers, isLoaded]);

  // Save active match
  useEffect(() => {
    if (isLoaded) {
      if (activeMatch) {
        localStorage.setItem(LOCAL_STORAGE_KEY_ACTIVE, JSON.stringify(activeMatch));
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEY_ACTIVE);
      }
    }
  }, [activeMatch, isLoaded]);

  // Save innings history
  useEffect(() => {
    if (isLoaded) {
      // Only keep last 50 snapshots to limit storage
      const trimmed = inningsHistory.slice(-50);
      localStorage.setItem(LOCAL_STORAGE_KEY_HISTORY, JSON.stringify(trimmed));
    }
  }, [inningsHistory, isLoaded]);

  const updateDraftConfig = (fields: Partial<DraftMatchState>) => {
    setDraftMatch((prev) => ({ ...prev, ...fields }));
  };

  const addPlayerToTeam = (teamKey: 'teamA' | 'teamB', playerName: string) => {
    const trimmed = playerName.trim();
    if (!trimmed) return;
    const newPlayer: Player = {
      id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: trimmed,
    };
    if (teamKey === 'teamA') {
      setDraftMatch((prev) => ({ ...prev, teamAPlayers: [...prev.teamAPlayers, newPlayer] }));
    } else {
      setDraftMatch((prev) => ({ ...prev, teamBPlayers: [...prev.teamBPlayers, newPlayer] }));
    }
  };

  const removePlayerFromTeam = (teamKey: 'teamA' | 'teamB', playerId: string) => {
    if (teamKey === 'teamA') {
      setDraftMatch((prev) => ({
        ...prev,
        teamAPlayers: prev.teamAPlayers.filter((p) => p.id !== playerId),
      }));
    } else {
      setDraftMatch((prev) => ({
        ...prev,
        teamBPlayers: prev.teamBPlayers.filter((p) => p.id !== playerId),
      }));
    }
  };

  const updatePlayerName = (teamKey: 'teamA' | 'teamB', playerId: string, newName: string) => {
    const listKey = teamKey === 'teamA' ? 'teamAPlayers' : 'teamBPlayers';
    setDraftMatch((prev) => ({
      ...prev,
      [listKey]: prev[listKey].map((p) => (p.id === playerId ? { ...p, name: newName } : p)),
    }));
  };

  const resetDraft = () => {
    setDraftMatch({
      ...DEFAULT_DRAFT,
      name: `Match #${matches.length + 1}`,
    });
  };

  const initializeMatchFromDraft = (): Match => {
    const teamA: Team = {
      id: 'team_a',
      name: draftMatch.teamAName || 'Team A',
      shortName: (draftMatch.teamAName || 'TMA').slice(0, 3).toUpperCase(),
      color: '#10b981',
      players: draftMatch.teamAPlayers,
    };

    const teamB: Team = {
      id: 'team_b',
      name: draftMatch.teamBName || 'Team B',
      shortName: (draftMatch.teamBName || 'TMB').slice(0, 3).toUpperCase(),
      color: '#3b82f6',
      players: draftMatch.teamBPlayers,
    };

    const tossWinnerId = draftMatch.tossWinnerTeamId || teamA.id;
    const tossDecision = draftMatch.tossDecision || 'BAT';

    let battingFirstTeam = teamA;
    let bowlingFirstTeam = teamB;

    if (
      (tossWinnerId === teamA.id && tossDecision === 'BOWL') ||
      (tossWinnerId === teamB.id && tossDecision === 'BAT')
    ) {
      battingFirstTeam = teamB;
      bowlingFirstTeam = teamA;
    }

    const strikerId = draftMatch.openingStrikerId || battingFirstTeam.players[0]?.id || 'p1';
    const nonStrikerId = draftMatch.openingNonStrikerId || battingFirstTeam.players[1]?.id || 'p2';
    const bowlerId = draftMatch.openingBowlerId || bowlingFirstTeam.players[0]?.id || 'p3';

    const newMatchId = `match_${Date.now()}`;

    const firstInnings = createInnings({
      matchId: newMatchId,
      inningsNumber: 1,
      battingTeam: battingFirstTeam,
      bowlingTeam: bowlingFirstTeam,
      openingStrikerId: strikerId,
      openingNonStrikerId: nonStrikerId,
      openingBowlerId: bowlerId,
    });

    const newMatch: Match = {
      id: newMatchId,
      name: draftMatch.name || 'Turf Match',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      totalOvers: draftMatch.totalOvers,
      status: 'IN_PROGRESS',
      teamA,
      teamB,
      toss: {
        winnerTeamId: tossWinnerId,
        decision: tossDecision,
      },
      battingFirstTeamId: battingFirstTeam.id,
      bowlingFirstTeamId: bowlingFirstTeam.id,
      openingStrikerId: strikerId,
      openingNonStrikerId: nonStrikerId,
      openingBowlerId: bowlerId,
      firstInnings,
      currentInningsNumber: 1,
    };

    saveMatch(newMatch);
    setActiveMatch(newMatch);
    setInningsHistory([]);
    syncMatchToSupabase(newMatch).catch(() => {});
    return newMatch;
  };

  const saveMatch = (match: Match) => {
    setMatches((prev) => {
      const idx = prev.findIndex((m) => m.id === match.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = match;
        return updated;
      }
      return [match, ...prev];
    });
    syncMatchToSupabase(match).catch(() => {});
  };

  const deleteMatch = (matchId: string) => {
    setMatches((prev) => prev.filter((m) => m.id !== matchId));
    if (activeMatch?.id === matchId) {
      setActiveMatch(null);
    }
  };

  const setActiveMatchId = (matchId: string | null) => {
    if (!matchId) {
      setActiveMatch(null);
      return;
    }
    const found = matches.find((m) => m.id === matchId);
    if (found) {
      setActiveMatch(found);
    }
  };

  const loadActiveMatch = (matchId: string): Match | null => {
    // First check if it's the current active match
    if (activeMatch?.id === matchId) return activeMatch;
    // Otherwise look in saved matches
    const found = matches.find((m) => m.id === matchId);
    if (found) {
      setActiveMatch(found);
      return found;
    }
    return null;
  };

  const updateActiveMatch = useCallback((match: Match) => {
    setActiveMatch(match);
    // Also save to matches list
    setMatches((prev) => {
      const idx = prev.findIndex((m) => m.id === match.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = match;
        return updated;
      }
      return [match, ...prev];
    });
    syncMatchToSupabase(match).catch(() => {});
  }, []);

  const pushInningsSnapshot = useCallback((innings: Innings) => {
    const snapshot = JSON.parse(JSON.stringify(innings));
    inningsHistoryRef.current = [...inningsHistoryRef.current, snapshot];
    if (inningsHistoryRef.current.length > 50) {
      inningsHistoryRef.current = inningsHistoryRef.current.slice(-50);
    }
    setInningsHistory([...inningsHistoryRef.current]);
  }, []);

  const popInningsSnapshot = useCallback((): Innings | null => {
    const stack = inningsHistoryRef.current;
    if (stack.length === 0) return null;
    const result = stack[stack.length - 1];
    inningsHistoryRef.current = stack.slice(0, -1);
    setInningsHistory([...inningsHistoryRef.current]);
    return result;
  }, []);

  const clearInningsHistory = useCallback(() => {
    inningsHistoryRef.current = [];
    setInningsHistory([]);
  }, []);

  const startSecondInnings = (openingStrikerId: string, openingNonStrikerId: string, openingBowlerId: string): Match => {
    if (!activeMatch || !activeMatch.firstInnings) {
      throw new Error('Cannot start second innings without a completed first innings');
    }

    const firstInningsScore = activeMatch.firstInnings.totalRuns;
    const target = firstInningsScore + 1;

    // Swap batting/bowling
    const battingFirstTeamId = activeMatch.battingFirstTeamId;
    const bowlingTeam = battingFirstTeamId === activeMatch.teamA.id ? activeMatch.teamA : activeMatch.teamB;
    const battingTeam = battingFirstTeamId === activeMatch.teamA.id ? activeMatch.teamB : activeMatch.teamA;

    const secondInnings = createInnings({
      matchId: activeMatch.id,
      inningsNumber: 2,
      battingTeam,
      bowlingTeam,
      openingStrikerId,
      openingNonStrikerId,
      openingBowlerId,
      targetRuns: target,
    });

    const updatedMatch: Match = {
      ...activeMatch,
      status: 'IN_PROGRESS',
      currentInningsNumber: 2,
      secondInnings,
      updatedAt: Date.now(),
    };

    updateActiveMatch(updatedMatch);
    setInningsHistory([]);
    return updatedMatch;
  };

  const completeMatch = (): Match => {
    if (!activeMatch) throw new Error('No active match');

    const result = calculateMatchResult(activeMatch);
    const updatedMatch: Match = {
      ...activeMatch,
      status: 'COMPLETED',
      winnerTeamId: result.winnerTeamId,
      resultString: result.resultString,
      updatedAt: Date.now(),
    };

    updateActiveMatch(updatedMatch);
    setInningsHistory([]);
    return updatedMatch;
  };

  const addGlobalPlayer = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newP: Player = {
      id: `p_g_${Date.now()}`,
      name: trimmed,
    };
    setGlobalPlayers((prev) => [newP, ...prev]);
  };

  const deleteGlobalPlayer = (id: string) => {
    setGlobalPlayers((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <MatchContext.Provider
      value={{
        matches,
        activeMatch,
        draftMatch,
        globalPlayers,
        inningsHistory,
        updateDraftConfig,
        addPlayerToTeam,
        removePlayerFromTeam,
        updatePlayerName,
        resetDraft,
        initializeMatchFromDraft,
        saveMatch,
        deleteMatch,
        setActiveMatchId,
        loadActiveMatch,
        updateActiveMatch,
        pushInningsSnapshot,
        popInningsSnapshot,
        clearInningsHistory,
        startSecondInnings,
        completeMatch,
        addGlobalPlayer,
        deleteGlobalPlayer,
      }}
    >
      {children}
    </MatchContext.Provider>
  );
}

export function useMatchContext() {
  const context = useContext(MatchContext);
  if (!context) {
    throw new Error('useMatchContext must be used within a MatchProvider');
  }
  return context;
}
