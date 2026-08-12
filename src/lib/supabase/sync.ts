import { supabase, isSupabaseConfigured } from './client';
import { ensureAnonymousSession } from './auth';
import { Delivery, Match, Innings } from '../cricket/types';

const PENDING_DELIVERIES_KEY = 'turfscore_pending_deliveries_v1';

export interface PendingDeliveryRecord {
  id: string;
  inningsId: string;
  matchId: string;
  deliveryIndex: number;
  overNumber: number;
  ballNumber: number;
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  runsBatter: number;
  runsExtras: number;
  totalRuns: number;
  extraType?: string;
  isLegal: boolean;
  isWicket: boolean;
  wicketType?: string;
  dismissedPlayerId?: string;
  commentary?: string;
  createdAt: string;
}

/**
 * Gets pending unsynchronized deliveries from LocalStorage.
 */
export function getPendingDeliveries(): PendingDeliveryRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(PENDING_DELIVERIES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Failed reading pending deliveries:', err);
    return [];
  }
}

/**
 * Saves pending deliveries queue to LocalStorage.
 */
export function savePendingDeliveries(pending: PendingDeliveryRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PENDING_DELIVERIES_KEY, JSON.stringify(pending));
  } catch (err) {
    console.error('Failed saving pending deliveries:', err);
  }
}

/**
 * Enqueues a delivery to pending queue and attempts background sync to Supabase.
 */
export async function queueAndSyncDelivery(delivery: Delivery, deliveryIndex: number): Promise<void> {
  const record: PendingDeliveryRecord = {
    id: delivery.id,
    inningsId: `inn_${delivery.matchId}_${delivery.inningsNumber}`,
    matchId: delivery.matchId,
    deliveryIndex,
    overNumber: delivery.overNumber,
    ballNumber: delivery.ballInOver,
    strikerId: delivery.strikerId,
    nonStrikerId: delivery.nonStrikerId,
    bowlerId: delivery.bowlerId,
    runsBatter: delivery.runsScored,
    runsExtras: delivery.extraRuns,
    totalRuns: delivery.runsScored + delivery.extraRuns + (delivery.extraType === 'WIDE' || delivery.extraType === 'NO_BALL' ? 1 : 0),
    extraType: delivery.extraType,
    isLegal: delivery.isLegalDelivery,
    isWicket: Boolean(delivery.wicket),
    wicketType: delivery.wicket?.wicketType,
    dismissedPlayerId: delivery.wicket?.batterId,
    commentary: delivery.commentary,
    createdAt: new Date(delivery.timestamp).toISOString(),
  };

  const pending = getPendingDeliveries();
  // Prevent duplicates
  if (!pending.some((p) => p.id === record.id)) {
    pending.push(record);
    savePendingDeliveries(pending);
  }

  // Attempt sync
  await flushPendingDeliveries();
}

/**
 * Flushes pending deliveries to Supabase database.
 */
export async function flushPendingDeliveries(): Promise<void> {
  if (!isSupabaseConfigured) return;

  const pending = getPendingDeliveries();
  if (pending.length === 0) return;

  try {
    await ensureAnonymousSession();

    // Map to DB Schema
    const rows = pending.map((p) => ({
      id: p.id,
      innings_id: p.inningsId,
      match_id: p.matchId,
      delivery_index: p.deliveryIndex,
      over_number: p.overNumber,
      ball_number: p.ballNumber,
      striker_id: p.strikerId,
      non_striker_id: p.nonStrikerId,
      bowler_id: p.bowlerId,
      runs_batter: p.runsBatter,
      runs_extras: p.runsExtras,
      total_runs: p.totalRuns,
      extra_type: p.extraType || null,
      is_legal: p.isLegal,
      is_wicket: p.isWicket,
      wicket_type: p.wicketType || null,
      dismissed_player_id: p.dismissedPlayerId || null,
      commentary: p.commentary || null,
      created_at: p.createdAt,
    }));

    const client = supabase as any;
    const { error } = await client.from('deliveries').upsert(rows, { onConflict: 'id' });

    if (!error) {
      // Clear synced items
      savePendingDeliveries([]);
    } else {
      console.warn('Delivery sync deferred due to network/Supabase response:', error.message);
    }
  } catch (err) {
    console.warn('Network offline during delivery sync, keeping local queue:', err);
  }
}

/**
 * Persists match setup and player snapshots to Supabase.
 */
export async function syncMatchToSupabase(match: Match): Promise<void> {
  if (!isSupabaseConfigured) return;

  try {
    const ownerId = await ensureAnonymousSession();
    const client = supabase as any;

    // 1. Sync Match Record
    const matchRow = {
      id: match.id,
      owner_id: ownerId,
      name: match.name,
      team_a_id: match.teamA.id,
      team_b_id: match.teamB.id,
      team_a_name: match.teamA.name,
      team_b_name: match.teamB.name,
      overs: match.totalOvers,
      status: match.status.toLowerCase() === 'in_progress' ? 'live' : match.status.toLowerCase(),
      batting_first_team_id: match.battingFirstTeamId || null,
      winner_team_id: match.winnerTeamId || null,
      result_type: match.resultString?.includes('runs')
        ? 'runs'
        : match.resultString?.includes('wickets')
        ? 'wickets'
        : match.resultString?.includes('Tied')
        ? 'tie'
        : 'none',
      result_margin: match.resultString || null,
      started_at: new Date(match.createdAt).toISOString(),
      completed_at: match.status === 'COMPLETED' ? new Date(match.updatedAt).toISOString() : null,
      updated_at: new Date(match.updatedAt).toISOString(),
    };

    await client.from('matches').upsert([matchRow], { onConflict: 'id' });

    // 2. Sync Match Players Snapshots
    const matchPlayerRows: any[] = [];
    match.teamA.players.forEach((p) => {
      matchPlayerRows.push({
        id: `mp_${match.id}_${p.id}`,
        match_id: match.id,
        team_id: match.teamA.id,
        player_id: p.id,
        display_name_snapshot: p.name,
      });
    });
    match.teamB.players.forEach((p) => {
      matchPlayerRows.push({
        id: `mp_${match.id}_${p.id}`,
        match_id: match.id,
        team_id: match.teamB.id,
        player_id: p.id,
        display_name_snapshot: p.name,
      });
    });

    if (matchPlayerRows.length > 0) {
      await client.from('match_players').upsert(matchPlayerRows, { onConflict: 'id' });
    }

    // 3. Sync Innings Records
    const inningsRows: any[] = [];
    if (match.firstInnings) {
      inningsRows.push({
        id: match.firstInnings.id,
        match_id: match.id,
        innings_number: 1,
        batting_team_id: match.firstInnings.battingTeamId,
        bowling_team_id: match.firstInnings.bowlingTeamId,
        total_runs: match.firstInnings.totalRuns,
        wickets: match.firstInnings.totalWickets,
        legal_balls: match.firstInnings.validBallsBowled,
        target: match.firstInnings.targetRuns || null,
        status: match.firstInnings.isCompleted ? 'completed' : 'in_progress',
        completed_at: match.firstInnings.isCompleted ? new Date().toISOString() : null,
      });
    }
    if (match.secondInnings) {
      inningsRows.push({
        id: match.secondInnings.id,
        match_id: match.id,
        innings_number: 2,
        batting_team_id: match.secondInnings.battingTeamId,
        bowling_team_id: match.secondInnings.bowlingTeamId,
        total_runs: match.secondInnings.totalRuns,
        wickets: match.secondInnings.totalWickets,
        legal_balls: match.secondInnings.validBallsBowled,
        target: match.secondInnings.targetRuns || null,
        status: match.secondInnings.isCompleted ? 'completed' : 'in_progress',
        completed_at: match.secondInnings.isCompleted ? new Date().toISOString() : null,
      });
    }

    if (inningsRows.length > 0) {
      await client.from('innings').upsert(inningsRows, { onConflict: 'id' });
    }
  } catch (err) {
    console.warn('Match sync deferring to local storage:', err);
  }
}
