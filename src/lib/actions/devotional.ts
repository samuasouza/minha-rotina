"use server"

import { syncModuleChecklist } from "@/lib/data/checklist-link"
import { startOfWeek } from "@/lib/domain/dates"
import { blankToNull } from "@/lib/validation/schemas"
import {
  devotionalEntrySchema,
  gratitudeSchema,
  prayerAnswerSchema,
  prayerSchema,
  readingItemSchema,
  readingLogSchema,
  readingPlanSchema,
  recordIdSchema,
  weekGoalSchema,
} from "@/lib/validation/modules"
import { z } from "zod"
import { failure, invalid, readyAccount, refreshRecords } from "@/lib/actions/ready"

export async function saveDevotional(input: unknown) {
  const parsed = devotionalEntrySchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready

  const value = parsed.data
  const saved = await ready.auth.supabase
    .from("devotional_entries")
    .upsert(
      {
        user_id: ready.auth.userId,
        entry_date: value.entryDate,
        passage_label: blankToNull(value.passageLabel),
        passage_url: blankToNull(value.passageUrl),
        reflection: blankToNull(value.reflection),
        completed_at: value.completed ? new Date().toISOString() : null,
      },
      { onConflict: "user_id,entry_date" },
    )
    .select("id")
    .single()

  if (saved.error || !saved.data) return failure(saved.error ?? { message: "save_failed" })

  const linked = await syncModuleChecklist(ready.auth.supabase, {
    userId: ready.auth.userId,
    date: value.entryDate,
    module: "devotional",
    title: "Devocional",
    recordId: saved.data.id,
    completed: value.completed,
  })
  if (linked.error) return failure(linked.error)

  if (linked.taskId) {
    await ready.auth.supabase.from("devotional_entries").update({ task_id: linked.taskId }).eq("id", saved.data.id)
  } else {
    await ready.auth.supabase.from("devotional_entries").update({ task_id: null }).eq("id", saved.data.id)
  }

  refreshRecords()
  return { ok: true as const, message: value.completed ? "Devocional registrado no dia." : "Devocional salvo." }
}

export async function addGratitude(input: unknown) {
  const parsed = gratitudeSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const created = await ready.auth.supabase.from("gratitude_entries").insert({
    user_id: ready.auth.userId,
    entry_date: parsed.data.entryDate,
    body: parsed.data.body,
  })
  if (created.error) return failure(created.error)
  refreshRecords()
  return { ok: true as const, message: "Gratidão registrada." }
}

export async function addPrayer(input: unknown) {
  const parsed = prayerSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const created = await ready.auth.supabase.from("prayer_requests").insert({
    user_id: ready.auth.userId,
    title: parsed.data.title,
    details: blankToNull(parsed.data.details),
    asked_on: parsed.data.askedOn,
  })
  if (created.error) return failure(created.error)
  refreshRecords()
  return { ok: true as const, message: "Pedido registrado." }
}

export async function answerPrayer(input: unknown) {
  const parsed = prayerAnswerSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const updated = await ready.auth.supabase
    .from("prayer_requests")
    .update({
      status: "answered",
      answer: parsed.data.answer,
      answered_on: parsed.data.answeredOn,
    })
    .eq("id", parsed.data.prayerId)
    .eq("user_id", ready.auth.userId)
  if (updated.error) return failure(updated.error)
  refreshRecords()
  return { ok: true as const, message: "Resposta registrada." }
}

export async function addReadingPlan(input: unknown) {
  const parsed = readingPlanSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const created = await ready.auth.supabase.from("reading_plans").insert({
    user_id: ready.auth.userId,
    title: parsed.data.title,
    starts_on: parsed.data.startsOn,
  })
  if (created.error) return failure(created.error)
  refreshRecords()
  return { ok: true as const, message: "Plano criado." }
}

export async function addReadingItem(input: unknown) {
  const parsed = readingItemSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const created = await ready.auth.supabase.from("reading_plan_items").insert({
    user_id: ready.auth.userId,
    plan_id: parsed.data.planId,
    day_number: parsed.data.dayNumber,
    passage_label: parsed.data.passageLabel,
    passage_url: blankToNull(parsed.data.passageUrl),
  })
  if (created.error) return failure(created.error)
  refreshRecords()
  return { ok: true as const, message: "Dia do plano adicionado." }
}

export async function addReadingLog(input: unknown) {
  const parsed = readingLogSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const created = await ready.auth.supabase.from("reading_logs").insert({
    user_id: ready.auth.userId,
    read_on: parsed.data.readOn,
    kind: parsed.data.planItemId ? "plan" : "free",
    plan_item_id: parsed.data.planItemId ?? null,
    passage_label: parsed.data.passageLabel,
    passage_url: blankToNull(parsed.data.passageUrl),
  })
  if (created.error) return failure(created.error)
  refreshRecords()
  return { ok: true as const, message: "Leitura registrada." }
}

export async function addDevotionalGoal(input: unknown) {
  const parsed = weekGoalSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const created = await ready.auth.supabase.from("devotional_week_goals").insert({
    user_id: ready.auth.userId,
    week_starts_on: startOfWeek(parsed.data.weekStartsOn),
    title: parsed.data.title,
  })
  if (created.error) return failure(created.error)
  refreshRecords()
  return { ok: true as const, message: "Meta da semana criada." }
}

export async function toggleDevotionalGoal(input: unknown) {
  const parsed = recordIdSchema.extend({ done: z.boolean() }).safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready

  const goal = await ready.auth.supabase
    .from("devotional_week_goals")
    .select("id, title, week_starts_on")
    .eq("id", parsed.data.id)
    .maybeSingle()
  if (goal.error || !goal.data) return failure(goal.error ?? { message: "not_found" })

  const updated = await ready.auth.supabase
    .from("devotional_week_goals")
    .update({ is_done: parsed.data.done })
    .eq("id", goal.data.id)
  if (updated.error) return failure(updated.error)

  const linked = await syncModuleChecklist(ready.auth.supabase, {
    userId: ready.auth.userId,
    date: goal.data.week_starts_on,
    module: "devotional",
    title: goal.data.title,
    recordId: goal.data.id,
    completed: parsed.data.done,
  })
  if (linked.error) return failure(linked.error)
  refreshRecords()
  return { ok: true as const, message: parsed.data.done ? "Meta concluída." : "Meta reaberta." }
}

async function removeRow(
  table: "gratitude_entries" | "prayer_requests" | "reading_plans" | "reading_logs" | "devotional_week_goals",
  input: unknown,
) {
  const parsed = recordIdSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const removed = await ready.auth.supabase.from(table).delete().eq("id", parsed.data.id).eq("user_id", ready.auth.userId)
  if (removed.error) return failure(removed.error)
  refreshRecords()
  return { ok: true as const, message: "Registro excluído." }
}

export async function deleteGratitude(input: unknown) {
  return removeRow("gratitude_entries", input)
}

export async function deletePrayer(input: unknown) {
  return removeRow("prayer_requests", input)
}

export async function deleteReadingPlan(input: unknown) {
  return removeRow("reading_plans", input)
}

export async function deleteReadingLog(input: unknown) {
  return removeRow("reading_logs", input)
}

export async function deleteDevotionalGoal(input: unknown) {
  const parsed = recordIdSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const goal = await ready.auth.supabase
    .from("devotional_week_goals")
    .select("week_starts_on, title")
    .eq("id", parsed.data.id)
    .maybeSingle()
  if (goal.data) {
    await syncModuleChecklist(ready.auth.supabase, {
      userId: ready.auth.userId,
      date: goal.data.week_starts_on,
      module: "devotional",
      title: goal.data.title,
      recordId: parsed.data.id,
      completed: false,
    })
  }
  return removeRow("devotional_week_goals", input)
}
