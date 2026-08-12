export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      players: {
        Row: {
          id: string
          owner_id: string | null
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id?: string | null
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['players']['Insert']>
      }
      teams: {
        Row: {
          id: string
          owner_id: string | null
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id?: string | null
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['teams']['Insert']>
      }
      team_players: {
        Row: {
          team_id: string
          player_id: string
          created_at: string
        }
        Insert: {
          team_id: string
          player_id: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['team_players']['Insert']>
      }
      matches: {
        Row: {
          id: string
          owner_id: string | null
          name: string
          team_a_id: string | null
          team_b_id: string | null
          team_a_name: string
          team_b_name: string
          overs: number
          status: 'setup' | 'live' | 'innings_break' | 'completed' | 'abandoned'
          batting_first_team_id: string | null
          winner_team_id: string | null
          result_type: 'runs' | 'wickets' | 'tie' | 'none'
          result_margin: string | null
          created_at: string
          started_at: string | null
          completed_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id?: string | null
          name: string
          team_a_id?: string | null
          team_b_id?: string | null
          team_a_name: string
          team_b_name: string
          overs: number
          status: 'setup' | 'live' | 'innings_break' | 'completed' | 'abandoned'
          batting_first_team_id?: string | null
          winner_team_id?: string | null
          result_type?: 'runs' | 'wickets' | 'tie' | 'none'
          result_margin?: string | null
          created_at?: string
          started_at?: string | null
          completed_at?: string | null
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['matches']['Insert']>
      }
      match_players: {
        Row: {
          id: string
          match_id: string
          team_id: string | null
          player_id: string | null
          display_name_snapshot: string
          created_at: string
        }
        Insert: {
          id?: string
          match_id: string
          team_id?: string | null
          player_id?: string | null
          display_name_snapshot: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['match_players']['Insert']>
      }
      innings: {
        Row: {
          id: string
          match_id: string
          innings_number: number
          batting_team_id: string
          bowling_team_id: string
          total_runs: number
          wickets: number
          legal_balls: number
          target: number | null
          status: 'in_progress' | 'completed'
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          match_id: string
          innings_number: number
          batting_team_id: string
          bowling_team_id: string
          total_runs?: number
          wickets?: number
          legal_balls?: number
          target?: number | null
          status?: 'in_progress' | 'completed'
          created_at?: string
          completed_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['innings']['Insert']>
      }
      deliveries: {
        Row: {
          id: string
          innings_id: string
          match_id: string
          delivery_index: number
          over_number: number
          ball_number: number
          striker_id: string
          non_striker_id: string
          bowler_id: string
          runs_batter: number
          runs_extras: number
          total_runs: number
          extra_type: string | null
          is_legal: boolean
          is_wicket: boolean
          wicket_type: string | null
          dismissed_player_id: string | null
          commentary: string | null
          created_at: string
        }
        Insert: {
          id?: string
          innings_id: string
          match_id: string
          delivery_index: number
          over_number: number
          ball_number: number
          striker_id: string
          non_striker_id: string
          bowler_id: string
          runs_batter?: number
          runs_extras?: number
          total_runs?: number
          extra_type?: string | null
          is_legal?: boolean
          is_wicket?: boolean
          wicket_type?: string | null
          dismissed_player_id?: string | null
          commentary?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['deliveries']['Insert']>
      }
    }
  }
}
