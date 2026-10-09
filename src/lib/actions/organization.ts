"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getAuthContext } from "@/lib/auth/session"
import { canCompleteFromChecklist } from "@/lib/domain/progress"
import { occursOnDate } from "@/lib/domain/recurrence"
import type { ActionResult } from "@/lib/domain/types"
import {
  configurationMessage,
  firstIssue,
  isSchemaMissing,
  logOperationFailure,
  mapAuthError,
  messageFromDatabase,
  schemaMessage,
} from "@/lib/errors"
import {
  appointmentFormSchema,
  appointmentIdSchema,
  appointmentStatusSchema,
  blankToNull,
  profileFormSchema,
  rescheduleSchema,
  signInSchema,
  signUpSchema,
  skipTaskSchema,
  taskFormSchema,
  taskIdSchema,
} from "@/lib/validation/schemas"
import { getSupabaseEnv } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"

function failure(error: { code?: string; message?: string }): ActionResult {
  if (isSchemaMissing(error)) {
    return { ok: false, message: schemaMessage }
  }
  logOperationFailure("write_failed", error)
  return { ok: false, message: messageFromDatabase(error) }
}

async function readyAuth() {
  const auth = await getAuthContext()
  if (auth.status === "unconfigured") {
    return { ok: false as const, message: configurationMessage }
  }
  if (auth.status === "unauthenticated") {
    return { ok: false as const, message: "Entre novamente para continuar." }
  }
  return { ok: true as const, auth }
}

function refreshOrganization() {
  revalidatePath("/meu-dia")
  revalidatePath("/agenda")
  revalidatePath("/configuracoes")
}

export async function signIn(input: unknown): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: firstIssue(parsed.error) }
  }
  if (!getSupabaseEnv()) {
    return { ok: false, message: configurationMessage }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) {
    return { ok: false, message: mapAuthError(error.message) }
  }

  redirect("/meu-dia")
}

export async function signUp(input: unknown): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: firstIssue(parsed.error) }
  }
  const env = getSupabaseEnv()
  if (!env) {
    return { ok: false, message: configurationMessage }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${env.siteUrl.replace(/\/$/, "")}/auth/confirm`,
      data: { display_name: parsed.data.displayName },
    },
  })
  if (error) {
    return { ok: false, message: mapAuthError(error.message) }
  }
  if (data.user && (data.user.identities?.length ?? 0) === 0) {
    return {
      ok: false,
      message: "Esse e-mail já possui uma conta. Entre com a senha.",
    }
  }
  if (!data.session) {
    return {
      ok: true,
      message: "Enviamos um link de confirmação. Abra o e-mail para entrar no seu dia.",
    }
  }

  redirect("/meu-dia")
}

export async function requestPasswordReset(input: unknown): Promise<ActionResult> {
  const parsed = signInSchema.pick({ email: true }).safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: firstIssue(parsed.error) }
  }
  const env = getSupabaseEnv()
  if (!env) {
    return { ok: false, message: configurationMessage }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.siteUrl}/auth/confirm?next=/nova-senha`,
  })
  if (error) {
    logOperationFailure("password_reset_failed", error)
  }

  return {
    ok: true,
    message: "Se este e-mail tiver uma conta, enviaremos um link para criar uma nova senha.",
  }
}

export async function updatePassword(input: unknown): Promise<ActionResult> {
  const parsed = signInSchema.pick({ password: true }).safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: firstIssue(parsed.error) }
  }
  const ready = await readyAuth()
  if (!ready.ok) {
    return ready
  }
  const { error } = await ready.auth.supabase.auth.updateUser({ password: parsed.data.password })
  if (error) {
    return { ok: false, message: mapAuthError(error.message) }
  }
  redirect("/configuracoes")
}

export async function signOut() {
  if (getSupabaseEnv()) {
    const supabase = await createClient()
    await supabase.auth.signOut()
  }
  redirect("/entrar")
}

export async function createTask(input: unknown): Promise<ActionResult> {
  const parsed = taskFormSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: firstIssue(parsed.error) }
  }

  const ready = await readyAuth()
  if (!ready.ok) {
    return ready
  }

  const value = parsed.data
  if (value.repeat) {
    const created = await ready.auth.supabase.from("routines").insert({
      user_id: ready.auth.userId,
      title: value.title,
      notes: blankToNull(value.notes),
      is_optional: value.isOptional,
      days_of_week: value.daysOfWeek,
      time_of_day: blankToNull(value.timeOfDay),
      starts_on: value.scheduledOn,
      completion_policy: "checklist",
      linked_module: "none",
    })

    if (created.error) {
      return failure(created.error)
    }

    const ensured = await ready.auth.supabase.rpc("ensure_routine_tasks", {
      target_date: value.scheduledOn,
    })
    if (ensured.error) {
      return failure(ensured.error)
    }

    refreshOrganization()
    const appearsToday = occursOnDate(
      {
        daysOfWeek: value.daysOfWeek,
        startsOn: value.scheduledOn,
        endsOn: null,
        isActive: true,
      },
      value.scheduledOn,
    )

    return {
      ok: true,
      message: appearsToday
        ? "Atividade adicionada aos dias escolhidos."
        : "A repetição foi salva e vai aparecer nos dias escolhidos.",
    }
  }

  const created = await ready.auth.supabase.from("tasks").insert({
    user_id: ready.auth.userId,
    title: value.title,
    notes: blankToNull(value.notes),
    is_optional: value.isOptional,
    scheduled_on: value.scheduledOn,
    time_of_day: blankToNull(value.timeOfDay),
    completion_policy: "checklist",
    linked_module: "none",
  })

  if (created.error) {
    return failure(created.error)
  }

  refreshOrganization()
  return { ok: true, message: "Atividade adicionada." }
}

export async function toggleTask(input: unknown): Promise<ActionResult> {
  const parsed = taskIdSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: firstIssue(parsed.error) }
  }

  const ready = await readyAuth()
  if (!ready.ok) {
    return ready
  }

  const current = await ready.auth.supabase
    .from("tasks")
    .select("id, status, completion_policy")
    .eq("id", parsed.data.taskId)
    .maybeSingle()

  if (current.error) {
    return failure(current.error)
  }
  if (!current.data) {
    return { ok: false, message: "Não encontrei essa atividade." }
  }

  if (current.data.status === "pending") {
    if (!canCompleteFromChecklist(current.data.completion_policy)) {
      return {
        ok: false,
        message: "Este item só é concluído com o registro do módulo correspondente.",
      }
    }

    const updated = await ready.auth.supabase
      .from("tasks")
      .update({ status: "completed" })
      .eq("id", parsed.data.taskId)
    if (updated.error) {
      return failure(updated.error)
    }
  } else if (current.data.status === "completed") {
    const updated = await ready.auth.supabase
      .from("tasks")
      .update({ status: "pending" })
      .eq("id", parsed.data.taskId)
    if (updated.error) {
      return failure(updated.error)
    }
  } else {
    return { ok: false, message: "Esta atividade não está em aberto." }
  }

  refreshOrganization()
  return { ok: true, message: "Checklist atualizado." }
}

export async function skipTask(input: unknown): Promise<ActionResult> {
  const parsed = skipTaskSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: firstIssue(parsed.error) }
  }

  const ready = await readyAuth()
  if (!ready.ok) {
    return ready
  }

  const updated = await ready.auth.supabase
    .from("tasks")
    .update({ status: "skipped", skipped_reason: parsed.data.reason })
    .eq("id", parsed.data.taskId)
    .eq("status", "pending")
    .select("id")

  if (updated.error) {
    return failure(updated.error)
  }
  if (!updated.data?.length) {
    return { ok: false, message: "Só é possível ignorar uma atividade que ainda está pendente." }
  }

  refreshOrganization()
  return { ok: true, message: "Atividade ignorada. Ela não entra no percentual do dia." }
}

export async function rescheduleTask(input: unknown): Promise<ActionResult> {
  const parsed = rescheduleSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: firstIssue(parsed.error) }
  }

  const ready = await readyAuth()
  if (!ready.ok) {
    return ready
  }

  const moved = await ready.auth.supabase.rpc("reschedule_task", {
    task_id: parsed.data.id,
    target_date: parsed.data.targetDate,
  })

  if (moved.error) {
    return failure(moved.error)
  }

  refreshOrganization()
  return { ok: true, message: "Atividade reagendada." }
}

export async function deleteTask(input: unknown): Promise<ActionResult> {
  const parsed = taskIdSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: firstIssue(parsed.error) }
  }

  const ready = await readyAuth()
  if (!ready.ok) {
    return ready
  }

  const current = await ready.auth.supabase
    .from("tasks")
    .select("id, routine_id")
    .eq("id", parsed.data.taskId)
    .maybeSingle()

  if (current.error) {
    return failure(current.error)
  }
  if (!current.data) {
    return { ok: false, message: "Não encontrei essa atividade." }
  }
  if (current.data.routine_id) {
    return {
      ok: false,
      message: "Esta atividade se repete. Você pode ignorá-la hoje ou encerrar a repetição.",
    }
  }

  const deleted = await ready.auth.supabase.from("tasks").delete().eq("id", parsed.data.taskId)
  if (deleted.error) {
    return failure(deleted.error)
  }

  refreshOrganization()
  return { ok: true, message: "Atividade excluída." }
}

export async function stopRoutine(input: unknown): Promise<ActionResult> {
  const parsed = taskIdSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: firstIssue(parsed.error) }
  }

  const ready = await readyAuth()
  if (!ready.ok) {
    return ready
  }

  const current = await ready.auth.supabase
    .from("tasks")
    .select("routine_id")
    .eq("id", parsed.data.taskId)
    .maybeSingle()

  if (current.error) {
    return failure(current.error)
  }
  if (!current.data?.routine_id) {
    return { ok: false, message: "Esta atividade não faz parte de uma repetição." }
  }

  const stopped = await ready.auth.supabase
    .from("routines")
    .update({ is_active: false })
    .eq("id", current.data.routine_id)

  if (stopped.error) {
    return failure(stopped.error)
  }

  refreshOrganization()
  return { ok: true, message: "A repetição foi encerrada. O que já foi registrado permanece." }
}

export async function createAppointment(input: unknown): Promise<ActionResult> {
  const parsed = appointmentFormSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: firstIssue(parsed.error) }
  }

  const ready = await readyAuth()
  if (!ready.ok) {
    return ready
  }

  const created = await ready.auth.supabase.from("appointments").insert({
    user_id: ready.auth.userId,
    title: parsed.data.title,
    notes: blankToNull(parsed.data.notes),
    location: blankToNull(parsed.data.location),
    scheduled_on: parsed.data.scheduledOn,
    starts_at: blankToNull(parsed.data.startsAt),
    ends_at: blankToNull(parsed.data.endsAt),
  })

  if (created.error) {
    return failure(created.error)
  }

  refreshOrganization()
  return { ok: true, message: "Compromisso adicionado." }
}

export async function setAppointmentStatus(input: unknown): Promise<ActionResult> {
  const statusParsed = appointmentStatusSchema.safeParse(input)
  if (!statusParsed.success) {
    return { ok: false, message: firstIssue(statusParsed.error) }
  }

  const ready = await readyAuth()
  if (!ready.ok) {
    return ready
  }

  const updated = await ready.auth.supabase
    .from("appointments")
    .update({ status: statusParsed.data.status })
    .eq("id", statusParsed.data.appointmentId)
    .eq("status", "scheduled")
    .select("id")

  if (updated.error) {
    return failure(updated.error)
  }
  if (!updated.data?.length) {
    return { ok: false, message: "Este compromisso não está mais em aberto." }
  }

  refreshOrganization()
  return { ok: true, message: "Agenda atualizada." }
}

export async function rescheduleAppointment(input: unknown): Promise<ActionResult> {
  const parsed = rescheduleSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: firstIssue(parsed.error) }
  }

  const ready = await readyAuth()
  if (!ready.ok) {
    return ready
  }

  const moved = await ready.auth.supabase.rpc("reschedule_appointment", {
    appointment_id: parsed.data.id,
    target_date: parsed.data.targetDate,
  })

  if (moved.error) {
    return failure(moved.error)
  }

  refreshOrganization()
  return { ok: true, message: "Compromisso reagendado." }
}

export async function deleteAppointment(input: unknown): Promise<ActionResult> {
  const parsed = appointmentIdSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: firstIssue(parsed.error) }
  }

  const ready = await readyAuth()
  if (!ready.ok) {
    return ready
  }

  const deleted = await ready.auth.supabase.from("appointments").delete().eq("id", parsed.data.appointmentId)
  if (deleted.error) {
    return failure(deleted.error)
  }

  refreshOrganization()
  return { ok: true, message: "Compromisso excluído." }
}

export async function updateProfile(input: unknown): Promise<ActionResult> {
  const parsed = profileFormSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: firstIssue(parsed.error) }
  }

  const ready = await readyAuth()
  if (!ready.ok) {
    return ready
  }

  const updated = await ready.auth.supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      full_name: blankToNull(parsed.data.fullName),
      timezone: parsed.data.timezone,
    })
    .eq("id", ready.auth.userId)

  if (updated.error) {
    return failure(updated.error)
  }

  refreshOrganization()
  return { ok: true, message: "Perfil atualizado." }
}