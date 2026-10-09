import { createBrowserClient } from "@supabase/ssr"
import type { AppDatabase } from "@/types/app-database"
import { getSupabaseEnv } from "@/lib/supabase/env"

export function createClient() {
  const env = getSupabaseEnv()
  if (!env) {
    throw new Error("supabase_not_configured")
  }

  return createBrowserClient<AppDatabase>(env.url, env.publishableKey)
}
