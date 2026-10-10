export function authConfirmUrl(siteUrl: string, next?: string) {
  const origin = siteUrl.trim().replace(/\/+$/, "")
  if (!next) return `${origin}/auth/confirm`
  return `${origin}/auth/confirm?next=${next}`
}

function hostnameOf(value: string) {
  try {
    return new URL(value).hostname
  } catch {
    return null
  }
}

function originAllowed(origin: string) {
  let url: URL
  try {
    url = new URL(origin)
  } catch {
    return false
  }
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    return false
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1"
  if (local) return url.protocol === "http:" || url.protocol === "https:"
  return url.protocol === "https:" && url.hostname.endsWith(".vercel.app")
}

export function resolveAuthSiteUrl(configured: string | null | undefined, requestOrigin: string | null | undefined) {
  const fromEnv = configured?.trim().replace(/\/+$/, "") ?? ""
  const host = fromEnv ? hostnameOf(fromEnv) : null
  if (fromEnv && host && host !== "localhost" && host !== "127.0.0.1") {
    return fromEnv
  }

  const origin = requestOrigin?.trim().replace(/\/+$/, "") ?? ""
  if (origin && originAllowed(origin)) {
    return origin
  }

  return fromEnv || "http://localhost:3000"
}

export function requestOriginFromHeaders(headerList: { get(name: string): string | null }) {
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host")
  const hostname = host?.split(",")[0]?.trim()
  if (!hostname) return null
  const forwarded = headerList.get("x-forwarded-proto")?.split(",")[0]?.trim()
  const proto = forwarded || (hostname.startsWith("localhost") || hostname.startsWith("127.0.0.1") ? "http" : "https")
  return `${proto}://${hostname}`
}
