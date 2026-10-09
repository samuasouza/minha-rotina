export type SupabaseEnv = {
  url: string
  publishableKey: string
  siteUrl: string
}

const placeholderFragments = ["supabase_project_url", "supabase_publishable", "sua_chave", "seu-projeto"]

export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()

  if (!url || !publishableKey) {
    return null
  }

  const combined = `${url} ${publishableKey}`
  if (placeholderFragments.some((fragment) => combined.includes(fragment))) {
    return null
  }

  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null
    }
  } catch {
    return null
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000"

  return { url, publishableKey, siteUrl }
}
