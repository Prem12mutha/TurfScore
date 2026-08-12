import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

export function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}
