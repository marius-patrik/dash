import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config";

let supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    if (!config.supabaseUrl || !config.supabaseServiceKey) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY are required. Set them in .env");
    }
    supabaseAdmin = createClient(config.supabaseUrl, config.supabaseServiceKey);
  }
  return supabaseAdmin;
}

export function createSupabaseClient(accessToken: string): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}
