// Supabase client for ViP Yemen platform.
// Usage: import { supabase } from "@/lib/supabase";
// The client is initialized lazily so it never crashes the app when the
// env variables are missing (e.g. during local dev without Supabase).
import { createClient } from "@supabase/supabase-js";

// Lazily-initialized singleton. Env vars are read at call time so the
// build can include the client code without failing when the vars are
// not yet available.
let _client: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (_client) return _client;
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
  if (!url || !anonKey) {
    console.warn("[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing — Supabase client unavailable.");
    return _client as unknown as ReturnType<typeof createClient>;
  }
  _client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return _client;
}

export const supabase = {
  get client() {
    return getSupabaseClient();
  },
  // Shorthand helpers mirroring the official client surface.
  from(table: string) {
    const c = getSupabaseClient();
    if (!c) throw new Error("[supabase] client not initialized — environment variables missing.");
    return c.from(table);
  },
};
