import "server-only"

import { revalidatePath } from "next/cache"
import type { ZodError } from "zod"
import { getAuthContext } from "@/lib/auth/session"
import { configurationMessage, firstIssue, isSchemaMissing, logOperationFailure, messageFromDatabase } from "@/lib/errors"

export async function readyAccount() {
  const auth = await getAuthContext()
  if (auth.status === "unconfigured") {
    return { ok: false as const, message: configurationMessage }
  }
  if (auth.status === "unauthenticated") {
    return { ok: false as const, message: "Entre novamente para continuar." }
  }
  return { ok: true as const, auth }
}

export function refreshRecords() {
  revalidatePath("/meu-dia")
  revalidatePath("/devocional")
  revalidatePath("/treinos")
  revalidatePath("/estudos")
  revalidatePath("/alimentacao")
  revalidatePath("/cardio")
  revalidatePath("/meu-corpo")
  revalidatePath("/bem-estar")
  revalidatePath("/perfil")
  revalidatePath("/metas")
  revalidatePath("/importar")
  revalidatePath("/configuracoes")
  revalidatePath("/agenda")
}

export function failure(error: { code?: string; message?: string }) {
  if (isSchemaMissing(error)) {
    return { ok: false as const, message: "A estrutura deste módulo ainda não está disponível." }
  }
  logOperationFailure("module_write_failed", error)
  return { ok: false as const, message: messageFromDatabase(error) }
}

export function invalid(error: ZodError) {
  return { ok: false as const, message: firstIssue(error) }
}
