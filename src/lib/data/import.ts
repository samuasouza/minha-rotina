import "server-only"

import { importProviderConfigured } from "@/lib/import/provider"
import { requireReadyAccount } from "@/lib/data/account"
import { isSchemaMissing, logOperationFailure } from "@/lib/errors"
import type { ImportModule } from "@/lib/domain/import"

export type ImportDraftCard = {
  id: string
  module: ImportModule
  sourceKind: "pdf" | "image" | "text" | "audio"
  sourceName: string | null
  status: "awaiting_provider" | "ready_for_review"
  proposal: unknown
  reviewNote: string | null
}

export async function loadImports() {
  const account = await requireReadyAccount()
  if (account.status !== "ready") return account
  const drafts = await account.auth.supabase
    .from("import_drafts")
    .select("id, module, source_kind, source_name, status, proposal, review_note")
    .in("status", ["awaiting_provider", "ready_for_review"])
    .order("created_at", { ascending: false })
    .limit(20)
  if (drafts.error) {
    if (isSchemaMissing(drafts.error)) return { status: "schema_missing" as const }
    logOperationFailure("import_drafts_read_failed", drafts.error)
    return { status: "error" as const }
  }
  return {
    status: "ready" as const,
    userId: account.auth.userId,
    providerConfigured: importProviderConfigured(),
    drafts: (drafts.data ?? []).map(
      (row): ImportDraftCard => ({
        id: row.id,
        module: row.module,
        sourceKind: row.source_kind,
        sourceName: row.source_name,
        status: row.status as ImportDraftCard["status"],
        proposal: row.proposal,
        reviewNote: row.review_note,
      }),
    ),
  }
}
