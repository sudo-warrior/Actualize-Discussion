import { createClient } from '@supabase/supabase-js';

type RuntimeEnv = {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
};

const runtimeEnv = (globalThis as unknown as { __ENV__?: RuntimeEnv }).__ENV__ ?? {};
const supabaseUrl = runtimeEnv.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = runtimeEnv.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables (runtime or build)');
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
