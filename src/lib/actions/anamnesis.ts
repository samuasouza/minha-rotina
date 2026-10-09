"use server"

import { redirect } from "next/navigation"
import { centimetersFromInput, choosePrimary, kilogramsFromInput, standardMeasures } from "@/lib/domain/anamnesis"
import { todayInTimeZone } from "@/lib/domain/dates"
import { failure, invalid, readyAccount, refreshRecords } from "@/lib/actions/ready"
import { amountOrNull } from "@/lib/validation/health"
import { blankToNull } from "@/lib/validation/schemas"
import {
  goalsStepSchema,
  healthStepSchema,
  measuresStepSchema,
  personalStepSchema,
  routineStepSchema,
} from "@/lib/validation/anamnesis"

function done(message: string) {
  refreshRecords()
  return { ok: true as const, message }
}

type Account = Extract<Awaited<ReturnType<typeof readyAccount>>, { ok: true }>

async function accountToday(ready: Account) {
  const profile = await ready.auth.supabase.from("profiles").select("timezone").eq("id", ready.auth.userId).maybeSingle()
  if (profile.error) return { error: profile.error, today: "" }
  return { error: null, today: todayInTimeZone(profile.data?.timezone ?? "America/Sao_Paulo") }
}

async function saveAnamnesis(
  userId: string,
  supabase: Account["auth"]["supabase"],
  patch: {
    birth_date?: string | null
    height_cm?: number | null
    biological_sex?: "female" | "male" | null
    strength_sessions_per_week?: number | null
    cardio_sessions_per_week?: number | null
    activity_level?: "sedentary" | "light" | "moderate" | "active" | null
    typical_sleep_hours?: number | null
    weekly_availability_minutes?: number | null
    preferred_period?: "morning" | "afternoon" | "evening" | "flexible" | null
    injuries?: string | null
    dietary_restrictions?: string | null
    food_allergies?: string | null
    food_preferences?: string | null
    nutritionist_followup?: boolean | null
    notes?: string | null
    track_sleep?: boolean
    track_energy?: boolean
    track_mood?: boolean
    track_cycle?: boolean
    completed_at?: string | null
  },
  step: number,
) {
  const current = await supabase.from("anamnesis").select("current_step, completed_at").eq("user_id", userId).maybeSingle()
  if (current.error) return { error: current.error }
  const furthest = Math.min(5, Math.max(current.data?.current_step ?? 1, step))
  const saved = await supabase.from("anamnesis").upsert(
    {
      user_id: userId,
      ...patch,
      current_step: furthest,
      deferred_at: null,
    },
    { onConflict: "user_id" },
  )
  return { error: saved.error, completedAt: current.data?.completed_at ?? null }
}

export async function savePersonalStep(input: unknown) {
  const parsed = personalStepSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const today = await accountToday(ready)
  if (today.error) return failure(today.error)
  if (parsed.data.birthDate && parsed.data.birthDate > today.today) {
    return { ok: false as const, message: "A data de nascimento precisa ser hoje ou anterior." }
  }

  const named = await ready.auth.supabase
    .from("profiles")
    .update({ display_name: parsed.data.displayName })
    .eq("id", ready.auth.userId)
  if (named.error) return failure(named.error)

  const preferences = await ready.auth.supabase
    .from("user_preferences")
    .update({ measurement_system: parsed.data.measurementSystem })
    .eq("user_id", ready.auth.userId)
  if (preferences.error) return failure(preferences.error)

  const height = amountOrNull(parsed.data.height)
  const weight = amountOrNull(parsed.data.weight)
  const saved = await saveAnamnesis(ready.auth.userId, ready.auth.supabase, {
    birth_date: blankToNull(parsed.data.birthDate),
    height_cm: height === null ? null : centimetersFromInput(height, parsed.data.measurementSystem),
    biological_sex: parsed.data.sex || null,
  }, 2)
  if (saved.error) return failure(saved.error)

  if (weight !== null) {
    const kilograms = kilogramsFromInput(weight, parsed.data.measurementSystem)
    const recorded = await ready.auth.supabase.from("body_weights").upsert(
      { user_id: ready.auth.userId, recorded_on: today.today, weight_kg: kilograms },
      { onConflict: "user_id,recorded_on" },
    )
    if (recorded.error) return failure(recorded.error)
  }

  return done("Dados pessoais guardados. O peso de hoje foi atualizado no histórico, sem uma segunda linha.")
}

export async function saveGoalsStep(input: unknown) {
  const parsed = goalsStepSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const selected = parsed.data.selected.filter((goal) => goal !== "other")
  const custom = [...new Set(parsed.data.custom.map((item) => item.trim()).filter(Boolean))]
  const primary = choosePrimary(
    [...selected, ...(custom.length > 0 ? ["other" as const] : [])],
    parsed.data.primary,
  )
  const rows = [
    ...selected.map((goal) => ({
      user_id: ready.auth.userId,
      goal,
      custom_label: null,
      is_primary: primary === goal,
    })),
    ...custom.map((label, index) => ({
      user_id: ready.auth.userId,
      goal: "other" as const,
      custom_label: label,
      is_primary: primary === "other" && index === 0,
    })),
  ]
  const removed = await ready.auth.supabase.from("anamnesis_goals").delete().eq("user_id", ready.auth.userId)
  if (removed.error) return failure(removed.error)
  if (rows.length > 0) {
    const inserted = await ready.auth.supabase.from("anamnesis_goals").insert(rows)
    if (inserted.error) return failure(inserted.error)
  }
  const saved = await saveAnamnesis(ready.auth.userId, ready.auth.supabase, {}, 3)
  if (saved.error) return failure(saved.error)
  return done("Objetivos guardados.")
}

export async function saveMeasuresStep(input: unknown) {
  const parsed = measuresStepSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const today = await accountToday(ready)
  if (today.error) return failure(today.error)
  const preferences = await ready.auth.supabase
    .from("user_preferences")
    .select("measurement_system")
    .eq("user_id", ready.auth.userId)
    .maybeSingle()
  if (preferences.error) return failure(preferences.error)
  const system = preferences.data?.measurement_system ?? "metric"

  const entries = [
    ...standardMeasures.map((item) => ({ name: item.name, raw: parsed.data[item.key], unit: "cm" as string, convert: true })),
    ...(blankToNull(parsed.data.extraName) && amountOrNull(parsed.data.extraValue) !== null
      ? [{
          name: blankToNull(parsed.data.extraName)!,
          raw: parsed.data.extraValue,
          unit: blankToNull(parsed.data.extraUnit) ?? "cm",
          convert: !blankToNull(parsed.data.extraUnit),
        }]
      : []),
  ]

  for (const entry of entries) {
    const raw = amountOrNull(entry.raw)
    if (raw === null || raw <= 0) continue
    const value = entry.convert ? centimetersFromInput(raw, system) : raw
    const unit = entry.convert ? "cm" : entry.unit
    if (value <= 0 || value >= 500) {
      return { ok: false as const, message: `${entry.name} ficou fora do intervalo que o histórico aceita.` }
    }
    const existing = await ready.auth.supabase
      .from("measure_definitions")
      .select("id, unit")
      .eq("name", entry.name)
      .maybeSingle()
    if (existing.error) return failure(existing.error)
    if (existing.data && existing.data.unit !== unit) {
      return {
        ok: false as const,
        message: `${entry.name} já existe em ${existing.data.unit}. Atualize essa medida em Meu Corpo para não misturar unidades.`,
      }
    }
    const definition = existing.data
      ? existing.data
      : await ready.auth.supabase
          .from("measure_definitions")
          .insert({ user_id: ready.auth.userId, name: entry.name, unit })
          .select("id, unit")
          .single()
          .then((result) => {
            if (result.error || !result.data) return null
            return result.data
          })
    if (!definition) return { ok: false as const, message: "Não foi possível guardar a medida." }
    const recorded = await ready.auth.supabase.from("body_measurements").upsert(
      {
        user_id: ready.auth.userId,
        definition_id: definition.id,
        recorded_on: today.today,
        value,
      },
      { onConflict: "definition_id,recorded_on" },
    )
    if (recorded.error) return failure(recorded.error)
  }

  const saved = await saveAnamnesis(ready.auth.userId, ready.auth.supabase, {}, 4)
  if (saved.error) return failure(saved.error)
  return done("Medidas de hoje guardadas no histórico do corpo.")
}

export async function saveRoutineStep(input: unknown) {
  const parsed = routineStepSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const strength = amountOrNull(parsed.data.strengthSessions)
  const cardio = amountOrNull(parsed.data.cardioSessions)
  const sleep = amountOrNull(parsed.data.typicalSleepHours)
  const hours = amountOrNull(parsed.data.weeklyHours)
  if ((strength !== null && (strength > 14 || !Number.isInteger(strength))) || (cardio !== null && (cardio > 14 || !Number.isInteger(cardio)))) {
    return { ok: false as const, message: "A frequência fica entre 0 e 14 dias." }
  }
  if (sleep !== null && sleep > 24) return { ok: false as const, message: "O sono habitual fica até 24 horas." }
  if (hours !== null && (hours < 0 || hours > 50)) {
    return { ok: false as const, message: "A disponibilidade fica entre 0 e 50 horas." }
  }
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const saved = await saveAnamnesis(ready.auth.userId, ready.auth.supabase, {
    strength_sessions_per_week: strength,
    cardio_sessions_per_week: cardio,
    activity_level: parsed.data.activityLevel || null,
    typical_sleep_hours: sleep,
    weekly_availability_minutes: hours === null ? null : Math.round(hours * 60),
    preferred_period: parsed.data.preferredPeriod || null,
  }, 5)
  if (saved.error) return failure(saved.error)
  return done("Rotina guardada. O sono habitual não virou um registro do dia.")
}

export async function saveHealthStep(input: unknown) {
  const parsed = healthStepSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const current = await ready.auth.supabase
    .from("anamnesis")
    .select("completed_at")
    .eq("user_id", ready.auth.userId)
    .maybeSingle()
  if (current.error) return failure(current.error)
  const saved = await saveAnamnesis(ready.auth.userId, ready.auth.supabase, {
    injuries: blankToNull(parsed.data.injuries),
    dietary_restrictions: blankToNull(parsed.data.dietaryRestrictions),
    food_allergies: blankToNull(parsed.data.foodAllergies),
    food_preferences: blankToNull(parsed.data.foodPreferences),
    nutritionist_followup: parsed.data.nutritionist === "" ? null : parsed.data.nutritionist === "yes",
    notes: blankToNull(parsed.data.notes),
    track_sleep: parsed.data.trackSleep === true,
    track_energy: parsed.data.trackEnergy === true,
    track_mood: parsed.data.trackMood === true,
    track_cycle: parsed.data.trackCycle === true,
    completed_at: parsed.data.complete
      ? current.data?.completed_at ?? new Date().toISOString()
      : current.data?.completed_at ?? null,
  }, 5)
  if (saved.error) return failure(saved.error)
  return done(parsed.data.complete ? "Anamnese concluída. Dá para revisar tudo em Meu Perfil." : "Preferências guardadas.")
}

export async function deferOnboarding() {
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const saved = await ready.auth.supabase.from("anamnesis").upsert(
    { user_id: ready.auth.userId, deferred_at: new Date().toISOString() },
    { onConflict: "user_id" },
  )
  if (saved.error) return failure(saved.error)
  refreshRecords()
  redirect("/meu-dia")
}
