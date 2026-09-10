/**
 * Supabase client for ViP Yemen platform.
 *
 * Usage: import { supabase } from "@/lib/supabase";
 *
 * This client is initialized lazily so it never crashes the app when the
 * environment variables are missing (e.g. during local dev without Supabase).
 *
 * Features:
 * - Lazy singleton initialization
 * - Graceful degradation when env vars missing
 * - Type-safe query helpers
 * - Error logging (dev only)
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Environment variables read dynamically to avoid Vite tree-shaking.
const SUPABASE_URL_KEY = "VITE_SUPABASE_URL";
const SUPABASE_ANON_KEY_KEY = "VITE_SUPABASE_ANON_KEY";

function readEnv(name: string): string {
  const env = import.meta.env as unknown as Record<string, string | undefined>;
  return env[name]?.trim() ?? "";
}

// Lazily-initialized singleton.
let _client: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (_client) return _client;

  const url = readEnv(SUPABASE_URL_KEY);
  const anonKey = readEnv(SUPABASE_ANON_KEY_KEY);

  if (!url || !anonKey) {
    if (import.meta.env.DEV) {
      console.warn(
        "[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing — Supabase client unavailable."
      );
    }
    return null;
  }

  try {
    _client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
      db: {
        schema: "public",
      },
      global: {
        headers: {
          "x-app-name": "vip-yemen",
          "x-app-version": readEnv("VITE_APP_VERSION") || "6.4.1",
        },
      },
    });

    if (import.meta.env.DEV) {
      console.log("[supabase] Client initialized:", url);
    }

    return _client;
  } catch (error) {
    console.error("[supabase] Failed to initialize client:", error);
    return null;
  }
}

/**
 * Supabase client wrapper with convenience methods.
 * All methods return null/empty results when the client is unavailable.
 */
export const supabase = {
  /** Get the underlying Supabase client (null if not configured). */
  get client(): SupabaseClient | null {
    return getSupabaseClient();
  },

  /** Check if Supabase is configured and available. */
  get isAvailable(): boolean {
    return getSupabaseClient() !== null;
  },

  /**
   * Query a table. Returns null if Supabase is unavailable.
   * Example: const data = await supabase.query("submissions", q => q.select("*").eq("status", "published"));
   */
  async query<T = unknown>(
    table: string,
    queryFn: (builder: ReturnType<SupabaseClient["from"]>) => any
  ): Promise<T[] | null> {
    const client = getSupabaseClient();
    if (!client) return null;
    try {
      const { data, error } = await queryFn(client.from(table));
      if (error) {
        console.error(`[supabase] Query error on ${table}:`, error.message);
        return null;
      }
      return (data as T[]) ?? [];
    } catch (err) {
      console.error(`[supabase] Query exception on ${table}:`, err);
      return null;
    }
  },

  /**
   * Insert a row. Returns the inserted row or null.
   */
  async insert<T = unknown>(
    table: string,
    row: Record<string, unknown>
  ): Promise<T | null> {
    const client = getSupabaseClient();
    if (!client) return null;
    try {
      const { data, error } = await client
        .from(table)
        .insert(row)
        .select()
        .single();
      if (error) {
        console.error(`[supabase] Insert error on ${table}:`, error.message);
        return null;
      }
      return data as T;
    } catch (err) {
      console.error(`[supabase] Insert exception on ${table}:`, err);
      return null;
    }
  },

  /**
   * Update rows. Returns the updated rows or null.
   */
  async update<T = unknown>(
    table: string,
    updates: Record<string, unknown>,
    match: Record<string, unknown>
  ): Promise<T[] | null> {
    const client = getSupabaseClient();
    if (!client) return null;
    try {
      const { data, error } = await client
        .from(table)
        .update(updates)
        .match(match)
        .select();
      if (error) {
        console.error(`[supabase] Update error on ${table}:`, error.message);
        return null;
      }
      return (data as T[]) ?? [];
    } catch (err) {
      console.error(`[supabase] Update exception on ${table}:`, err);
      return null;
    }
  },

  /**
   * Delete rows. Returns the deleted rows or null.
   */
  async remove<T = unknown>(
    table: string,
    match: Record<string, unknown>
  ): Promise<T[] | null> {
    const client = getSupabaseClient();
    if (!client) return null;
    try {
      const { data, error } = await client
        .from(table)
        .delete()
        .match(match)
        .select();
      if (error) {
        console.error(`[supabase] Delete error on ${table}:`, error.message);
        return null;
      }
      return (data as T[]) ?? [];
    } catch (err) {
      console.error(`[supabase] Delete exception on ${table}:`, err);
      return null;
    }
  },

  /**
   * Full-text search across submissions.
   */
  async searchSubmissions(query: string, limit = 20): Promise<any[] | null> {
    const client = getSupabaseClient();
    if (!client) return null;
    try {
      const { data, error } = await client
        .from("submissions")
        .select("*")
        .eq("status", "published")
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,full_name.ilike.%${query}%`)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) {
        console.error("[supabase] Search error:", error.message);
        return null;
      }
      return data ?? [];
    } catch (err) {
      console.error("[supabase] Search exception:", err);
      return null;
    }
  },

  /**
   * Get platform statistics.
   */
  async getStats(): Promise<Record<string, number> | null> {
    const client = getSupabaseClient();
    if (!client) return null;
    try {
      const [submissions, ads, offers, releases] = await Promise.all([
        client.from("submissions").select("id", { count: "exact", head: true }),
        client.from("ads").select("id", { count: "exact", head: true }).eq("status", "active"),
        client.from("offers").select("id", { count: "exact", head: true }).eq("status", "published"),
        client.from("releases").select("id", { count: "exact", head: true }),
      ]);
      return {
        submissions: submissions.count ?? 0,
        ads: ads.count ?? 0,
        offers: offers.count ?? 0,
        releases: releases.count ?? 0,
      };
    } catch (err) {
      console.error("[supabase] Stats exception:", err);
      return null;
    }
  },
};