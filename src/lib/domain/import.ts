export const importModules = ["diet", "workout", "study", "schedule", "water", "meal"] as const
export type ImportModule = (typeof importModules)[number]

export const importLimits = {
  pdfBytes: 8 * 1024 * 1024,
  imageBytes: 5 * 1024 * 1024,
  audioBytes: 10 * 1024 * 1024,
  textChars: 20_000,
  proposalChars: 100_000,
  providerBytes: 4 * 1024 * 1024,
  maxAttempts: 2,
  reviewBelow: 0.6,
} as const

export const providerMissingMessage =
  "A leitura automática não está configurada. O material fica guardado na sua conta. Preencha só o que você reconhece; campos em branco não são inventados."

export function sameLabel(left: string, right: string) {
  return left.trim().toLocaleLowerCase("pt-BR") === right.trim().toLocaleLowerCase("pt-BR")
}

export function needsReview(confidence: number | null | undefined) {
  return confidence == null || confidence < importLimits.reviewBelow
}

export function providerFromEnv(env: Record<string, string | undefined>) {
  const key = env.IMPORT_AI_API_KEY?.trim()
  const base = env.IMPORT_AI_BASE_URL?.trim()
  const model = env.IMPORT_AI_MODEL?.trim()
  if (!key || !base || !model) return null
  if (key.startsWith("NEXT_PUBLIC_") || base.startsWith("NEXT_PUBLIC_")) return null
  let parsed: URL
  try {
    parsed = new URL(base)
  } catch {
    return null
  }
  if (parsed.protocol !== "https:") return null
  return { base: base.replace(/\/$/, ""), model }
}

export function kindFromMime(mime: string): "pdf" | "image" | "audio" | null {
  const value = mime.toLowerCase().split(";")[0]?.trim() ?? ""
  if (value === "application/pdf") return "pdf"
  if (value === "image/jpeg" || value === "image/png" || value === "image/webp") return "image"
  if (value === "audio/webm" || value === "audio/mp4" || value === "audio/mpeg" || value === "audio/wav" || value === "audio/x-wav") {
    return "audio"
  }
  return null
}

export function fileByteLimit(kind: "pdf" | "image" | "audio") {
  if (kind === "pdf") return importLimits.pdfBytes
  if (kind === "image") return importLimits.imageBytes
  return importLimits.audioBytes
}

export function importObjectPath(userId: string, fileName: string, id: string) {
  const safe = fileName
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
  return `${userId}/${id}-${safe || "arquivo"}`
}

export function findSameLabel<T extends { name: string }>(rows: T[], name: string) {
  return rows.find((row) => sameLabel(row.name, name)) ?? null
}

export function duplicateTitle(titles: string[], title: string) {
  return titles.some((item) => sameLabel(item, title))
}
