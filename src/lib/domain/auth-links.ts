export function authConfirmUrl(siteUrl: string, next?: string) {
  const origin = siteUrl.trim().replace(/\/+$/, "")
  if (!next) return `${origin}/auth/confirm`
  return `${origin}/auth/confirm?next=${next}`
}
