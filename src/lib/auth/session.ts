import "server-only"

import { createClient } from "@/lib/supabase/server"
import { getSupabaseEnv } from "@/lib/supabase/env"

export type AuthContext =
  | { status: "unconfigured" }
  | { status: "unauthenticated" }
  | {
      status: "authenticated"
      userId: string
      email: string | null
      supabase: Awaited<ReturnType<typeof createClient>>
    }

export async function getAuthContext(): Promise<AuthContext> {
  if (!getSupabaseEnv()) {
    return { status: "unconfigured" }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub

  if (error || !userId) {
    return { status: "unauthenticated" }
  }

  const email = typeof data.claims.email === "string" ? data.claims.email : null
  return { status: "authenticated", userId, email, supabase }
}
