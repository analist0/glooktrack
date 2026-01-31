/**
 * Supabase Client - חיבור לקוח (צד דפדפן)
 */

import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

function getEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
  }
  return { supabaseUrl, supabaseKey };
}

export function getSupabaseClient() {
  if (client) return client;
  const { supabaseUrl, supabaseKey } = getEnv();
  client = createBrowserClient(supabaseUrl, supabaseKey);
  return client;
}
