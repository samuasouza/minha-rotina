import "server-only"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { AppDatabase } from "@/types/app-database"
import { getSupabaseEnv } from "@/lib/supabase/env"

export async function createClient() {
  const env = getSupabaseEnv()
  if (!env) {
    throw new Error("supabase_not_configured")
  }

  const cookieStore = await cookies()

  return createServerClient<AppDatabase>(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Em Server Components o proxy é quem grava os cookies atualizados.
        }
      },
    },
  })
}
