import { Delivery, Innings, ExtraType, WicketType, BatterStats, BowlerStats, Extras } from './types';
import { formatOvers, calculateRunRate } from './innings';
import { calculateStrikeRotation } from './strike';

export interface RecordBallInput {
  innings: Innings;
  runsScored: number; // Runs off bat (0, 1, 2, 3, 4, 6)
  extraType?: ExtraType;
  extraRuns?: number; // e.g. 1 for wide, or byes count
  wicket?: {
    dismissedBatterId: string;
    wicketType: WicketType;
    fielderId?: string;
    fielderName?: string;
  };
  newBatterId?: string; // the incoming batter after a wicket
  commentary?: string;
}

/**
 * Process a delivery and return the updated Innings state.
 * PURE FUNCTION: Does not mutate the original innings object.
 */
export function recordDelivery(input: RecordBallInput): Innings {
  const { innings, runsScored, extraType, extraRuns = 0, wicket, newBatterId, commentary } = input;

  if (innings.isCompleted) {
    return innings;
  }

  const isWide = extraType === 'WIDE';
  const isNoBall = extraType === 'NO_BALL';
  const isBye = extraType === 'BYE';
  const isLegBye = extraType === 'LEG_BYE';
  const isByeOrLegBye = isBye || isLegBye;
  const isPenalty = extraType === 'PENALTY';

  const isLegalDelivery = !isWide && !isNoBall;

  // Calculate total runs for this ball
  let ballTotalRuns = 0;
  if (isWide) {
    // Wide: 1 penalty + any extra runs (overthrows etc)
    ballTotalRuns = 1 + extraRuns;
  } else if (isNoBall) {
    // No-ball: 1 penalty + bat runs + any extra runs
    ballTotalRuns = 1 + runsScored + extraRuns;
  } else if (isByeOrLegBye) {
    // Bye/Leg-bye: the extra runs are the runs taken, bat runs should be 0
    ballTotalRuns = extraRuns;
  } else {
    // Normal delivery or penalty
    ballTotalRuns = runsScored;
  }

  const newValidBalls = innings.validBallsBowled + (isLegalDelivery ? 1 : 0);
  const currentOverIndex = Math.floor(innings.validBallsBowled / 6);
  const newBallInOver = isLegalDelivery ? ((innings.validBallsBowled % 6) + 1) : 0;
  const isEndOfOver = isLegalDelivery && newBallInOver === 6;

  // Deep clone mutable state
  const newDeliveries = [...innings.deliveries];
  const newBatterStats: Record<string, BatterStats> = JSON.parse(JSON.stringify(innings.batterStats));
  const newBowlerStats: Record<string, BowlerStats> = JSON.parse(JSON.stringify(innings.bowlerStats));
  const newExtras: Extras = { ...innings.extras };

  const strikerId = innings.currentStrikerId;
  const nonStrikerId = innings.currentNonStrikerId;
  const bowlerId = innings.currentBowlerId;

  if (!strikerId || !nonStrikerId || !bowlerId) {
    throw new Error('Current striker, non-striker, or bowler is missing from innings state.');
  }

  const striker = newBatterStats[strikerId];
  const bowler = newBowlerStats[bowlerId];

  // === Update Extras ===
  if (isWide) {
    newExtras.wides += 1 + extraRuns;
    newExtras.total += 1 + extraRuns;
  } else if (isNoBall) {
    newExtras.noBalls += 1;
    newExtras.total += 1;
    // If there are additional extras on a no-ball (byes off nb)
    if (extraRuns > 0) {
      newExtras.total += extraRuns;
    }
  } else if (isBye) {
    newExtras.byes += extraRuns;
    newExtras.total += extraRuns;
  } else if (isLegBye) {
    newExtras.legByes += extraRuns;
    newExtras.total += extraRuns;
  } else if (isPenalty) {
    newExtras.penalty += extraRuns;
    newExtras.total += extraRuns;
  }

  // === Update Batter Stats ===
  if (striker) {
    // Wides do NOT increment balls faced by batter
    if (!isWide) {
      striker.balls += 1;
    }

    // Runs credited to batter: only runs off bat (not byes, leg-byes, or extras)
    if (!isByeOrLegBye && !isPenalty) {
      striker.runs += runsScored;
      if (runsScored === 4) striker.fours += 1;
      if (runsScored === 6) striker.sixes += 1;
    }

    striker.strikeRate = striker.balls > 0 ? Number(((striker.runs / striker.balls) * 100).toFixed(1)) : 0;
  }

  // === Update Bowler Stats ===
  if (bowler) {
    if (isLegalDelivery) {
      bowler.ballsBowled += 1;
      bowler.overs = formatOvers(bowler.ballsBowled);
    }

    if (isWide) bowler.wides += 1;
    if (isNoBall) bowler.noBalls += 1;

    // Bowler concedes: runs off bat + wide penalty + no-ball penalty
    // Byes/Leg-byes do NOT count against bowler
    if (isWide) {
      bowler.runsConceded += 1 + extraRuns;
    } else if (isNoBall) {
      bowler.runsConceded += 1 + runsScored; // nb penalty + bat runs (not byes)
    } else if (!isByeOrLegBye && !isPenalty) {
      bowler.runsConceded += runsScored;
    }

    const bowlerOversDecimal = bowler.ballsBowled / 6;
    bowler.economy = bowlerOversDecimal > 0 ? Number((bowler.runsConceded / bowlerOversDecimal).toFixed(2)) : 0;
  }

  // === Process Wicket ===
  let newWicketRecord;
  let totalWickets = innings.totalWickets;

  if (wicket) {
    totalWickets += 1;
    const dismissedBatter = newBatterStats[wicket.dismissedBatterId];
    if (dismissedBatter) {
      dismissedBatter.isOut = true;
      dismissedBatter.dismissalType = wicket.wicketType;
      dismissedBatter.bowlerName = bowler?.playerName;
      dismissedBatter.fielderName = wicket.fielderName;
      dismissedBatter.isBatting = false;
    }

    // Wicket credit for bowler (run-out is NOT credited to bowler)
    if (wicket.wicketType !== 'RUN_OUT' && bowler) {
      bowler.wickets += 1;
    }

    // Mark new batter as batting
    if (newBatterId && newBatterStats[newBatterId]) {
      newBatterStats[newBatterId].isBatting = true;
    }

    newWicketRecord = {
      id: `w_${Date.now()}_${newValidBalls}`,
      batterId: wicket.dismissedBatterId,
      batterName: newBatterStats[wicket.dismissedBatterId]?.playerName || 'Batter',
      bowlerId,
      bowlerName: bowler?.playerName || 'Bowler',
      wicketType: wicket.wicketType,
      fielderId: wicket.fielderId,
      fielderName: wicket.fielderName,
      deliveryNumber: newDeliveries.length + 1,
      overNumber: currentOverIndex,
      ballInOver: newBallInOver || (innings.validBallsBowled % 6) + 1,
      runsScored: ballTotalRuns,
    };
  }

  // === Create Delivery Object ===
  const deliveryRecord: Delivery = {
    id: `del_${Date.now()}_${newDeliveries.length + 1}`,
    matchId: innings.matchId,
    inningsNumber: innings.inningsNumber,
    overNumber: currentOverIndex,
    ballInOver: newBallInOver || 0,
    strikerId,
    strikerName: striker?.playerName || 'Striker',
    nonStrikerId,
    nonStrikerName: newBatterStats[nonStrikerId]?.playerName || 'Non-Striker',
    bowlerId,
    bowlerName: bowler?.playerName || 'Bowler',
    runsScored,
    extraType,
    extraRuns,
    isLegalDelivery,
    isBoundaryFour: runsScored === 4 && !isByeOrLegBye && !isWide,
    isBoundarySix: runsScored === 6 && !isByeOrLegBye && !isWide,
    wicket: newWicketRecord,
    commentary: commentary || generateCommentaryText(runsScored, extraType, extraRuns, wicket?.wicketType),
    timestamp: Date.now(),
  };

  newDeliveries.push(deliveryRecord);

  // === Calculate Strike Rotation ===
  // Determine physical runs for strike calculation
  let physicalRunsForStrike = runsScored;
  if (isByeOrLegBye) {
    physicalRunsForStrike = extraRuns; // byes/lb: physical run swaps
  } else if (isWide) {
    physicalRunsForStrike = extraRuns; // wide overthrows can cause strike change
  }

  const newStrike = calculateStrikeRotation({
    currentStrikerId: strikerId,
    currentNonStrikerId: nonStrikerId,
    runsScored: physicalRunsForStrike,
    extraType,
    isLegalDelivery,
    isEndOfOver,
    dismissedBatterId: wicket?.dismissedBatterId || null,
    newBatterId: newBatterId || null,
  });

  // Update on-strike flags
  Object.values(newBatterStats).forEach((b) => {
    if (b.isOut) {
      b.isOnStrike = false;
    } else {
      b.isOnStrike = b.playerId === newStrike.strikerId;
    }
  });

  return {
    ...innings,
    totalRuns: innings.totalRuns + ballTotalRuns,
    totalWickets,
    validBallsBowled: newValidBalls,
    oversBowled: formatOvers(newValidBalls),
    extras: newExtras,
    deliveries: newDeliveries,
    batterStats: newBatterStats,
    bowlerStats: newBowlerStats,
    currentStrikerId: newStrike.strikerId,
    currentNonStrikerId: newStrike.nonStrikerId,
  };
}

/**
 * Undo the last delivery. Returns the innings state before the last delivery.
 * Uses complete state snapshots stored in delivery history.
 */
export function undoLastDelivery(innings: Innings, previousInningsState: Innings): Innings {
  return previousInningsState;
}

/**
 * Generates automated commentary for a ball.
 */
function generateCommentaryText(runs: number, extraType?: ExtraType, extraRuns?: number, wicketType?: WicketType): string {
  if (wicketType) return `WICKET! ${wicketType.replace('_', ' ')}.`;
  if (extraType === 'WIDE') return `Wide ball. +${1 + (extraRuns || 0)} runs.`;
  if (extraType === 'NO_BALL') return `No Ball! ${runs > 0 ? `${runs} off bat.` : ''} +1 penalty.`;
  if (extraType === 'BYE') return `${extraRuns || 1} bye${(extraRuns || 1) > 1 ? 's' : ''}.`;
  if (extraType === 'LEG_BYE') return `${extraRuns || 1} leg bye${(extraRuns || 1) > 1 ? 's' : ''}.`;
  if (runs === 6) return `SIX! Over the ropes!`;
  if (runs === 4) return `FOUR! To the boundary!`;
  if (runs === 0) return `Dot ball.`;
  return `${runs} run${runs > 1 ? 's' : ''}.`;
}

/**
 * Gets the deliveries in the current over.
 */
export function getCurrentOverDeliveries(innings: Innings): Delivery[] {
  const currentOverIndex = Math.floor(innings.validBallsBowled / 6);
  // If we just finished an over (validBalls divisible by 6), the "current" over is the next one
  // But if no balls in new over yet, show last completed over
  if (innings.validBallsBowled > 0 && innings.validBallsBowled % 6 === 0) {
    // Just finished an over, show the over that just completed
    const lastOverIndex = currentOverIndex - 1;
    return innings.deliveries.filter((d) => d.overNumber === lastOverIndex);
  }
  return innings.deliveries.filter((d) => d.overNumber === currentOverIndex);
}

/**
 * Gets deliveries grouped by over number.
 */
export function getDeliveriesByOver(innings: Innings): Map<number, Delivery[]> {
  const map = new Map<number, Delivery[]>();
  for (const d of innings.deliveries) {
    const existing = map.get(d.overNumber) || [];
    existing.push(d);
    map.set(d.overNumber, existing);
  }
  return map;
}
