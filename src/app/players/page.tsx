'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Users, Plus, Trash2, ChevronRight, BarChart2 } from 'lucide-react';
import { useMatchContext } from '@/lib/store/match-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

export default function PlayersPage() {
  const { globalPlayers, addGlobalPlayer, deleteGlobalPlayer } = useMatchContext();
  const [newPlayerName, setNewPlayerName] = useState('');

  const handleAdd = () => {
    if (newPlayerName.trim()) {
      addGlobalPlayer(newPlayerName.trim());
      setNewPlayerName('');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" /> Player Directory
          </h2>
          <p className="text-xs text-gray-400">Save frequent turf players for quick selection</p>
        </div>
        <Badge variant="blue">{globalPlayers.length} Players</Badge>
      </div>

      {/* Add Player Input */}
      <Card variant="glass" className="space-y-3">
        <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
          Add New Player to Directory
        </label>
        <div className="flex gap-2">
          <Input
            placeholder="Enter player name (e.g. Rahul)..."
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <Button variant="primary" size="md" icon={Plus} onClick={handleAdd}>
            Add
          </Button>
        </div>
      </Card>

      {/* Players List */}
      <div className="space-y-2">
        {globalPlayers.length === 0 ? (
          <Card variant="glass" className="py-8 text-center text-gray-400 text-xs">
            No players in directory yet. Add players above.
          </Card>
        ) : (
          globalPlayers.map((player, idx) => (
            <Card
              key={player.id}
              variant="glass"
              className="p-3 flex items-center justify-between hover:border-purple-500/40 transition-colors group cursor-pointer"
            >
              <Link href={`/players/${player.id}`} className="flex-1 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-950/60 border border-purple-500/30 text-purple-400 font-bold flex items-center justify-center text-xs group-hover:scale-105 transition-transform">
                  #{idx + 1}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors flex items-center gap-1.5">
                    {player.name}
                    <BarChart2 className="w-3.5 h-3.5 text-purple-400 opacity-60 group-hover:opacity-100" />
                  </h4>
                  <span className="text-[10px] text-gray-400">View Career Stats</span>
                </div>
              </Link>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteGlobalPlayer(player.id);
                  }}
                  className="p-2 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                  title="Remove player from directory"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <Link href={`/players/${player.id}`}>
                  <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-purple-400 transition-colors" />
                </Link>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
