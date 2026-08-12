import { Match } from './types';

export interface MatchOutcome {
  winnerTeamId: string | null;
  resultString: string;
  isTie: boolean;
  isCompleted: boolean;
}

/**
 * Computes the final or current match result summary.
 */
export function calculateMatchResult(match: Match): MatchOutcome {
  const { firstInnings, secondInnings, teamA, teamB, totalOvers } = match;

  if (!firstInnings || !firstInnings.isCompleted) {
    return {
      winnerTeamId: null,
      resultString: 'Match in progress (1st Innings)',
      isTie: false,
      isCompleted: false,
    };
  }

  if (!secondInnings) {
    return {
      winnerTeamId: null,
      resultString: `Innings Break — Target: ${firstInnings.totalRuns + 1} runs`,
      isTie: false,
      isCompleted: false,
    };
  }

  const firstTeamName = firstInnings.battingTeamName;
  const secondTeamName = secondInnings.battingTeamName;
  const target = firstInnings.totalRuns + 1;

  const firstRuns = firstInnings.totalRuns;
  const secondRuns = secondInnings.totalRuns;

  // If 2nd innings chased target down
  if (secondRuns >= target) {
    const chasingTeamId = secondInnings.battingTeamId;
    const wicketsLost = secondInnings.totalWickets;
    const squadCount = match.battingFirstTeamId === teamA.id ? teamB.players.length : teamA.players.length;
    const wicketsRemaining = Math.max(1, squadCount - 1) - wicketsLost;
    
    const totalBalls = totalOvers * 6;
    const ballsRemaining = Math.max(0, totalBalls - secondInnings.validBallsBowled);

    const ballText = ballsRemaining === 1 ? '1 ball' : `${ballsRemaining} balls`;
    const wicketText = wicketsRemaining === 1 ? '1 wicket' : `${wicketsRemaining} wickets`;

    return {
      winnerTeamId: chasingTeamId,
      resultString: `${secondTeamName} won by ${wicketText} (${ballText} left)`,
      isTie: false,
      isCompleted: true,
    };
  }

  // If 2nd innings completed without reaching target
  if (secondInnings.isCompleted) {
    if (secondRuns === firstRuns) {
      return {
        winnerTeamId: null,
        resultString: `Match Tied! (${firstRuns} runs each)`,
        isTie: true,
        isCompleted: true,
      };
    }

    const defendingTeamId = firstInnings.battingTeamId;
    const margin = firstRuns - secondRuns;
    const runText = margin === 1 ? '1 run' : `${margin} runs`;

    return {
      winnerTeamId: defendingTeamId,
      resultString: `${firstTeamName} won by ${runText}`,
      isTie: false,
      isCompleted: true,
    };
  }

  // 2nd innings still in progress
  const runsNeeded = target - secondRuns;
  const totalBalls = totalOvers * 6;
  const ballsRemaining = Math.max(0, totalBalls - secondInnings.validBallsBowled);

  return {
    winnerTeamId: null,
    resultString: `${secondTeamName} need ${runsNeeded} runs in ${ballsRemaining} balls`,
    isTie: false,
    isCompleted: false,
  };
}
