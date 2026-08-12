export interface StrikeState {
  strikerId: string;
  nonStrikerId: string;
}

/**
 * Calculates updated striker and non-striker after a delivery.
 * 
 * Rules:
 * 1. Odd runs scored (off bat or byes/leg-byes) swap strike.
 * 2. End of legal over (6 valid balls) swaps strike.
 * 3. Wicket: If striker is out, replaced by new Batter. If non-striker is out, replaced by new Batter.
 */
export function calculateStrikeRotation(params: {
  currentStrikerId: string;
  currentNonStrikerId: string;
  runsScored: number;
  extraType?: string;
  isLegalDelivery: boolean;
  isEndOfOver: boolean;
  dismissedBatterId?: string | null;
  newBatterId?: string | null;
}): StrikeState {
  let { strikerId, nonStrikerId } = {
    strikerId: params.currentStrikerId,
    nonStrikerId: params.currentNonStrikerId,
  };

  // If someone was dismissed and a new batter enters
  if (params.dismissedBatterId && params.newBatterId) {
    if (params.dismissedBatterId === strikerId) {
      strikerId = params.newBatterId;
    } else if (params.dismissedBatterId === nonStrikerId) {
      nonStrikerId = params.newBatterId;
    }
  }

  // Runs that cause end-swapping:
  // Runs off bat, or BYE / LEG_BYE runs
  const physicalRuns = params.runsScored;
  const causesSwap = physicalRuns % 2 !== 0;

  if (causesSwap) {
    const temp = strikerId;
    strikerId = nonStrikerId;
    nonStrikerId = temp;
  }

  // If end of over, swap strike again
  if (params.isEndOfOver) {
    const temp = strikerId;
    strikerId = nonStrikerId;
    nonStrikerId = temp;
  }

  return { strikerId, nonStrikerId };
}
