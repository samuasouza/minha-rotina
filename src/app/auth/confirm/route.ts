import { type EmailOtpType } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { getSupabaseEnv } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"

const otpTypes = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
])

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const tokenHash = url.searchParams.get("token_hash")
  const type = url.searchParams.get("type")
  const next = url.searchParams.get("next")
  const env = getSupabaseEnv()
  const destination =
    type === "recovery" || next === "/nova-senha" ? "/nova-senha" : "/meu-dia"

  if (!env || (!code && !tokenHash)) {
    return NextResponse.redirect(new URL("/entrar?aviso=link", url.origin))
  }

  const supabase = await createClient()
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(new URL("/entrar?aviso=link", url.origin))
    }
  } else if (tokenHash && type && otpTypes.has(type as EmailOtpType)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    })
    if (error) {
      return NextResponse.redirect(new URL("/entrar?aviso=link", url.origin))
    }
  } else {
    return NextResponse.redirect(new URL("/entrar?aviso=link", url.origin))
  }

  return NextResponse.redirect(new URL(destination, url.origin))
}
