"use server"

import { estimateSessionKcal, formulaForActivity } from "@/lib/domain/energy"
import { startOfWeek } from "@/lib/domain/dates"
import { blankToNull } from "@/lib/validation/schemas"
import { amountOrNull, cardioGoalSchema, cardioSchema, recordIdSchema } from "@/lib/validation/health"
import { failure, invalid, readyAccount, refreshRecords } from "@/lib/actions/ready"

function saved(message: string) {
  refreshRecords()
  return { ok: true as const, message }
}

export async function saveCardioSession(input: unknown) {
  const parsed = cardioSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const value = parsed.data
  if (value.activity === "other" && !value.customLabel?.trim()) {
    return { ok: false as const, message: "Dê um nome a essa atividade." }
  }
  const ready = await readyAccount()
  if (!ready.ok) return ready

  let energyKind: "none" | "acsm_estimate" | "informed" = "none"
  let energyKcal: number | null = null
  let formula: string | null = null
  let weightUsed: number | null = null

  if (value.energyMode === "informed") {
    const informed = amountOrNull(value.informedKcal)
    if (informed === null) return { ok: false as const, message: "Informe o número que apareceu no equipamento." }
    energyKind = "informed"
    energyKcal = informed
  } else if (value.energyMode === "estimate") {
    const chosen = formulaForActivity(value.activity)
    if (!chosen) {
      return {
        ok: false as const,
        message: "A estimativa ACSM deste aplicativo cobre esteira, caminhada e corrida. Para as outras, informe o número do equipamento ou deixe em branco.",
      }
    }
    const latestWeight = await ready.auth.supabase
      .from("body_weights")
      .select("weight_kg")
      .order("recorded_on", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (latestWeight.error) return failure(latestWeight.error)
    const incline = amountOrNull(value.inclinePercent)
    const estimate = estimateSessionKcal({
      formula: chosen,
      speedKmh: amountOrNull(value.speedKmh),
      inclinePercent: incline ?? 0,
      weightKg: latestWeight.data ? Number(latestWeight.data.weight_kg) : null,
      durationMinutes: value.durationMinutes,
    })
    if (estimate.kind === "unavailable") {
      return { ok: false as const, message: estimate.reason }
    }
    energyKind = "acsm_estimate"
    energyKcal = estimate.kcal
    formula = estimate.formula
    weightUsed = estimate.weightKg
  }

  const created = await ready.auth.supabase.from("cardio_sessions").insert({
    user_id: ready.auth.userId,
    performed_on: value.performedOn,
    activity: value.activity,
    custom_label: value.activity === "other" ? blankToNull(value.customLabel) : null,
    duration_minutes: value.durationMinutes,
    distance_km: amountOrNull(value.distanceKm),
    speed_kmh: amountOrNull(value.speedKmh),
    incline_percent: value.energyMode === "estimate" ? (amountOrNull(value.inclinePercent) ?? 0) : amountOrNull(value.inclinePercent),
    intensity: value.intensity ? value.intensity : null,
    heart_rate_bpm: amountOrNull(value.heartRate),
    energy_kcal: energyKcal,
    energy_kind: energyKind,
    formula,
    weight_kg_used: weightUsed,
    notes: blankToNull(value.notes),
  })
  if (created.error) return failure(created.error)
  if (energyKind === "acsm_estimate") {
    return saved("Atividade registrada. As calorias são uma estimativa ACSM, não uma medição.")
  }
  if (energyKind === "informed") {
    return saved("Atividade registrada. As calorias são o número que você informou.")
  }
  return saved("Atividade registrada, sem valor de calorias.")
}

export async function deleteCardioSession(input: unknown) {
  const parsed = recordIdSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const removed = await ready.auth.supabase.from("cardio_sessions").delete().eq("id", parsed.data.id)
  if (removed.error) return failure(removed.error)
  return saved("Atividade excluída.")
}

export async function saveCardioGoal(input: unknown) {
  const parsed = cardioGoalSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const week = startOfWeek(parsed.data.weekStartsOn)
  const savedGoal = await ready.auth.supabase.from("cardio_week_goals").upsert(
    {
      user_id: ready.auth.userId,
      week_starts_on: week,
      target_sessions: parsed.data.targetSessions,
      target_minutes: amountOrNull(parsed.data.targetMinutes),
    },
    { onConflict: "user_id,week_starts_on" },
  )
  if (savedGoal.error) return failure(savedGoal.error)
  return saved("Meta da semana guardada.")
}
