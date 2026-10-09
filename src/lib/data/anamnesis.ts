import "server-only"

import {
  activityLabels,
  goalLabels,
  inputFromCentimeters,
  inputFromKilograms,
  periodLabels,
  standardMeasures,
  type GoalKind,
  type MeasurementSystem,
} from "@/lib/domain/anamnesis"
import { todayInTimeZone } from "@/lib/domain/dates"
import { isSchemaMissing, logOperationFailure } from "@/lib/errors"
import { requireReadyAccount } from "@/lib/data/account"

export type OnboardingGate = "missing" | "open" | "deferred" | "complete" | "unavailable"

export async function loadOnboardingGate(): Promise<OnboardingGate> {
  const account = await requireReadyAccount()
  if (account.status !== "ready") return "unavailable"
  const row = await account.auth.supabase
    .from("anamnesis")
    .select("completed_at, deferred_at")
    .maybeSingle()
  if (row.error) {
    if (isSchemaMissing(row.error)) return "unavailable"
    logOperationFailure("anamnesis_gate_failed", row.error)
    return "unavailable"
  }
  if (!row.data) return "missing"
  if (row.data.completed_at) return "complete"
  if (row.data.deferred_at) return "deferred"
  return "open"
}

function num(value: number | string | null | undefined) {
  if (value === null || value === undefined) return null
  return Number(value)
}

export type ProfileReady = {
  status: "ready"
  displayName: string
  measurementSystem: MeasurementSystem
  birthDate: string | null
  heightInput: number | null
  sex: "" | "female" | "male"
  weightInput: number | null
  weightDate: string | null
  goals: { kind: GoalKind; label: string; isPrimary: boolean }[]
  measures: { key: string; name: string; value: number | null }[]
  strengthSessions: number | null
  cardioSessions: number | null
  activityLevel: string
  typicalSleepHours: number | null
  weeklyHours: number | null
  preferredPeriod: string
  injuries: string
  dietaryRestrictions: string
  foodAllergies: string
  foodPreferences: string
  nutritionist: "" | "yes" | "no"
  notes: string
  trackSleep: boolean
  trackEnergy: boolean
  trackMood: boolean
  trackCycle: boolean
  currentStep: number
  completed: boolean
  baselineWeight: { date: string; kg: number } | null
}

export async function loadProfile(): Promise<
  ProfileReady | { status: "unauthenticated" } | { status: "unconfigured" } | { status: "schema_missing" } | { status: "error" }
> {
  const account = await requireReadyAccount()
  if (account.status !== "ready") return { status: account.status === "unauthenticated" ? "unauthenticated" : account.status }
  const today = todayInTimeZone(account.profile.timezone)
  const db = account.auth.supabase
  const [preferences, anamnesis, goals, weight, baseline, definitions, measurements] = await Promise.all([
    db.from("user_preferences").select("measurement_system").maybeSingle(),
    db.from("anamnesis").select("*").maybeSingle(),
    db.from("anamnesis_goals").select("goal, custom_label, is_primary"),
    db.from("body_weights").select("weight_kg, recorded_on").eq("recorded_on", today).maybeSingle(),
    db.from("body_weights").select("weight_kg, recorded_on").order("recorded_on", { ascending: true }).limit(1).maybeSingle(),
    db.from("measure_definitions").select("id, name, unit"),
    db.from("body_measurements").select("definition_id, value, recorded_on").eq("recorded_on", today),
  ])
  const error = preferences.error || anamnesis.error || goals.error || weight.error || baseline.error || definitions.error || measurements.error
  if (error) {
    if (isSchemaMissing(error)) return { status: "schema_missing" }
    logOperationFailure("profile_read_failed", error)
    return { status: "error" }
  }

  const system = preferences.data?.measurement_system ?? "metric"
  const row = anamnesis.data
  const height = num(row?.height_cm)
  const todayWeight = num(weight.data?.weight_kg)
  const byDefinition = new Map((measurements.data ?? []).map((item) => [item.definition_id, num(item.value)]))
  const definitionByName = new Map((definitions.data ?? []).map((item) => [item.name, item]))

  return {
    status: "ready",
    displayName: account.profile.displayName,
    measurementSystem: system,
    birthDate: row?.birth_date ?? null,
    heightInput: height === null ? null : inputFromCentimeters(height, system),
    sex: row?.biological_sex ?? "",
    weightInput: todayWeight === null ? null : inputFromKilograms(todayWeight, system),
    weightDate: weight.data?.recorded_on ?? null,
    goals: (goals.data ?? []).map((goal) => ({
      kind: goal.goal,
      label: goal.goal === "other" ? goal.custom_label ?? "Outro" : goalLabels[goal.goal],
      isPrimary: goal.is_primary,
    })),
    measures: standardMeasures.map((item) => {
      const definition = definitionByName.get(item.name)
      const stored = definition ? byDefinition.get(definition.id) : null
      const value = stored === null || stored === undefined || definition?.unit !== "cm"
        ? null
        : inputFromCentimeters(stored, system)
      return { key: item.key, name: item.name, value }
    }),
    strengthSessions: row?.strength_sessions_per_week ?? null,
    cardioSessions: row?.cardio_sessions_per_week ?? null,
    activityLevel: row?.activity_level ?? "",
    typicalSleepHours: num(row?.typical_sleep_hours),
    weeklyHours: row?.weekly_availability_minutes == null ? null : Math.round((row.weekly_availability_minutes / 60) * 100) / 100,
    preferredPeriod: row?.preferred_period ?? "",
    injuries: row?.injuries ?? "",
    dietaryRestrictions: row?.dietary_restrictions ?? "",
    foodAllergies: row?.food_allergies ?? "",
    foodPreferences: row?.food_preferences ?? "",
    nutritionist: row?.nutritionist_followup === true ? "yes" : row?.nutritionist_followup === false ? "no" : "",
    notes: row?.notes ?? "",
    trackSleep: row?.track_sleep ?? false,
    trackEnergy: row?.track_energy ?? false,
    trackMood: row?.track_mood ?? false,
    trackCycle: row?.track_cycle ?? false,
    currentStep: row?.current_step ?? 1,
    completed: Boolean(row?.completed_at),
    baselineWeight: baseline.data
      ? { date: baseline.data.recorded_on, kg: Number(baseline.data.weight_kg) }
      : null,
  }
}

export async function loadModuleNotes(module: "nutrition" | "training" | "cardio" | "body" | "wellbeing") {
  const account = await requireReadyAccount()
  if (account.status !== "ready") return []
  const db = account.auth.supabase
  const [anamnesis, goals, weight] = await Promise.all([
    db.from("anamnesis").select("strength_sessions_per_week, cardio_sessions_per_week, injuries, dietary_restrictions, food_allergies, food_preferences, nutritionist_followup, typical_sleep_hours, track_sleep, track_energy, track_mood, track_cycle, activity_level").maybeSingle(),
    db.from("anamnesis_goals").select("goal, custom_label, is_primary"),
    db.from("body_weights").select("weight_kg, recorded_on").order("recorded_on", { ascending: false }).limit(1).maybeSingle(),
  ])
  if (anamnesis.error || goals.error || weight.error) return []
  const row = anamnesis.data
  if (!row && (goals.data ?? []).length === 0 && !weight.data) return []
  const primary = (goals.data ?? []).find((goal) => goal.is_primary)
  const primaryLabel = primary
    ? primary.goal === "other"
      ? primary.custom_label
      : goalLabels[primary.goal]
    : null
  const lines: string[] = []

  if (module === "nutrition") {
    if (primaryLabel) lines.push(`Objetivo principal: ${primaryLabel}. A meta nutricional continua sendo a que você informar.`)
    if (row?.dietary_restrictions) lines.push(`Restrições: ${row.dietary_restrictions}`)
    if (row?.food_allergies) lines.push(`Alergias: ${row.food_allergies}`)
    if (row?.food_preferences) lines.push(`Preferências: ${row.food_preferences}`)
    if (row?.nutritionist_followup) lines.push("Há acompanhamento com nutricionista. O plano prescrito não muda sozinho.")
    if (lines.length > 0) lines.push("Aceitar uma substituição não altera a dieta prescrita.")
  }

  if (module === "training") {
    const training: string[] = []
    if (primaryLabel) training.push(`Objetivo principal: ${primaryLabel}.`)
    if (row?.strength_sessions_per_week !== null && row?.strength_sessions_per_week !== undefined) {
      training.push(`Musculação informada: ${row.strength_sessions_per_week} dias por semana.`)
    }
    if (row?.injuries) training.push(`Limitação para exercícios: ${row.injuries}`)
    if (training.length > 0) {
      training.push("Uma sugestão de carga só muda a ficha depois da sua confirmação.")
      lines.push(...training)
    }
  }

  if (module === "cardio") {
    if (row?.cardio_sessions_per_week !== null && row?.cardio_sessions_per_week !== undefined) {
      lines.push(`Frequência informada: ${row.cardio_sessions_per_week} dias por semana.`)
    }
    if (weight.data) {
      lines.push(`A estimativa ACSM usa o peso de ${weight.data.recorded_on}: ${Number(weight.data.weight_kg)} kg.`)
    } else {
      lines.push("Sem um peso com data, a estimativa ACSM não é calculada.")
    }
  }

  if (module === "body") {
    const first = await db.from("body_weights").select("recorded_on, weight_kg").order("recorded_on", { ascending: true }).limit(1).maybeSingle()
    if (first.data) {
      lines.push(`Linha de base do peso: ${Number(first.data.weight_kg)} kg em ${first.data.recorded_on}.`)
      lines.push("Preencher a anamnese de novo no mesmo dia atualiza o ponto daquele dia.")
    }
  }

  if (module === "wellbeing" && row) {
    if (row.typical_sleep_hours !== null) {
      lines.push(`Sono habitual informado: ${Number(row.typical_sleep_hours)} h. O registro deste dia continua separado.`)
    }
    const tracks = [
      row.track_sleep ? "sono" : null,
      row.track_energy ? "energia" : null,
      row.track_mood ? "humor" : null,
      row.track_cycle ? "ciclo" : null,
    ].filter(Boolean)
    if (tracks.length > 0) lines.push(`Acompanhamento escolhido: ${tracks.join(", ")}.`)
    if (row.activity_level) lines.push(`Atividade habitual: ${activityLabels[row.activity_level]}.`)
  }

  return lines
}

export function periodLabel(value: string) {
  if (value in periodLabels) return periodLabels[value as keyof typeof periodLabels]
  return ""
}
