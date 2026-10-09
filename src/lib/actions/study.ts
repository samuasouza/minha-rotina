"use server"

import { syncModuleChecklist } from "@/lib/data/checklist-link"
import { startOfWeek } from "@/lib/domain/dates"
import { blankToNull } from "@/lib/validation/schemas"
import {
  finishSessionSchema,
  recordIdSchema,
  studyNoteSchema,
  studySessionSchema,
  subjectSchema,
  topicSchema,
  weekGoalSchema,
} from "@/lib/validation/modules"
import { z } from "zod"
import { failure, invalid, readyAccount, refreshRecords } from "@/lib/actions/ready"

export async function addSubject(input: unknown) {
  const parsed = subjectSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const created = await ready.auth.supabase.from("study_subjects").insert({
    user_id: ready.auth.userId,
    name: parsed.data.name,
    kind: parsed.data.kind,
  })
  if (created.error) return failure(created.error)
  refreshRecords()
  return { ok: true as const, message: "Matéria cadastrada." }
}

export async function addTopic(input: unknown) {
  const parsed = topicSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const created = await ready.auth.supabase.from("study_topics").insert({
    user_id: ready.auth.userId,
    subject_id: parsed.data.subjectId,
    title: parsed.data.title,
    position: parsed.data.position,
  })
  if (created.error) return failure(created.error)
  refreshRecords()
  return { ok: true as const, message: "Conteúdo adicionado." }
}

export async function toggleTopic(input: unknown) {
  const parsed = recordIdSchema.extend({ done: z.boolean() }).safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const updated = await ready.auth.supabase.from("study_topics").update({ is_done: parsed.data.done }).eq("id", parsed.data.id)
  if (updated.error) return failure(updated.error)
  refreshRecords()
  return { ok: true as const, message: parsed.data.done ? "Conteúdo concluído." : "Conteúdo reaberto." }
}

export async function addStudyGoal(input: unknown) {
  const parsed = weekGoalSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const created = await ready.auth.supabase.from("study_week_goals").insert({
    user_id: ready.auth.userId,
    week_starts_on: startOfWeek(parsed.data.weekStartsOn),
    title: parsed.data.title,
    target_minutes: parsed.data.targetMinutes ?? null,
    subject_id: parsed.data.subjectId ?? null,
  })
  if (created.error) return failure(created.error)
  refreshRecords()
  return { ok: true as const, message: "Meta de estudo criada." }
}

export async function toggleStudyGoal(input: unknown) {
  const parsed = recordIdSchema.extend({ done: z.boolean() }).safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const goal = await ready.auth.supabase
    .from("study_week_goals")
    .select("id, title, week_starts_on")
    .eq("id", parsed.data.id)
    .maybeSingle()
  if (goal.error || !goal.data) return failure(goal.error ?? { message: "not_found" })
  const updated = await ready.auth.supabase.from("study_week_goals").update({ is_done: parsed.data.done }).eq("id", goal.data.id)
  if (updated.error) return failure(updated.error)
  const linked = await syncModuleChecklist(ready.auth.supabase, {
    userId: ready.auth.userId,
    date: goal.data.week_starts_on,
    module: "study",
    title: goal.data.title,
    recordId: goal.data.id,
    completed: parsed.data.done,
  })
  if (linked.error) return failure(linked.error)
  refreshRecords()
  return { ok: true as const, message: parsed.data.done ? "Meta concluída." : "Meta reaberta." }
}

export async function startStudySession(input: unknown) {
  const parsed = studySessionSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const created = await ready.auth.supabase
    .from("study_sessions")
    .insert({
      user_id: ready.auth.userId,
      subject_id: parsed.data.subjectId,
      started_at: new Date().toISOString(),
      status: "running",
    })
    .select("id, started_at")
    .single()
  if (created.error || !created.data) return failure(created.error ?? { message: "save_failed" })
  refreshRecords()
  return { ok: true as const, message: "Cronômetro iniciado.", id: created.data.id, startedAt: created.data.started_at }
}

export async function finishStudySession(input: unknown) {
  const parsed = finishSessionSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const current = await ready.auth.supabase
    .from("study_sessions")
    .select("id, subject_id, started_at")
    .eq("id", parsed.data.sessionId)
    .maybeSingle()
  if (current.error || !current.data) return failure(current.error ?? { message: "not_found" })

  const subject = await ready.auth.supabase.from("study_subjects").select("name").eq("id", current.data.subject_id).maybeSingle()
  const endedAt = new Date().toISOString()
  const updated = await ready.auth.supabase
    .from("study_sessions")
    .update({
      status: "completed",
      ended_at: endedAt,
      duration_seconds: parsed.data.durationSeconds,
      notes: blankToNull(parsed.data.notes),
    })
    .eq("id", current.data.id)
  if (updated.error) return failure(updated.error)

  const date = parsed.data.sessionDate
  const linked = await syncModuleChecklist(ready.auth.supabase, {
    userId: ready.auth.userId,
    date,
    module: "study",
    title: subject.data?.name ? `Estudo: ${subject.data.name}` : "Estudo",
    recordId: current.data.id,
    completed: true,
  })
  if (linked.error) return failure(linked.error)
  if (linked.taskId) {
    await ready.auth.supabase.from("study_sessions").update({ task_id: linked.taskId }).eq("id", current.data.id)
  }
  refreshRecords()
  return { ok: true as const, message: "Sessão registrada no dia." }
}

export async function discardStudySession(input: unknown) {
  const parsed = recordIdSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const updated = await ready.auth.supabase
    .from("study_sessions")
    .update({ status: "discarded", ended_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("status", "running")
  if (updated.error) return failure(updated.error)
  refreshRecords()
  return { ok: true as const, message: "Sessão descartada." }
}

export async function addStudyNote(input: unknown) {
  const parsed = studyNoteSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const created = await ready.auth.supabase.from("study_notes").insert({
    user_id: ready.auth.userId,
    subject_id: parsed.data.subjectId,
    body: parsed.data.body,
  })
  if (created.error) return failure(created.error)
  refreshRecords()
  return { ok: true as const, message: "Anotação salva." }
}
