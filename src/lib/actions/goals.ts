"use server"

import { failure, invalid, readyAccount, refreshRecords } from "@/lib/actions/ready"
import { snoozeUntil } from "@/lib/domain/goals"
import { blankToNull } from "@/lib/validation/schemas"
import { checkinSchema, goalSchema, goalUpdateSchema, reminderSchema, reminderUpdateSchema, snoozeSchema } from "@/lib/validation/goals"

function goalPayload(value: {
  title: string
  category: (typeof goalSchema)["_output"]["category"]
  measure: (typeof goalSchema)["_output"]["measure"]
  targetValue: number
  unit: string
  period: (typeof goalSchema)["_output"]["period"]
  customDays?: string
  startsOn: string
  endsOn?: string
}) {
  return {
    title: value.title,
    category: value.category,
    measure: value.measure,
    target_value: value.targetValue,
    unit: value.unit,
    period: value.period,
    custom_days: value.period === "custom" ? Number(value.customDays) : null,
    starts_on: value.startsOn,
    ends_on: blankToNull(value.endsOn),
  }
}

export async function createGoal(input: unknown) {
  const parsed = goalSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const saved = await ready.auth.supabase.from("personal_goals").insert({
    user_id: ready.auth.userId,
    ...goalPayload(parsed.data),
  })
  if (saved.error) return failure(saved.error)
  refreshRecords()
  return { ok: true as const, message: "Meta guardada." }
}

export async function updateGoal(input: unknown) {
  const parsed = goalUpdateSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const existing = await ready.auth.supabase.from("personal_goals").select("measure").eq("id", parsed.data.id).maybeSingle()
  if (existing.error) return failure(existing.error)
  if (!existing.data) return { ok: false as const, message: "Não encontrei essa meta." }
  if (existing.data.measure !== parsed.data.measure) {
    return { ok: false as const, message: "A medição da meta permanece a mesma. Arquive esta meta e crie outra se quiser medir de outro jeito." }
  }
  const saved = await ready.auth.supabase
    .from("personal_goals")
    .update({ ...goalPayload(parsed.data), status: parsed.data.status })
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle()
  if (saved.error) return failure(saved.error)
  if (!saved.data) return { ok: false as const, message: "Não encontrei essa meta." }
  refreshRecords()
  return { ok: true as const, message: "Meta atualizada. O valor anterior ficou no histórico." }
}

export async function saveCheckin(input: unknown) {
  const parsed = checkinSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const goal = await ready.auth.supabase.from("personal_goals").select("measure").eq("id", parsed.data.goalId).maybeSingle()
  if (goal.error) return failure(goal.error)
  if (!goal.data) return { ok: false as const, message: "Não encontrei essa meta." }
  if (goal.data.measure !== "manual") {
    return { ok: false as const, message: "Esta meta é calculada pelos registros do módulo e não aceita outro lançamento." }
  }
  const saved = await ready.auth.supabase.from("goal_checkins").upsert(
    {
      goal_id: parsed.data.goalId,
      user_id: ready.auth.userId,
      recorded_on: parsed.data.recordedOn,
      amount: parsed.data.amount,
      note: blankToNull(parsed.data.note),
    },
    { onConflict: "goal_id,recorded_on" },
  )
  if (saved.error) return failure(saved.error)
  refreshRecords()
  return { ok: true as const, message: "Lançamento manual guardado." }
}

export async function createReminder(input: unknown) {
  const parsed = reminderSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const saved = await ready.auth.supabase.from("reminders").insert({
    user_id: ready.auth.userId,
    title: parsed.data.title,
    kind: parsed.data.kind,
    goal_id: parsed.data.goalId || null,
    enabled: parsed.data.enabled,
    remind_at: parsed.data.remindAt,
    weekdays: [...new Set(parsed.data.weekdays)].sort((left, right) => left - right),
  })
  if (saved.error) return failure(saved.error)
  refreshRecords()
  return { ok: true as const, message: "Lembrete guardado. Ele aparece no Meu Dia, sem notificação push." }
}

export async function updateReminder(input: unknown) {
  const parsed = reminderUpdateSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const saved = await ready.auth.supabase
    .from("reminders")
    .update({
      title: parsed.data.title,
      kind: parsed.data.kind,
      goal_id: parsed.data.goalId || null,
      enabled: parsed.data.enabled,
      remind_at: parsed.data.remindAt,
      weekdays: [...new Set(parsed.data.weekdays)].sort((left, right) => left - right),
    })
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle()
  if (saved.error) return failure(saved.error)
  if (!saved.data) return { ok: false as const, message: "Não encontrei esse lembrete." }
  refreshRecords()
  return { ok: true as const, message: "Lembrete atualizado." }
}

export async function deleteReminder(id: string) {
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const saved = await ready.auth.supabase.from("reminders").delete().eq("id", id).select("id").maybeSingle()
  if (saved.error) return failure(saved.error)
  if (!saved.data) return { ok: false as const, message: "Não encontrei esse lembrete." }
  refreshRecords()
  return { ok: true as const, message: "Lembrete excluído." }
}

export async function snoozeReminder(input: unknown) {
  const parsed = snoozeSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const reminder = await ready.auth.supabase.from("reminders").select("remind_at").eq("id", parsed.data.id).maybeSingle()
  const profile = await ready.auth.supabase.from("profiles").select("timezone").eq("id", ready.auth.userId).maybeSingle()
  if (reminder.error) return failure(reminder.error)
  if (profile.error) return failure(profile.error)
  if (!reminder.data || !profile.data) return { ok: false as const, message: "Não encontrei esse lembrete." }
  const saved = await ready.auth.supabase
    .from("reminders")
    .update({ snoozed_until: snoozeUntil(parsed.data.mode, new Date(), profile.data.timezone, reminder.data.remind_at) })
    .eq("id", parsed.data.id)
  if (saved.error) return failure(saved.error)
  refreshRecords()
  return { ok: true as const, message: parsed.data.mode === "later" ? "Lembrete adiado por 2 horas." : "Lembrete adiado para amanhã." }
}
