import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabaseInstance = null;

export const supabase = (() => {
  if (supabaseInstance) return supabaseInstance;
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseInstance;
})();