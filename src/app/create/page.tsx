'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Users,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Edit3,
  Check,
  Award,
  Sparkles,
  UserCheck,
  ShieldCheck,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { useMatchContext } from '@/lib/store/match-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

type Step = 1 | 2 | 3 | 4;

export default function CreateMatchPage() {
  const router = useRouter();
  const {
    draftMatch,
    updateDraftConfig,
    addPlayerToTeam,
    removePlayerFromTeam,
    updatePlayerName,
    initializeMatchFromDraft,
  } = useMatchContext();

  const [currentStep, setCurrentStep] = useState<Step>(1);

  // Local state for adding players
  const [newPlayerA, setNewPlayerA] = useState('');
  const [newPlayerB, setNewPlayerB] = useState('');
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Custom overs input
  const [customOversInput, setCustomOversInput] = useState(
    draftMatch.isCustomOvers ? String(draftMatch.totalOvers) : '15'
  );

  const stepTitles = {
    1: 'Match & Overs',
    2: 'Team Squads',
    3: 'Toss & Openers',
    4: 'Match Preview',
  };

  const handleSelectOvers = (overs: number | 'custom') => {
    if (overs === 'custom') {
      const parsed = parseInt(customOversInput, 10) || 15;
      updateDraftConfig({ totalOvers: parsed, isCustomOvers: true });
    } else {
      updateDraftConfig({ totalOvers: overs, isCustomOvers: false });
    }
  };

  const handleAddPlayer = (teamKey: 'teamA' | 'teamB') => {
    if (teamKey === 'teamA') {
      addPlayerToTeam('teamA', newPlayerA);
      setNewPlayerA('');
    } else {
      addPlayerToTeam('teamB', newPlayerB);
      setNewPlayerB('');
    }
  };

  const startEditingPlayer = (id: string, name: string) => {
    setEditingPlayerId(id);
    setEditingName(name);
  };

  const saveEditingPlayer = (teamKey: 'teamA' | 'teamB') => {
    if (editingPlayerId && editingName.trim()) {
      updatePlayerName(teamKey, editingPlayerId, editingName.trim());
    }
    setEditingPlayerId(null);
    setEditingName('');
  };

  // Toss Helpers
  const teamAId = 'team_a';
  const teamBId = 'team_b';
  const selectedTossWinner = draftMatch.tossWinnerTeamId || teamAId;
  const tossDecision = draftMatch.tossDecision || 'BAT';

  // Batting / Bowling First Team calculation
  let battingTeamName = draftMatch.teamAName;
  let bowlingTeamName = draftMatch.teamBName;
  let battingPlayers = draftMatch.teamAPlayers;
  let bowlingPlayers = draftMatch.teamBPlayers;

  if (
    (selectedTossWinner === teamAId && tossDecision === 'BOWL') ||
    (selectedTossWinner === teamBId && tossDecision === 'BAT')
  ) {
    battingTeamName = draftMatch.teamBName;
    bowlingTeamName = draftMatch.teamAName;
    battingPlayers = draftMatch.teamBPlayers;
    bowlingPlayers = draftMatch.teamAPlayers;
  }

  // Openers defaults
  const strikerId = draftMatch.openingStrikerId || battingPlayers[0]?.id || '';
  const nonStrikerId = draftMatch.openingNonStrikerId || battingPlayers[1]?.id || '';
  const bowlerId = draftMatch.openingBowlerId || bowlingPlayers[0]?.id || '';

  const handleStartMatch = () => {
    const match = initializeMatchFromDraft();
    router.push(`/match/${match.id}/scoring`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Progress Stepper */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-emerald-400" /> Match Setup
            </h2>
            <p className="text-xs text-gray-400">Step {currentStep} of 4: {stepTitles[currentStep]}</p>
          </div>
          <Badge variant="emerald" className="text-[10px]">
            Turf Cricket
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden p-0.5 border border-white/5">
          <div
            className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* STEP CONTENT CONTAINER */}
      <AnimatePresence mode="wait">
        {/* STEP 1: MATCH & OVERS */}
        {currentStep === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            <Card variant="glass" className="space-y-4">
              <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Match Details
              </h3>

              <Input
                label="Match Name"
                placeholder="e.g. Weekend Cup Final"
                value={draftMatch.name}
                onChange={(e) => updateDraftConfig({ name: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Team A Name"
                  placeholder="e.g. Royal Strikers"
                  value={draftMatch.teamAName}
                  onChange={(e) => updateDraftConfig({ teamAName: e.target.value })}
                />
                <Input
                  label="Team B Name"
                  placeholder="e.g. Turf Kings"
                  value={draftMatch.teamBName}
                  onChange={(e) => updateDraftConfig({ teamBName: e.target.value })}
                />
              </div>
            </Card>

            <Card variant="glass" className="space-y-4">
              <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> Overs Per Innings
              </h3>

              <div className="grid grid-cols-3 gap-2.5">
                {[6, 8, 10, 12].map((ov) => {
                  const isSelected = !draftMatch.isCustomOvers && draftMatch.totalOvers === ov;
                  return (
                    <button
                      key={ov}
                      onClick={() => handleSelectOvers(ov)}
                      className={`py-3 rounded-xl border text-center font-bold transition-all min-h-[48px] ${
                        isSelected
                          ? 'bg-emerald-500 text-gray-950 border-emerald-400 shadow-md shadow-emerald-500/30'
                          : 'bg-slate-900/60 border-white/10 text-gray-300 hover:bg-slate-800'
                      }`}
                    >
                      {ov} Overs
                    </button>
                  );
                })}

                {/* Custom Overs Option */}
                <button
                  onClick={() => handleSelectOvers('custom')}
                  className={`py-3 rounded-xl border text-center font-bold transition-all col-span-2 min-h-[48px] ${
                    draftMatch.isCustomOvers
                      ? 'bg-emerald-500 text-gray-950 border-emerald-400 shadow-md shadow-emerald-500/30'
                      : 'bg-slate-900/60 border-white/10 text-gray-300 hover:bg-slate-800'
                  }`}
                >
                  Custom Overs
                </button>
              </div>

              {draftMatch.isCustomOvers && (
                <div className="pt-2">
                  <Input
                    label="Enter Custom Overs"
                    type="number"
                    min="1"
                    max="50"
                    value={customOversInput}
                    onChange={(e) => {
                      setCustomOversInput(e.target.value);
                      const num = parseInt(e.target.value, 10);
                      if (num > 0) updateDraftConfig({ totalOvers: num });
                    }}
                  />
                </div>
              )}
            </Card>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              icon={ArrowRight}
              onClick={() => setCurrentStep(2)}
            >
              Continue to Team Setup
            </Button>
          </motion.div>
        )}

        {/* STEP 2: TEAM & PLAYER SETUP */}
        {currentStep === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            {/* Team A Roster */}
            <Card variant="glass" className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> {draftMatch.teamAName || 'Team A'} Squad
                </h3>
                <Badge variant="emerald">{draftMatch.teamAPlayers.length} Players</Badge>
              </div>

              {/* Player Input Form */}
              <div className="flex gap-2">
                <Input
                  placeholder="Add player name..."
                  value={newPlayerA}
                  onChange={(e) => setNewPlayerA(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer('teamA')}
                />
                <Button
                  variant="primary"
                  size="md"
                  icon={Plus}
                  onClick={() => handleAddPlayer('teamA')}
                >
                  Add
                </Button>
              </div>

              {/* Player List */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {draftMatch.teamAPlayers.map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/70 border border-white/5"
                  >
                    {editingPlayerId === p.id ? (
                      <div className="flex items-center gap-2 w-full pr-2">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="py-1 min-h-[36px]"
                        />
                        <button
                          onClick={() => saveEditingPlayer('teamA')}
                          className="p-2 rounded-lg bg-emerald-500 text-gray-950 font-bold"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm font-semibold text-white">
                          <span className="text-xs font-normal text-gray-500 mr-2">{idx + 1}.</span>
                          {p.name}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEditingPlayer(p.id, p.name)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-slate-800"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => removePlayerFromTeam('teamA', p.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-950/40"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Team B Roster */}
            <Card variant="glass" className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h3 className="text-sm font-bold text-blue-400 flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> {draftMatch.teamBName || 'Team B'} Squad
                </h3>
                <Badge variant="blue">{draftMatch.teamBPlayers.length} Players</Badge>
              </div>

              {/* Player Input Form */}
              <div className="flex gap-2">
                <Input
                  placeholder="Add player name..."
                  value={newPlayerB}
                  onChange={(e) => setNewPlayerB(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer('teamB')}
                />
                <Button
                  variant="primary"
                  size="md"
                  icon={Plus}
                  onClick={() => handleAddPlayer('teamB')}
                >
                  Add
                </Button>
              </div>

              {/* Player List */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {draftMatch.teamBPlayers.map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/70 border border-white/5"
                  >
                    {editingPlayerId === p.id ? (
                      <div className="flex items-center gap-2 w-full pr-2">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="py-1 min-h-[36px]"
                        />
                        <button
                          onClick={() => saveEditingPlayer('teamB')}
                          className="p-2 rounded-lg bg-emerald-500 text-gray-950 font-bold"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm font-semibold text-white">
                          <span className="text-xs font-normal text-gray-500 mr-2">{idx + 1}.</span>
                          {p.name}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEditingPlayer(p.id, p.name)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-slate-800"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => removePlayerFromTeam('teamB', p.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-950/40"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                variant="secondary"
                size="lg"
                icon={ArrowLeft}
                onClick={() => setCurrentStep(1)}
              >
                Back
              </Button>
              <Button
                variant="primary"
                size="lg"
                icon={ArrowRight}
                onClick={() => setCurrentStep(3)}
                disabled={draftMatch.teamAPlayers.length < 2 || draftMatch.teamBPlayers.length < 2}
              >
                Toss & Openers
              </Button>
            </div>
          </motion.div>
        )}

        {/* STEP 3: TOSS & OPENERS */}
        {currentStep === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            {/* Toss Winner & Decision */}
            <Card variant="glass" className="space-y-4">
              <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                <Award className="w-4 h-4" /> Toss Winner & Decision
              </h3>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase">Who won the toss?</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => updateDraftConfig({ tossWinnerTeamId: teamAId })}
                    className={`py-3 px-3 rounded-xl border text-center font-bold text-sm min-h-[48px] ${
                      selectedTossWinner === teamAId
                        ? 'bg-emerald-500 text-gray-950 border-emerald-400 shadow-md'
                        : 'bg-slate-900/60 border-white/10 text-gray-300'
                    }`}
                  >
                    {draftMatch.teamAName}
                  </button>
                  <button
                    onClick={() => updateDraftConfig({ tossWinnerTeamId: teamBId })}
                    className={`py-3 px-3 rounded-xl border text-center font-bold text-sm min-h-[48px] ${
                      selectedTossWinner === teamBId
                        ? 'bg-emerald-500 text-gray-950 border-emerald-400 shadow-md'
                        : 'bg-slate-900/60 border-white/10 text-gray-300'
                    }`}
                  >
                    {draftMatch.teamBName}
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <label className="text-xs font-semibold text-gray-400 uppercase">Selected to:</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => updateDraftConfig({ tossDecision: 'BAT' })}
                    className={`py-3 px-3 rounded-xl border text-center font-bold text-sm min-h-[48px] ${
                      tossDecision === 'BAT'
                        ? 'bg-emerald-500 text-gray-950 border-emerald-400 shadow-md'
                        : 'bg-slate-900/60 border-white/10 text-gray-300'
                    }`}
                  >
                    Bat First
                  </button>
                  <button
                    onClick={() => updateDraftConfig({ tossDecision: 'BOWL' })}
                    className={`py-3 px-3 rounded-xl border text-center font-bold text-sm min-h-[48px] ${
                      tossDecision === 'BOWL'
                        ? 'bg-emerald-500 text-gray-950 border-emerald-400 shadow-md'
                        : 'bg-slate-900/60 border-white/10 text-gray-300'
                    }`}
                  >
                    Bowl First
                  </button>
                </div>
              </div>
            </Card>

            {/* Select Openers */}
            <Card variant="glass" className="space-y-4">
              <div className="pb-2 border-b border-white/10">
                <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4" /> Select Opening Players
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Batting: <span className="text-white font-semibold">{battingTeamName}</span> | Bowling:{' '}
                  <span className="text-white font-semibold">{bowlingTeamName}</span>
                </p>
              </div>

              {/* Striker */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300">Opening Striker (*)</label>
                <select
                  value={strikerId}
                  onChange={(e) => updateDraftConfig({ openingStrikerId: e.target.value })}
                  className="w-full bg-[#161f30] border border-white/10 text-white rounded-xl py-3 px-4 text-sm min-h-[48px]"
                >
                  {battingPlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Non-Striker */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300">Opening Non-Striker (*)</label>
                <select
                  value={nonStrikerId}
                  onChange={(e) => updateDraftConfig({ openingNonStrikerId: e.target.value })}
                  className="w-full bg-[#161f30] border border-white/10 text-white rounded-xl py-3 px-4 text-sm min-h-[48px]"
                >
                  {battingPlayers
                    .filter((p) => p.id !== strikerId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Opening Bowler */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300">Opening Bowler (*)</label>
                <select
                  value={bowlerId}
                  onChange={(e) => updateDraftConfig({ openingBowlerId: e.target.value })}
                  className="w-full bg-[#161f30] border border-white/10 text-white rounded-xl py-3 px-4 text-sm min-h-[48px]"
                >
                  {bowlingPlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({bowlingTeamName})
                    </option>
                  ))}
                </select>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                variant="secondary"
                size="lg"
                icon={ArrowLeft}
                onClick={() => setCurrentStep(2)}
              >
                Back
              </Button>
              <Button
                variant="primary"
                size="lg"
                icon={ArrowRight}
                onClick={() => setCurrentStep(4)}
              >
                Match Preview
              </Button>
            </div>
          </motion.div>
        )}

        {/* STEP 4: MATCH PREVIEW */}
        {currentStep === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            <Card variant="highlight" className="space-y-5 p-5 border-emerald-500/40">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div>
                  <h3 className="text-lg font-black text-white">{draftMatch.name}</h3>
                  <p className="text-xs text-emerald-400 font-semibold mt-0.5">Match Ready to Begin</p>
                </div>
                <Badge variant="emerald">{draftMatch.totalOvers} Overs</Badge>
              </div>

              {/* Toss Result Badge */}
              <div className="bg-slate-900/80 p-3 rounded-xl border border-white/10 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <p className="text-xs text-gray-200">
                  <span className="font-bold text-white">
                    {selectedTossWinner === teamAId ? draftMatch.teamAName : draftMatch.teamBName}
                  </span>{' '}
                  won the toss and elected to <span className="font-bold text-emerald-400">{tossDecision}</span> first.
                </p>
              </div>

              {/* Batting / Bowling Squad Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5 space-y-1.5">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                    Batting First
                  </span>
                  <span className="text-sm font-black text-white block">{battingTeamName}</span>
                  <span className="text-xs text-gray-400 block">{battingPlayers.length} Players</span>
                </div>

                <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5 space-y-1.5">
                  <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block">
                    Bowling First
                  </span>
                  <span className="text-sm font-black text-white block">{bowlingTeamName}</span>
                  <span className="text-xs text-gray-400 block">{bowlingPlayers.length} Players</span>
                </div>
              </div>

              {/* Openers Confirmation */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-white/10 space-y-2">
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider pb-1 border-b border-white/5">
                  Opening Lineup
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Striker:</span>
                    <span className="font-bold text-emerald-400">
                      {battingPlayers.find((p) => p.id === strikerId)?.name || 'Striker'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Non-Striker:</span>
                    <span className="font-bold text-white">
                      {battingPlayers.find((p) => p.id === nonStrikerId)?.name || 'Non-Striker'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Opening Bowler:</span>
                    <span className="font-bold text-blue-400">
                      {bowlingPlayers.find((p) => p.id === bowlerId)?.name || 'Bowler'}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                variant="secondary"
                size="lg"
                icon={ArrowLeft}
                onClick={() => setCurrentStep(3)}
              >
                Edit Setup
              </Button>
              <Button
                variant="primary"
                size="xl"
                icon={CheckCircle2}
                onClick={handleStartMatch}
                className="shadow-emerald-500/40"
              >
                Start Match
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
