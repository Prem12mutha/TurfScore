/**
 * TurfScore Scoring Engine Tests
 * Run: npx tsx src/lib/cricket/__tests__/scoring-engine.test.ts
 */

import { recordDelivery, getCurrentOverDeliveries } from '../scoring-engine';
import { createInnings, formatOvers, calculateRunRate, calculateRequiredRunRate, checkInningsCompletion } from '../innings';
import { calculateMatchResult } from '../match-result';
import { Team, Innings, Match, Player } from '../types';

// Test helpers
let passCount = 0;
let failCount = 0;
const failures: string[] = [];

function assert(condition: boolean, message: string) {
  if (condition) {
    passCount++;
  } else {
    failCount++;
    failures.push(`FAIL: ${message}`);
    console.error(`  ❌ FAIL: ${message}`);
  }
}

function assertEqual(actual: any, expected: any, message: string) {
  const pass = actual === expected;
  if (!pass) {
    assert(false, `${message} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  } else {
    assert(true, message);
  }
}

// Setup fixtures
function createTestTeams(): { teamA: Team; teamB: Team } {
  const teamA: Team = {
    id: 'team_a',
    name: 'Strikers',
    shortName: 'STR',
    players: [
      { id: 'a1', name: 'Prem' },
      { id: 'a2', name: 'Rahul' },
      { id: 'a3', name: 'Amit' },
      { id: 'a4', name: 'Jay' },
      { id: 'a5', name: 'Karan' },
      { id: 'a6', name: 'Rohan' },
    ],
  };
  const teamB: Team = {
    id: 'team_b',
    name: 'Kings',
    shortName: 'KNG',
    players: [
      { id: 'b1', name: 'Vicky' },
      { id: 'b2', name: 'Sachin' },
      { id: 'b3', name: 'Virat' },
      { id: 'b4', name: 'Rohit' },
      { id: 'b5', name: 'Hardik' },
      { id: 'b6', name: 'Bumrah' },
    ],
  };
  return { teamA, teamB };
}

function createTestInnings(): Innings {
  const { teamA, teamB } = createTestTeams();
  return createInnings({
    matchId: 'test_match',
    inningsNumber: 1,
    battingTeam: teamA,
    bowlingTeam: teamB,
    openingStrikerId: 'a1',
    openingNonStrikerId: 'a2',
    openingBowlerId: 'b1',
  });
}

// ====== TESTS ======

console.log('\n🏏 TurfScore Scoring Engine Tests\n');
console.log('='.repeat(50));

// --- Test 1: Dot ball (0 runs) ---
console.log('\n📋 Test 1: Dot ball');
{
  const innings = createTestInnings();
  const result = recordDelivery({ innings, runsScored: 0 });
  assertEqual(result.totalRuns, 0, '0 runs: team score unchanged');
  assertEqual(result.validBallsBowled, 1, '0 runs: 1 legal ball');
  assertEqual(result.batterStats['a1'].runs, 0, '0 runs: batter 0 runs');
  assertEqual(result.batterStats['a1'].balls, 1, '0 runs: batter 1 ball faced');
  assertEqual(result.currentStrikerId, 'a1', '0 runs: strike unchanged');
  assertEqual(result.bowlerStats['b1'].ballsBowled, 1, '0 runs: bowler 1 ball');
}

// --- Test 2: 1 run (odd → strike changes) ---
console.log('\n📋 Test 2: 1 run');
{
  const innings = createTestInnings();
  const result = recordDelivery({ innings, runsScored: 1 });
  assertEqual(result.totalRuns, 1, '1 run: team score 1');
  assertEqual(result.batterStats['a1'].runs, 1, '1 run: batter 1 run');
  assertEqual(result.currentStrikerId, 'a2', '1 run: strike swapped to a2');
  assertEqual(result.currentNonStrikerId, 'a1', '1 run: non-striker is a1');
}

// --- Test 3: 2 runs (even → strike stays) ---
console.log('\n📋 Test 3: 2 runs');
{
  const innings = createTestInnings();
  const result = recordDelivery({ innings, runsScored: 2 });
  assertEqual(result.totalRuns, 2, '2 runs: team score 2');
  assertEqual(result.currentStrikerId, 'a1', '2 runs: strike stays on a1');
}

// --- Test 4: 3 runs (odd → strike changes) ---
console.log('\n📋 Test 4: 3 runs');
{
  const innings = createTestInnings();
  const result = recordDelivery({ innings, runsScored: 3 });
  assertEqual(result.totalRuns, 3, '3 runs: team score 3');
  assertEqual(result.currentStrikerId, 'a2', '3 runs: strike changes to a2');
  assertEqual(result.batterStats['a1'].runs, 3, '3 runs: batter credited 3');
}

// --- Test 5: FOUR ---
console.log('\n📋 Test 5: Four');
{
  const innings = createTestInnings();
  const result = recordDelivery({ innings, runsScored: 4 });
  assertEqual(result.totalRuns, 4, 'Four: team score 4');
  assertEqual(result.batterStats['a1'].fours, 1, 'Four: batter 1 four');
  assertEqual(result.currentStrikerId, 'a1', 'Four: strike stays (even)');
  assertEqual(result.deliveries[0].isBoundaryFour, true, 'Four: boundary flag set');
}

// --- Test 6: SIX ---
console.log('\n📋 Test 6: Six');
{
  const innings = createTestInnings();
  const result = recordDelivery({ innings, runsScored: 6 });
  assertEqual(result.totalRuns, 6, 'Six: team score 6');
  assertEqual(result.batterStats['a1'].sixes, 1, 'Six: batter 1 six');
  assertEqual(result.currentStrikerId, 'a1', 'Six: strike stays (even)');
  assertEqual(result.deliveries[0].isBoundarySix, true, 'Six: boundary flag set');
}

// --- Test 7: Wide +1 ---
console.log('\n📋 Test 7: Wide +1');
{
  const innings = createTestInnings();
  const result = recordDelivery({ innings, runsScored: 0, extraType: 'WIDE', extraRuns: 0 });
  assertEqual(result.totalRuns, 1, 'Wide: team +1');
  assertEqual(result.validBallsBowled, 0, 'Wide: NOT a legal delivery');
  assertEqual(result.extras.wides, 1, 'Wide: extras.wides = 1');
  assertEqual(result.batterStats['a1'].balls, 0, 'Wide: batter balls not incremented');
  assertEqual(result.bowlerStats['b1'].runsConceded, 1, 'Wide: bowler concedes 1');
  assertEqual(result.bowlerStats['b1'].ballsBowled, 0, 'Wide: bowler legal balls 0');
}

// --- Test 8: Wide + 2 overthrows ---
console.log('\n📋 Test 8: Wide + overthrows');
{
  const innings = createTestInnings();
  const result = recordDelivery({ innings, runsScored: 0, extraType: 'WIDE', extraRuns: 2 });
  assertEqual(result.totalRuns, 3, 'Wide+2: team +3');
  assertEqual(result.extras.wides, 3, 'Wide+2: extras.wides = 3');
  assertEqual(result.validBallsBowled, 0, 'Wide+2: still not legal');
}

// --- Test 9: No ball + 0 bat runs ---
console.log('\n📋 Test 9: No ball + 0 bat');
{
  const innings = createTestInnings();
  const result = recordDelivery({ innings, runsScored: 0, extraType: 'NO_BALL', extraRuns: 0 });
  assertEqual(result.totalRuns, 1, 'NB+0: team +1 (penalty only)');
  assertEqual(result.validBallsBowled, 0, 'NB: NOT a legal delivery');
  assertEqual(result.extras.noBalls, 1, 'NB: extras.noBalls = 1');
  assertEqual(result.batterStats['a1'].balls, 1, 'NB: batter ball counted (not wide)');
  assertEqual(result.bowlerStats['b1'].runsConceded, 1, 'NB+0: bowler concedes 1');
}

// --- Test 10: No ball + 4 bat runs ---
console.log('\n📋 Test 10: No ball + 4 bat');
{
  const innings = createTestInnings();
  const result = recordDelivery({ innings, runsScored: 4, extraType: 'NO_BALL', extraRuns: 0 });
  assertEqual(result.totalRuns, 5, 'NB+4: team +5 (1 penalty + 4 bat)');
  assertEqual(result.batterStats['a1'].runs, 4, 'NB+4: batter gets 4');
  assertEqual(result.batterStats['a1'].fours, 1, 'NB+4: batter fours incremented');
  assertEqual(result.bowlerStats['b1'].runsConceded, 5, 'NB+4: bowler concedes 5');
  assertEqual(result.validBallsBowled, 0, 'NB+4: not legal');
}

// --- Test 11: Bye 2 ---
console.log('\n📋 Test 11: Bye 2');
{
  const innings = createTestInnings();
  const result = recordDelivery({ innings, runsScored: 0, extraType: 'BYE', extraRuns: 2 });
  assertEqual(result.totalRuns, 2, 'Bye 2: team +2');
  assertEqual(result.batterStats['a1'].runs, 0, 'Bye 2: batter 0 runs');
  assertEqual(result.batterStats['a1'].balls, 1, 'Bye 2: batter 1 ball faced (legal)');
  assertEqual(result.validBallsBowled, 1, 'Bye 2: legal delivery');
  assertEqual(result.extras.byes, 2, 'Bye 2: extras.byes = 2');
  assertEqual(result.currentStrikerId, 'a1', 'Bye 2: even runs, strike stays');
}

// --- Test 12: Leg bye 1 ---
console.log('\n📋 Test 12: Leg bye 1');
{
  const innings = createTestInnings();
  const result = recordDelivery({ innings, runsScored: 0, extraType: 'LEG_BYE', extraRuns: 1 });
  assertEqual(result.totalRuns, 1, 'LB 1: team +1');
  assertEqual(result.batterStats['a1'].runs, 0, 'LB 1: batter 0 runs');
  assertEqual(result.validBallsBowled, 1, 'LB 1: legal delivery');
  assertEqual(result.extras.legByes, 1, 'LB 1: extras.legByes = 1');
  assertEqual(result.currentStrikerId, 'a2', 'LB 1: odd runs, strike changes');
}

// --- Test 13: Wicket (Bowled) ---
console.log('\n📋 Test 13: Wicket - Bowled');
{
  const innings = createTestInnings();
  const result = recordDelivery({
    innings,
    runsScored: 0,
    wicket: { dismissedBatterId: 'a1', wicketType: 'BOWLED' },
    newBatterId: 'a3',
  });
  assertEqual(result.totalWickets, 1, 'Wicket: 1 wicket');
  assertEqual(result.batterStats['a1'].isOut, true, 'Wicket: a1 dismissed');
  assertEqual(result.batterStats['a3'].isBatting, true, 'Wicket: a3 now batting');
  assertEqual(result.bowlerStats['b1'].wickets, 1, 'Wicket: bowler credited');
  assertEqual(result.validBallsBowled, 1, 'Wicket: legal delivery');
}

// --- Test 14: Run Out (not credited to bowler) ---
console.log('\n📋 Test 14: Run Out');
{
  const innings = createTestInnings();
  const result = recordDelivery({
    innings,
    runsScored: 1,
    wicket: { dismissedBatterId: 'a2', wicketType: 'RUN_OUT' },
    newBatterId: 'a3',
  });
  assertEqual(result.totalWickets, 1, 'Run out: 1 wicket');
  assertEqual(result.totalRuns, 1, 'Run out: 1 run scored');
  assertEqual(result.batterStats['a2'].isOut, true, 'Run out: a2 dismissed (non-striker)');
  assertEqual(result.bowlerStats['b1'].wickets, 0, 'Run out: NOT credited to bowler');
}

// --- Test 15: Run out with runs on striker ---
console.log('\n📋 Test 15: Run Out with runs on striker');
{
  const innings = createTestInnings();
  const result = recordDelivery({
    innings,
    runsScored: 2,
    wicket: { dismissedBatterId: 'a1', wicketType: 'RUN_OUT' },
    newBatterId: 'a3',
  });
  assertEqual(result.totalRuns, 2, 'RO+2: team +2 runs');
  assertEqual(result.batterStats['a1'].runs, 2, 'RO+2: dismissed batter credited runs');
  assertEqual(result.batterStats['a1'].isOut, true, 'RO+2: a1 out');
}

// --- Test 16: End of over (6 legal deliveries → strike swaps) ---
console.log('\n📋 Test 16: End of over');
{
  let innings = createTestInnings();
  // Bowl 5 dot balls
  for (let i = 0; i < 5; i++) {
    innings = recordDelivery({ innings, runsScored: 0 });
  }
  assertEqual(innings.currentStrikerId, 'a1', 'After 5 dots: striker still a1');
  // 6th ball - dot
  innings = recordDelivery({ innings, runsScored: 0 });
  assertEqual(innings.validBallsBowled, 6, 'After 6 dots: 6 valid balls');
  assertEqual(innings.currentStrikerId, 'a2', 'End of over: strike swaps to a2');
  assertEqual(innings.currentNonStrikerId, 'a1', 'End of over: a1 becomes non-striker');
}

// --- Test 17: Wide followed by legal delivery ---
console.log('\n📋 Test 17: Wide then legal');
{
  let innings = createTestInnings();
  innings = recordDelivery({ innings, runsScored: 0, extraType: 'WIDE', extraRuns: 0 });
  assertEqual(innings.validBallsBowled, 0, 'Wide: 0 legal balls');
  assertEqual(innings.totalRuns, 1, 'Wide: 1 run');
  innings = recordDelivery({ innings, runsScored: 2 });
  assertEqual(innings.validBallsBowled, 1, 'Legal after wide: 1 legal ball');
  assertEqual(innings.totalRuns, 3, 'Total: 3');
}

// --- Test 18: No-ball followed by legal delivery ---
console.log('\n📋 Test 18: NB then legal');
{
  let innings = createTestInnings();
  innings = recordDelivery({ innings, runsScored: 0, extraType: 'NO_BALL', extraRuns: 0 });
  assertEqual(innings.validBallsBowled, 0, 'NB: 0 legal balls');
  innings = recordDelivery({ innings, runsScored: 1 });
  assertEqual(innings.validBallsBowled, 1, 'Legal after NB: 1 legal ball');
}

// --- Test 19: Innings end (all overs) ---
console.log('\n📋 Test 19: Innings end - all overs');
{
  let innings = createTestInnings();
  // Bowl 36 dots (6 overs of 6 balls each)
  for (let i = 0; i < 36; i++) {
    innings = recordDelivery({ innings, runsScored: 0 });
  }
  const isComplete = checkInningsCompletion(innings, 6, 6);
  assert(isComplete, 'Innings complete after 6 overs (36 balls)');
}

// --- Test 20: Innings end (all out) ---
console.log('\n📋 Test 20: Innings end - all out');
{
  let innings = createTestInnings();
  // Dismiss 5 batters (squad of 6, so 5 wickets = all out)
  const batters = ['a1', 'a2', 'a3', 'a4', 'a5'];
  const replacements = ['a2', 'a3', 'a4', 'a5', 'a6'];
  for (let i = 0; i < 5; i++) {
    const currentStriker = innings.currentStrikerId!;
    const currentNonStriker = innings.currentNonStrikerId!;
    // Find next available batter
    const nextBatter = innings.batterStats[replacements[i]]?.isOut ? undefined : replacements[i];
    innings = recordDelivery({
      innings,
      runsScored: 0,
      wicket: { dismissedBatterId: currentStriker, wicketType: 'BOWLED' },
      newBatterId: nextBatter,
    });
  }
  const isComplete = checkInningsCompletion(innings, 6, 6);
  assert(isComplete, 'Innings complete: all out (5 wickets for 6-player squad)');
}

// --- Test 21: Target reached (2nd innings) ---
console.log('\n📋 Test 21: Target reached');
{
  const { teamA, teamB } = createTestTeams();
  let innings = createInnings({
    matchId: 'test_2nd',
    inningsNumber: 2,
    battingTeam: teamB,
    bowlingTeam: teamA,
    openingStrikerId: 'b1',
    openingNonStrikerId: 'b2',
    openingBowlerId: 'a1',
    targetRuns: 50,
  });
  // Score exactly 50 (target)
  for (let i = 0; i < 8; i++) {
    innings = recordDelivery({ innings, runsScored: 6 });
  }
  innings = recordDelivery({ innings, runsScored: 2 });
  assertEqual(innings.totalRuns, 50, 'Scored 50 to match target');
  const isComplete = checkInningsCompletion(innings, 6, 6);
  assert(isComplete, 'Target reached: innings complete');
}

// --- Test 22: Match tied ---
console.log('\n📋 Test 22: Match tied');
{
  const { teamA, teamB } = createTestTeams();
  const firstInnings: Innings = {
    ...createInnings({ matchId: 'tie_test', inningsNumber: 1, battingTeam: teamA, bowlingTeam: teamB, openingStrikerId: 'a1', openingNonStrikerId: 'a2', openingBowlerId: 'b1' }),
    totalRuns: 80,
    isCompleted: true,
    validBallsBowled: 36,
  };
  const secondInnings: Innings = {
    ...createInnings({ matchId: 'tie_test', inningsNumber: 2, battingTeam: teamB, bowlingTeam: teamA, openingStrikerId: 'b1', openingNonStrikerId: 'b2', openingBowlerId: 'a1', targetRuns: 81 }),
    totalRuns: 80,
    isCompleted: true,
    validBallsBowled: 36,
  };
  const match: Match = {
    id: 'tie_test', name: 'Tie Test', createdAt: Date.now(), updatedAt: Date.now(),
    totalOvers: 6, status: 'COMPLETED', teamA, teamB,
    battingFirstTeamId: 'team_a', bowlingFirstTeamId: 'team_b',
    currentInningsNumber: 2, firstInnings, secondInnings,
  };
  const result = calculateMatchResult(match);
  assert(result.isTie, 'Match tied: both scores equal');
  assert(result.resultString.includes('Tied'), 'Result string says tied');
}

// --- Test 23: Run rate calculation ---
console.log('\n📋 Test 23: Run rate');
{
  const crr = calculateRunRate(48, 30); // 48 runs in 30 balls = 5 overs = 9.6
  assertEqual(crr, 9.6, 'CRR: 48 in 30 balls = 9.6');
}

// --- Test 24: Required run rate ---
console.log('\n📋 Test 24: Required run rate');
{
  const rrr = calculateRequiredRunRate(100, 40, 10, 30); // need 60 from 30 balls = 5 overs = 12
  assertEqual(rrr, 12, 'RRR: need 60 in 30 balls = 12');
}

// --- Test 25: Format overs ---
console.log('\n📋 Test 25: Format overs');
{
  assertEqual(formatOvers(0), 0, 'formatOvers(0) = 0');
  assertEqual(formatOvers(3), 0.3, 'formatOvers(3) = 0.3');
  assertEqual(formatOvers(6), 1, 'formatOvers(6) = 1');
  assertEqual(formatOvers(14), 2.2, 'formatOvers(14) = 2.2');
  assertEqual(formatOvers(36), 6, 'formatOvers(36) = 6');
}

// --- Test 26: Wicket + runs (run out on a 2) ---
console.log('\n📋 Test 26: Wicket with runs');
{
  const innings = createTestInnings();
  const result = recordDelivery({
    innings,
    runsScored: 2,
    wicket: { dismissedBatterId: 'a2', wicketType: 'RUN_OUT' },
    newBatterId: 'a3',
  });
  assertEqual(result.totalRuns, 2, 'RO+2: 2 runs total');
  assertEqual(result.totalWickets, 1, 'RO+2: 1 wicket');
  assertEqual(result.batterStats['a1'].runs, 2, 'RO+2: striker gets runs');
  assertEqual(result.batterStats['a2'].isOut, true, 'RO+2: non-striker out');
}

// --- Test 27: getCurrentOverDeliveries ---
console.log('\n📋 Test 27: Current over deliveries');
{
  let innings = createTestInnings();
  innings = recordDelivery({ innings, runsScored: 1 });
  innings = recordDelivery({ innings, runsScored: 4 });
  innings = recordDelivery({ innings, runsScored: 0, extraType: 'WIDE', extraRuns: 0 });
  innings = recordDelivery({ innings, runsScored: 0 });
  const currentOver = getCurrentOverDeliveries(innings);
  assertEqual(currentOver.length, 4, 'Current over: 4 deliveries (including wide)');
}

// ====== RESULTS ======
console.log('\n' + '='.repeat(50));
console.log(`\n✅ Passed: ${passCount}`);
console.log(`❌ Failed: ${failCount}`);
if (failures.length > 0) {
  console.log('\nFailures:');
  failures.forEach((f) => console.log(`  ${f}`));
}
console.log('');
process.exit(failCount > 0 ? 1 : 0);
