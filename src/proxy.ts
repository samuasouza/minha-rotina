import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { gateDestination } from "@/lib/auth/gate"
import { getSupabaseEnv } from "@/lib/supabase/env"

function redirectKeepingSession(url: URL, supabaseResponse: NextResponse) {
  const redirectResponse = NextResponse.redirect(url)
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie.name, cookie.value)
  })
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = supabaseResponse.headers.get(header)
    if (value) {
      redirectResponse.headers.set(header, value)
    }
  }
  return redirectResponse
}

export async function proxy(request: NextRequest) {
  const env = getSupabaseEnv()
  let supabaseResponse = NextResponse.next({ request })
  let isAuthenticated = false

  if (env) {
    const supabase = createServerClient(env.url, env.publishableKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
          Object.entries(headers).forEach(([key, value]) => {
            supabaseResponse.headers.set(key, value)
          })
        },
      },
    })

    const { data } = await supabase.auth.getClaims()
    isAuthenticated = Boolean(data?.claims?.sub)
  }

  const destination = gateDestination(request.nextUrl.pathname, isAuthenticated)
  if (!destination) {
    return supabaseResponse
  }

  const url = request.nextUrl.clone()
  url.pathname = destination
  url.search = ""
  return redirectKeepingSession(url, supabaseResponse)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
