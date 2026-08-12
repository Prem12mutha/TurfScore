-- =========================================================
-- TURFSCORE — SUPABASE DATABASE SCHEMA & MIGRATION (PHASE 3)
-- =========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------
-- 1. PROFILES
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 2. PLAYERS (Personal player directory)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.players (
  id TEXT PRIMARY KEY DEFAULT ('p_' || gen_random_uuid()),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 3. TEAMS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teams (
  id TEXT PRIMARY KEY DEFAULT ('team_' || gen_random_uuid()),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 4. TEAM_PLAYERS (Many-to-Many junction)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.team_players (
  team_id TEXT REFERENCES public.teams(id) ON DELETE CASCADE,
  player_id TEXT REFERENCES public.players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (team_id, player_id)
);

-- ---------------------------------------------------------
-- 5. MATCHES
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.matches (
  id TEXT PRIMARY KEY DEFAULT ('match_' || gen_random_uuid()),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  team_a_id TEXT REFERENCES public.teams(id) ON DELETE SET NULL,
  team_b_id TEXT REFERENCES public.teams(id) ON DELETE SET NULL,
  team_a_name TEXT NOT NULL,
  team_b_name TEXT NOT NULL,
  overs INT NOT NULL DEFAULT 8,
  status TEXT NOT NULL DEFAULT 'setup' CHECK (status IN ('setup', 'live', 'innings_break', 'completed', 'abandoned')),
  batting_first_team_id TEXT,
  winner_team_id TEXT,
  result_type TEXT DEFAULT 'none' CHECK (result_type IN ('runs', 'wickets', 'tie', 'none')),
  result_margin TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 6. MATCH_PLAYERS (Snapshot of players per match)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.match_players (
  id TEXT PRIMARY KEY DEFAULT ('mp_' || gen_random_uuid()),
  match_id TEXT REFERENCES public.matches(id) ON DELETE CASCADE,
  team_id TEXT,
  player_id TEXT,
  display_name_snapshot TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 7. INNINGS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.innings (
  id TEXT PRIMARY KEY DEFAULT ('inn_' || gen_random_uuid()),
  match_id TEXT REFERENCES public.matches(id) ON DELETE CASCADE,
  innings_number INT NOT NULL CHECK (innings_number IN (1, 2)),
  batting_team_id TEXT NOT NULL,
  bowling_team_id TEXT NOT NULL,
  total_runs INT NOT NULL DEFAULT 0,
  wickets INT NOT NULL DEFAULT 0,
  legal_balls INT NOT NULL DEFAULT 0,
  target INT,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ---------------------------------------------------------
-- 8. DELIVERIES
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deliveries (
  id TEXT PRIMARY KEY DEFAULT ('del_' || gen_random_uuid()),
  innings_id TEXT REFERENCES public.innings(id) ON DELETE CASCADE,
  match_id TEXT REFERENCES public.matches(id) ON DELETE CASCADE,
  delivery_index INT NOT NULL, -- Preserves exact ball sequence
  over_number INT NOT NULL,
  ball_number INT NOT NULL,
  striker_id TEXT NOT NULL,
  non_striker_id TEXT NOT NULL,
  bowler_id TEXT NOT NULL,
  runs_batter INT NOT NULL DEFAULT 0,
  runs_extras INT NOT NULL DEFAULT 0,
  total_runs INT NOT NULL DEFAULT 0,
  extra_type TEXT CHECK (extra_type IN ('WIDE', 'NO_BALL', 'BYE', 'LEG_BYE', 'PENALTY')),
  is_legal BOOLEAN NOT NULL DEFAULT TRUE,
  is_wicket BOOLEAN NOT NULL DEFAULT FALSE,
  wicket_type TEXT,
  dismissed_player_id TEXT,
  commentary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- INDEXES FOR FAST QUERYING
-- ---------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_players_owner ON public.players(owner_id);
CREATE INDEX IF NOT EXISTS idx_matches_owner ON public.matches(owner_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_innings ON public.deliveries(innings_id, delivery_index);
CREATE INDEX IF NOT EXISTS idx_deliveries_match ON public.deliveries(match_id);
CREATE INDEX IF NOT EXISTS idx_match_players_match ON public.match_players(match_id);

-- ---------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ---------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.innings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- Profiles: Allow users to read/update their own profile
CREATE POLICY "Users can manage own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- Players: Owner full access
CREATE POLICY "Users can manage own players" ON public.players
  FOR ALL USING (owner_id = auth.uid());

-- Teams: Owner full access
CREATE POLICY "Users can manage own teams" ON public.teams
  FOR ALL USING (owner_id = auth.uid());

-- Team Players: Access via team owner
CREATE POLICY "Users can manage own team_players" ON public.team_players
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_players.team_id AND t.owner_id = auth.uid()
    )
  );

-- Matches: Owner full access
CREATE POLICY "Users can manage own matches" ON public.matches
  FOR ALL USING (owner_id = auth.uid());

-- Match Players: Access via match owner
CREATE POLICY "Users can manage own match_players" ON public.match_players
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_players.match_id AND m.owner_id = auth.uid()
    )
  );

-- Innings: Access via match owner
CREATE POLICY "Users can manage own innings" ON public.innings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = innings.match_id AND m.owner_id = auth.uid()
    )
  );

-- Deliveries: Access via match owner
CREATE POLICY "Users can manage own deliveries" ON public.deliveries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = deliveries.match_id AND m.owner_id = auth.uid()
    )
  );
