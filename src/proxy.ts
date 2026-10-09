import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseEnv } from "@/lib/supabase/env"

const publicPaths = [
  "/entrar",
  "/cadastro",
  "/recuperar",
  "/nova-senha",
  "/auth",
  "/manifest.webmanifest",
  "/sw.js",
  "/offline.html",
]

function isPublicPath(pathname: string) {
  return publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

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
  if (!env) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

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
  const isAuthenticated = Boolean(data?.claims?.sub)
  const { pathname } = request.nextUrl

  if (!isAuthenticated && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = "/entrar"
    url.search = ""
    return redirectKeepingSession(url, supabaseResponse)
  }

  if (isAuthenticated && (pathname === "/entrar" || pathname === "/cadastro" || pathname === "/recuperar" || pathname === "/")) {
    const url = request.nextUrl.clone()
    url.pathname = "/meu-dia"
    url.search = ""
    return redirectKeepingSession(url, supabaseResponse)
  }

  if (!isAuthenticated && pathname === "/") {
    const url = request.nextUrl.clone()
    url.pathname = "/entrar"
    return redirectKeepingSession(url, supabaseResponse)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
