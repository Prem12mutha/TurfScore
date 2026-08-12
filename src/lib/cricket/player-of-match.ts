import { Innings, BatterStats, BowlerStats } from './types';

export interface POTMResult {
  playerId: string;
  playerName: string;
  points: number;
  summary: string;
  runsScored: number;
  ballsFaced: number;
  wicketsTaken: number;
  runsConceded: number;
}

/**
 * Deterministic Player of the Match calculation.
 * 
 * Formula:
 * - Runs scored: +1 pt per run
 * - Fours: +1 bonus pt per boundary 4
 * - Sixes: +2 bonus pts per boundary 6
 * - Wickets taken: +20 pts per wicket
 * - Economy bonus (min 1 over bowled):
 *     - Eco < 6.0: +10 pts
 *     - Eco < 8.0: +5 pts
 */
export function calculatePlayerOfTheMatch(firstInnings?: Innings, secondInnings?: Innings): POTMResult | null {
  const playerScores: Record<string, {
    name: string;
    points: number;
    runs: number;
    balls: number;
    wickets: number;
    runsConceded: number;
  }> = {};

  const processInnings = (inn?: Innings) => {
    if (!inn) return;

    // Batters
    Object.values(inn.batterStats || {}).forEach((b) => {
      if (!playerScores[b.playerId]) {
        playerScores[b.playerId] = {
          name: b.playerName,
          points: 0,
          runs: 0,
          balls: 0,
          wickets: 0,
          runsConceded: 0,
        };
      }

      const p = playerScores[b.playerId];
      p.runs += b.runs;
      p.balls += b.balls;

      let batPts = b.runs * 1;
      batPts += b.fours * 1;
      batPts += b.sixes * 2;
      p.points += batPts;
    });

    // Bowlers
    Object.values(inn.bowlerStats || {}).forEach((bw) => {
      if (bw.ballsBowled === 0) return;

      if (!playerScores[bw.playerId]) {
        playerScores[bw.playerId] = {
          name: bw.playerName,
          points: 0,
          runs: 0,
          balls: 0,
          wickets: 0,
          runsConceded: 0,
        };
      }

      const p = playerScores[bw.playerId];
      p.wickets += bw.wickets;
      p.runsConceded += bw.runsConceded;

      let bowlPts = bw.wickets * 20;

      // Economy bonus if at least 1 over bowled
      if (bw.ballsBowled >= 6) {
        if (bw.economy < 6.0) bowlPts += 10;
        else if (bw.economy < 8.0) bowlPts += 5;
      }

      p.points += bowlPts;
    });
  };

  processInnings(firstInnings);
  processInnings(secondInnings);

  const players = Object.entries(playerScores);
  if (players.length === 0) return null;

  // Sort descending by points
  players.sort(([, a], [, b]) => b.points - a.points);

  const [topId, topData] = players[0];

  const parts: string[] = [];
  if (topData.runs > 0) parts.push(`${topData.runs} runs (${topData.balls}b)`);
  if (topData.wickets > 0) parts.push(`${topData.wickets} wkts`);

  return {
    playerId: topId,
    playerName: topData.name,
    points: Math.round(topData.points),
    summary: parts.join(', ') || 'All-round performance',
    runsScored: topData.runs,
    ballsFaced: topData.balls,
    wicketsTaken: topData.wickets,
    runsConceded: topData.runsConceded,
  };
}
