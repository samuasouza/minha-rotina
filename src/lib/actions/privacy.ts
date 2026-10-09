"use server"

import { z } from "zod"
import { deletionRequestMessage } from "@/lib/domain/privacy"
import { buildPersonalExport } from "@/lib/data/export"
import { failure, invalid, readyAccount } from "@/lib/actions/ready"

const deletionSchema = z.object({
  email: z.email("Digite o e-mail da conta para confirmar."),
})

export async function exportPersonalData() {
  return buildPersonalExport()
}

export async function requestAccountDeletion(input: unknown) {
  const parsed = deletionSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const accountEmail = ready.auth.email?.trim().toLowerCase()
  if (!accountEmail || parsed.data.email.trim().toLowerCase() !== accountEmail) {
    return { ok: false as const, message: "Digite o e-mail desta conta para confirmar o pedido." }
  }
  const created = await ready.auth.supabase.from("account_deletion_requests").insert({
    user_id: ready.auth.userId,
    confirmed_email: accountEmail,
  })
  if (created.error) {
    if (created.error.code === "23505") {
      return { ok: true as const, message: deletionRequestMessage }
    }
    return failure(created.error)
  }
  return { ok: true as const, message: deletionRequestMessage }
}
