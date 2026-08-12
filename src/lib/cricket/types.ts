export type MatchStatus = 'DRAFT' | 'SETUP_COMPLETED' | 'IN_PROGRESS' | 'INNINGS_BREAK' | 'COMPLETED' | 'ABANDONED';

export type ExtraType = 'WIDE' | 'NO_BALL' | 'BYE' | 'LEG_BYE' | 'PENALTY';

export type WicketType = 
  | 'BOWLED' 
  | 'CAUGHT' 
  | 'LBW' 
  | 'RUN_OUT' 
  | 'STUMPED' 
  | 'HIT_WICKET' 
  | 'HANDLED_BALL' 
  | 'OBSTRUCTING';

export interface Player {
  id: string;
  name: string;
  isCaptain?: boolean;
  avatarUrl?: string;
}

export interface BatterStats {
  playerId: string;
  playerName: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  isOut: boolean;
  dismissalType?: WicketType;
  bowlerName?: string;
  fielderName?: string;
  isOnStrike: boolean;
  isBatting: boolean;
}

export interface BowlerStats {
  playerId: string;
  playerName: string;
  overs: number; // formatted float e.g. 2.4 meaning 2 overs 4 balls
  ballsBowled: number; // total valid balls
  maidens: number;
  runsConceded: number;
  wickets: number;
  economy: number;
  wides: number;
  noBalls: number;
}

export interface Extras {
  wides: number;
  noBalls: number;
  byes: number;
  legByes: number;
  penalty: number;
  total: number;
}

export interface Wicket {
  id: string;
  batterId: string;
  batterName: string;
  bowlerId: string;
  bowlerName: string;
  wicketType: WicketType;
  fielderId?: string;
  fielderName?: string;
  deliveryNumber: number; // ball index in match
  overNumber: number;
  ballInOver: number;
  runsScored: number;
}

export interface Delivery {
  id: string;
  matchId: string;
  inningsNumber: 1 | 2;
  overNumber: number; // 0-indexed over (0 = over 1)
  ballInOver: number; // 1-indexed valid ball count (1..6)
  strikerId: string;
  strikerName: string;
  nonStrikerId: string;
  nonStrikerName: string;
  bowlerId: string;
  bowlerName: string;
  runsScored: number; // off the bat
  extraType?: ExtraType;
  extraRuns: number; // e.g. 1 for wide/nb, or byes
  isLegalDelivery: boolean; // false for WIDE / NO_BALL
  isBoundaryFour: boolean;
  isBoundarySix: boolean;
  wicket?: Wicket;
  commentary?: string;
  timestamp: number;
}

export interface Innings {
  id: string;
  matchId: string;
  inningsNumber: 1 | 2;
  battingTeamId: string;
  battingTeamName: string;
  bowlingTeamId: string;
  bowlingTeamName: string;
  totalRuns: number;
  totalWickets: number;
  oversBowled: number; // formatted (e.g. 3.2)
  validBallsBowled: number;
  extras: Extras;
  deliveries: Delivery[];
  batterStats: Record<string, BatterStats>; // playerId -> BatterStats
  bowlerStats: Record<string, BowlerStats>; // playerId -> BowlerStats
  currentStrikerId: string | null;
  currentNonStrikerId: string | null;
  currentBowlerId: string | null;
  isCompleted: boolean;
  targetRuns?: number; // set for 2nd innings
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  color?: string;
  players: Player[];
}

export interface TossResult {
  winnerTeamId: string;
  decision: 'BAT' | 'BOWL';
}

export interface Match {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  totalOvers: number;
  status: MatchStatus;
  teamA: Team;
  teamB: Team;
  toss?: TossResult;
  battingFirstTeamId?: string;
  bowlingFirstTeamId?: string;
  openingStrikerId?: string;
  openingNonStrikerId?: string;
  openingBowlerId?: string;
  firstInnings?: Innings;
  secondInnings?: Innings;
  currentInningsNumber: 1 | 2;
  winnerTeamId?: string | null;
  resultString?: string;
  location?: string;
}
