"use server"

import { syncModuleChecklist } from "@/lib/data/checklist-link"
import { blankToNull, isoDateSchema } from "@/lib/validation/schemas"
import {
  exerciseSchema,
  prescriptionSchema,
  recordIdSchema,
  sessionSchema,
  setSchema,
  sheetSchema,
  suggestionSchema,
  workoutDaySchema,
} from "@/lib/validation/modules"
import { z } from "zod"
import { failure, invalid, readyAccount, refreshRecords } from "@/lib/actions/ready"

export async function addExercise(input: unknown) {
  const parsed = exerciseSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const created = await ready.auth.supabase.from("exercises").insert({
    user_id: ready.auth.userId,
    name: parsed.data.name,
  })
  if (created.error) return failure(created.error)
  refreshRecords()
  return { ok: true as const, message: "Exercício cadastrado." }
}

export async function addSheet(input: unknown) {
  const parsed = sheetSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const created = await ready.auth.supabase.from("workout_sheets").insert({
    user_id: ready.auth.userId,
    name: parsed.data.name,
  })
  if (created.error) return failure(created.error)
  refreshRecords()
  return { ok: true as const, message: "Ficha criada." }
}

export async function addWorkoutDay(input: unknown) {
  const parsed = workoutDaySchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const created = await ready.auth.supabase.from("workout_days").insert({
    user_id: ready.auth.userId,
    sheet_id: parsed.data.sheetId,
    name: parsed.data.name,
    position: parsed.data.position,
  })
  if (created.error) return failure(created.error)
  refreshRecords()
  return { ok: true as const, message: "Dia da ficha criado." }
}

export async function addPrescription(input: unknown) {
  const parsed = prescriptionSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const created = await ready.auth.supabase.from("workout_exercises").insert({
    user_id: ready.auth.userId,
    day_id: parsed.data.dayId,
    exercise_id: parsed.data.exerciseId,
    position: parsed.data.position,
    target_sets: parsed.data.targetSets,
    target_reps: parsed.data.targetReps,
  })
  if (created.error) return failure(created.error)
  refreshRecords()
  return { ok: true as const, message: "Exercício incluído na ficha." }
}

export async function startWorkoutSession(input: unknown) {
  const parsed = sessionSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const created = await ready.auth.supabase
    .from("workout_sessions")
    .insert({
      user_id: ready.auth.userId,
      performed_on: parsed.data.performedOn,
      day_id: parsed.data.dayId ?? null,
      sheet_id: parsed.data.sheetId ?? null,
      status: "partial",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single()
  if (created.error || !created.data) return failure(created.error ?? { message: "save_failed" })
  refreshRecords()
  return { ok: true as const, message: "Sessão iniciada.", id: created.data.id }
}

export async function addWorkoutSet(input: unknown) {
  const parsed = setSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const created = await ready.auth.supabase.from("workout_sets").insert({
    user_id: ready.auth.userId,
    session_id: parsed.data.sessionId,
    exercise_id: parsed.data.exerciseId,
    set_number: parsed.data.setNumber,
    reps: parsed.data.reps,
    load_kg: parsed.data.loadKg,
    completed: parsed.data.completed,
  })
  if (created.error) return failure(created.error)
  refreshRecords()
  return { ok: true as const, message: "Série registrada." }
}

export async function finishWorkoutSession(input: unknown) {
  const parsed = recordIdSchema
    .extend({
      status: z.enum(["partial", "completed"]),
      performedOn: isoDateSchema,
      title: z.string().trim().min(1).max(160),
    })
    .safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready

  const updated = await ready.auth.supabase
    .from("workout_sessions")
    .update({
      status: parsed.data.status,
      ended_at: parsed.data.status === "completed" ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.id)
  if (updated.error) return failure(updated.error)

  const linked = await syncModuleChecklist(ready.auth.supabase, {
    userId: ready.auth.userId,
    date: parsed.data.performedOn,
    module: "workout",
    title: parsed.data.title,
    recordId: parsed.data.id,
    completed: parsed.data.status === "completed",
    keepPending: parsed.data.status === "partial",
  })
  if (linked.error) return failure(linked.error)
  if (linked.taskId) {
    await ready.auth.supabase.from("workout_sessions").update({ task_id: linked.taskId }).eq("id", parsed.data.id)
  }
  refreshRecords()
  return {
    ok: true as const,
    message: parsed.data.status === "completed" ? "Treino concluído." : "Treino salvo como parcial.",
  }
}

export async function suggestLoad(input: unknown) {
  const parsed = suggestionSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const created = await ready.auth.supabase.from("load_suggestions").insert({
    user_id: ready.auth.userId,
    exercise_id: parsed.data.exerciseId,
    suggested_load_kg: parsed.data.suggestedLoadKg,
    note: blankToNull(parsed.data.note),
    status: "pending",
  })
  if (created.error) return failure(created.error)
  refreshRecords()
  return { ok: true as const, message: "Sugestão registrada. A ficha não foi alterada." }
}

export async function decideSuggestion(input: unknown) {
  const parsed = recordIdSchema.extend({ decision: z.enum(["accepted", "dismissed"]) }).safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const updated = await ready.auth.supabase
    .from("load_suggestions")
    .update({ status: parsed.data.decision, decided_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("status", "pending")
  if (updated.error) return failure(updated.error)
  refreshRecords()
  return {
    ok: true as const,
    message: parsed.data.decision === "accepted" ? "Sugestão aceita. Edite a ficha se quiser usá-la." : "Sugestão recusada.",
  }
}

export async function deleteExercise(input: unknown) {
  return deleteTrainingRow("exercises", input)
}

export async function deleteSheet(input: unknown) {
  return deleteTrainingRow("workout_sheets", input)
}

async function deleteTrainingRow(table: "exercises" | "workout_sheets", input: unknown) {
  const parsed = recordIdSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const removed = await ready.auth.supabase.from(table).delete().eq("id", parsed.data.id).eq("user_id", ready.auth.userId)
  if (removed.error) return failure(removed.error)
  refreshRecords()
  return { ok: true as const, message: "Registro excluído." }
}
