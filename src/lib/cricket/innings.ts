import { Innings, Team, Player, BatterStats, BowlerStats, Extras } from './types';

/**
 * Formats valid balls into cricket overs notation (e.g. 14 balls -> 2.2 overs).
 */
export function formatOvers(balls: number): number {
  const overs = Math.floor(balls / 6);
  const remainingBalls = balls % 6;
  return Number(`${overs}.${remainingBalls}`);
}

/**
 * Calculates Current Run Rate (CRR).
 */
export function calculateRunRate(runs: number, balls: number): number {
  if (balls === 0) return 0;
  const oversDecimal = balls / 6;
  return Number((runs / oversDecimal).toFixed(2));
}

/**
 * Calculates Required Run Rate (RRR).
 */
export function calculateRequiredRunRate(
  targetRuns: number,
  currentRuns: number,
  totalOvers: number,
  ballsBowled: number
): number {
  const runsNeeded = targetRuns - currentRuns;
  const totalBalls = totalOvers * 6;
  const ballsRemaining = totalBalls - ballsBowled;

  if (runsNeeded <= 0) return 0;
  if (ballsRemaining <= 0) return 99.9; // impossible rate sentinel

  const oversRemaining = ballsRemaining / 6;
  return Number((runsNeeded / oversRemaining).toFixed(2));
}

/**
 * Creates an empty Innings state for a match.
 */
export function createInnings(params: {
  matchId: string;
  inningsNumber: 1 | 2;
  battingTeam: Team;
  bowlingTeam: Team;
  openingStrikerId: string;
  openingNonStrikerId: string;
  openingBowlerId: string;
  targetRuns?: number;
}): Innings {
  const initialExtras: Extras = {
    wides: 0,
    noBalls: 0,
    byes: 0,
    legByes: 0,
    penalty: 0,
    total: 0,
  };

  const batterStats: Record<string, BatterStats> = {};
  params.battingTeam.players.forEach((player) => {
    batterStats[player.id] = {
      playerId: player.id,
      playerName: player.name,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      strikeRate: 0,
      isOut: false,
      isOnStrike: player.id === params.openingStrikerId,
      isBatting: player.id === params.openingStrikerId || player.id === params.openingNonStrikerId,
    };
  });

  const bowlerStats: Record<string, BowlerStats> = {};
  params.bowlingTeam.players.forEach((player) => {
    bowlerStats[player.id] = {
      playerId: player.id,
      playerName: player.name,
      overs: 0,
      ballsBowled: 0,
      maidens: 0,
      runsConceded: 0,
      wickets: 0,
      economy: 0,
      wides: 0,
      noBalls: 0,
    };
  });

  return {
    id: `innings_${params.matchId}_${params.inningsNumber}`,
    matchId: params.matchId,
    inningsNumber: params.inningsNumber,
    battingTeamId: params.battingTeam.id,
    battingTeamName: params.battingTeam.name,
    bowlingTeamId: params.bowlingTeam.id,
    bowlingTeamName: params.bowlingTeam.name,
    totalRuns: 0,
    totalWickets: 0,
    oversBowled: 0,
    validBallsBowled: 0,
    extras: initialExtras,
    deliveries: [],
    batterStats,
    bowlerStats,
    currentStrikerId: params.openingStrikerId,
    currentNonStrikerId: params.openingNonStrikerId,
    currentBowlerId: params.openingBowlerId,
    isCompleted: false,
    targetRuns: params.targetRuns,
  };
}

/**
 * Checks if an innings is finished (all out or max overs reached or target chased).
 */
export function checkInningsCompletion(
  innings: Innings,
  maxOvers: number,
  totalSquadSize: number
): boolean {
  // All out (max wickets is squad size - 1)
  const maxWickets = Math.max(1, totalSquadSize - 1);
  if (innings.totalWickets >= maxWickets) {
    return true;
  }

  // Overs completed
  if (innings.validBallsBowled >= maxOvers * 6) {
    return true;
  }

  // 2nd innings target passed
  if (innings.targetRuns && innings.totalRuns >= innings.targetRuns) {
    return true;
  }

  return false;
}
