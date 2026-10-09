import "server-only"

import { compareIntake, sumLines, type Intake, type MacroLine } from "@/lib/domain/nutrition"
import { resolveRequestedDate, startOfWeek, addIsoDays } from "@/lib/domain/dates"
import { isSchemaMissing, logOperationFailure } from "@/lib/errors"
import { requireReadyAccount } from "@/lib/data/account"

type Gate = { status: "unconfigured" } | { status: "unauthenticated" } | { status: "schema_missing" } | { status: "error" }

function num(value: number | string | null | undefined) {
  if (value === null || value === undefined) return 0
  return Number(value)
}

function nullable(value: number | string | null | undefined) {
  if (value === null || value === undefined) return null
  return Number(value)
}

async function gate(requested?: string) {
  const account = await requireReadyAccount()
  if (account.status !== "ready") return { account, date: "", today: "" }
  const date = resolveRequestedDate(requested, account.profile.timezone)
  const today = resolveRequestedDate(undefined, account.profile.timezone)
  return { account, date, today }
}

function failed(error: { code?: string; message?: string } | null): Gate | null {
  if (!error) return null
  if (isSchemaMissing(error)) return { status: "schema_missing" }
  logOperationFailure("health_read_failed", error)
  return { status: "error" }
}

export type NutritionReady = {
  status: "ready"
  date: string
  today: string
  foods: { id: string; name: string; basisQuantity: number; unit: string; kcal: number; protein: number; carbs: number; fat: number; source: string }[]
  meals: { id: string; name: string; items: { name: string; quantity: number; unit: string; kcal: number; source: string }[] }[]
  water: { id: string; milliliters: number }[]
  intake: Intake
  comparison: ReturnType<typeof compareIntake>
  favorites: { id: string; name: string }[]
  plans: {
    id: string
    title: string
    prescribedBy: string | null
    prescribedOn: string | null
    meals: {
      id: string
      name: string
      items: { id: string; label: string; quantity: number | null; unit: string | null }[]
    }[]
  }[]
  archivedPlans: { id: string; title: string }[]
  substitutions: {
    id: string
    itemId: string
    status: string
    suggestedQuantity: number
    original: MacroLine | null
    suggested: MacroLine
  }[]
}

export async function loadNutrition(requested?: string): Promise<Gate | NutritionReady> {
  const { account, date, today } = await gate(requested)
  if (account.status !== "ready") return account
  const db = account.auth.supabase
  const [foods, meals, items, water, targets, favorites, plans, dietMeals, dietItems, substitutions, archived] = await Promise.all([
    db.from("foods").select("id, name, basis_quantity, basis_unit, kcal, protein_g, carbs_g, fat_g, source_note").order("name"),
    db.from("meal_logs").select("id, name").eq("eaten_on", date).order("created_at"),
    db.from("meal_log_items").select("meal_log_id, name_snapshot, quantity, unit, kcal, protein_g, carbs_g, fat_g, source_note"),
    db.from("water_logs").select("id, milliliters, logged_on").eq("logged_on", date),
    db.from("nutrition_targets").select("starts_on, kcal, protein_g, carbs_g, fat_g, water_ml").lte("starts_on", date).order("starts_on", { ascending: false }).limit(1),
    db.from("meal_templates").select("id, name").eq("is_favorite", true).order("name"),
    db.from("diet_plans").select("id, title, prescribed_by, prescribed_on").is("archived_at", null).order("created_at", { ascending: false }),
    db.from("diet_meals").select("id, plan_id, name, position").is("archived_at", null).order("position"),
    db.from("diet_items").select("id, meal_id, label, quantity, unit, position").is("archived_at", null).order("position"),
    db.from("food_substitutions").select("id, diet_item_id, status, suggested_quantity, original_kcal, original_protein_g, original_carbs_g, original_fat_g, suggested_kcal, suggested_protein_g, suggested_carbs_g, suggested_fat_g").order("created_at", { ascending: false }),
    db.from("diet_plans").select("id, title").not("archived_at", "is", null).order("archived_at", { ascending: false }),
  ])
  const error = [foods, meals, items, water, targets, favorites, plans, dietMeals, dietItems, substitutions, archived].find((result) => result.error)?.error
  const stop = failed(error ?? null)
  if (stop) return stop

  const mealItems = items.data ?? []
  const lines = mealItems.map((item) => ({
    kcal: num(item.kcal),
    protein: num(item.protein_g),
    carbs: num(item.carbs_g),
    fat: num(item.fat_g),
  }))
  const macros = sumLines(lines)
  const waterMl = (water.data ?? []).reduce((total, row) => total + num(row.milliliters), 0)
  const target = targets.data?.[0]
  const intake: Intake = { ...macros, waterMl }
  const activePlanIds = new Set((plans.data ?? []).map((plan) => plan.id))
  const activeMealIds = new Set((dietMeals.data ?? []).filter((meal) => activePlanIds.has(meal.plan_id)).map((meal) => meal.id))

  return {
    status: "ready",
    date,
    today,
    foods: (foods.data ?? []).map((food) => ({
      id: food.id,
      name: food.name,
      basisQuantity: num(food.basis_quantity),
      unit: food.basis_unit,
      kcal: num(food.kcal),
      protein: num(food.protein_g),
      carbs: num(food.carbs_g),
      fat: num(food.fat_g),
      source: food.source_note,
    })),
    meals: (meals.data ?? []).map((meal) => ({
      id: meal.id,
      name: meal.name,
      items: mealItems
        .filter((item) => item.meal_log_id === meal.id)
        .map((item) => ({
          name: item.name_snapshot,
          quantity: num(item.quantity),
          unit: item.unit,
          kcal: num(item.kcal),
          source: item.source_note,
        })),
    })),
    water: (water.data ?? []).map((row) => ({ id: row.id, milliliters: num(row.milliliters) })),
    intake,
    comparison: compareIntake(intake, {
      kcal: target ? nullable(target.kcal) : null,
      protein: target ? nullable(target.protein_g) : null,
      carbs: target ? nullable(target.carbs_g) : null,
      fat: target ? nullable(target.fat_g) : null,
      waterMl: target ? nullable(target.water_ml) : null,
    }),
    favorites: favorites.data ?? [],
    plans: (plans.data ?? []).map((plan) => ({
      id: plan.id,
      title: plan.title,
      prescribedBy: plan.prescribed_by,
      prescribedOn: plan.prescribed_on,
      meals: (dietMeals.data ?? [])
        .filter((meal) => meal.plan_id === plan.id)
        .map((meal) => ({
          id: meal.id,
          name: meal.name,
          items: (dietItems.data ?? [])
            .filter((item) => item.meal_id === meal.id)
            .map((item) => ({
              id: item.id,
              label: item.label,
              quantity: nullable(item.quantity),
              unit: item.unit,
            })),
        })),
    })),
    archivedPlans: archived.data ?? [],
    substitutions: (substitutions.data ?? [])
      .filter((row) => activeMealIds.size === 0 || (dietItems.data ?? []).some((item) => item.id === row.diet_item_id && activeMealIds.has(item.meal_id)))
      .map((row) => ({
        id: row.id,
        itemId: row.diet_item_id,
        status: row.status,
        suggestedQuantity: num(row.suggested_quantity),
        original: row.original_kcal === null ? null : {
          kcal: num(row.original_kcal),
          protein: num(row.original_protein_g),
          carbs: num(row.original_carbs_g),
          fat: num(row.original_fat_g),
        },
        suggested: {
          kcal: num(row.suggested_kcal),
          protein: num(row.suggested_protein_g),
          carbs: num(row.suggested_carbs_g),
          fat: num(row.suggested_fat_g),
        },
      })),
  }
}

export type CardioReady = {
  status: "ready"
  date: string
  today: string
  weekStart: string
  sessions: {
    id: string
    date: string
    activity: string
    label: string | null
    minutes: number
    distance: number | null
    speed: number | null
    incline: number | null
    intensity: string | null
    heartRate: number | null
    kcal: number | null
    kind: string
    formula: string | null
    weight: number | null
  }[]
  goal: { sessions: number; minutes: number | null } | null
  weekMinutes: number
  weekSessions: number
}

const activityLabels: Record<string, string> = {
  treadmill: "Esteira",
  walk: "Caminhada",
  run: "Corrida",
  cycle: "Bicicleta",
  other: "Outra",
}

export async function loadCardio(requested?: string): Promise<Gate | CardioReady> {
  const { account, date, today } = await gate(requested)
  if (account.status !== "ready") return account
  const weekStart = startOfWeek(date)
  const weekEnd = addIsoDays(weekStart, 6)
  const db = account.auth.supabase
  const [sessions, goal] = await Promise.all([
    db.from("cardio_sessions").select("id, performed_on, activity, custom_label, duration_minutes, distance_km, speed_kmh, incline_percent, intensity, heart_rate_bpm, energy_kcal, energy_kind, formula, weight_kg_used").gte("performed_on", weekStart).lte("performed_on", weekEnd).order("performed_on", { ascending: false }),
    db.from("cardio_week_goals").select("target_sessions, target_minutes").eq("week_starts_on", weekStart).maybeSingle(),
  ])
  const stop = failed(sessions.error ?? goal.error)
  if (stop) return stop
  const rows = sessions.data ?? []
  return {
    status: "ready",
    date,
    today,
    weekStart,
    sessions: rows.map((row) => ({
      id: row.id,
      date: row.performed_on,
      activity: activityLabels[row.activity] ?? row.activity,
      label: row.custom_label,
      minutes: row.duration_minutes,
      distance: nullable(row.distance_km),
      speed: nullable(row.speed_kmh),
      incline: nullable(row.incline_percent),
      intensity: row.intensity,
      heartRate: row.heart_rate_bpm,
      kcal: nullable(row.energy_kcal),
      kind: row.energy_kind,
      formula: row.formula,
      weight: nullable(row.weight_kg_used),
    })),
    goal: goal.data ? { sessions: goal.data.target_sessions, minutes: goal.data.target_minutes } : null,
    weekMinutes: rows.reduce((total, row) => total + row.duration_minutes, 0),
    weekSessions: rows.length,
  }
}

export type BodyReady = {
  status: "ready"
  date: string
  today: string
  weights: { id: string; date: string; kg: number }[]
  definitions: { id: string; name: string; unit: string }[]
  measurements: { id: string; definitionId: string; date: string; value: number }[]
  photos: { id: string; date: string; caption: string | null; url: string | null }[]
}

export async function loadBody(requested?: string): Promise<Gate | BodyReady> {
  const { account, date, today } = await gate(requested)
  if (account.status !== "ready") return account
  const db = account.auth.supabase
  const [weights, definitions, measurements, photos] = await Promise.all([
    db.from("body_weights").select("id, recorded_on, weight_kg").order("recorded_on"),
    db.from("measure_definitions").select("id, name, unit").order("name"),
    db.from("body_measurements").select("id, definition_id, recorded_on, value").order("recorded_on"),
    db.from("body_photos").select("id, recorded_on, storage_path, caption").order("recorded_on", { ascending: false }),
  ])
  const stop = failed(weights.error ?? definitions.error ?? measurements.error ?? photos.error)
  if (stop) return stop
  const signed = await Promise.all(
    (photos.data ?? []).map(async (photo) => {
      const url = await db.storage.from("body-photos").createSignedUrl(photo.storage_path, 600)
      return {
        id: photo.id,
        date: photo.recorded_on,
        caption: photo.caption,
        url: url.error ? null : url.data.signedUrl,
      }
    }),
  )
  return {
    status: "ready",
    date,
    today,
    weights: (weights.data ?? []).map((row) => ({ id: row.id, date: row.recorded_on, kg: num(row.weight_kg) })),
    definitions: definitions.data ?? [],
    measurements: (measurements.data ?? []).map((row) => ({
      id: row.id,
      definitionId: row.definition_id,
      date: row.recorded_on,
      value: num(row.value),
    })),
    photos: signed,
  }
}

export type WellbeingReady = {
  status: "ready"
  date: string
  today: string
  entry: {
    sleepHours: number | null
    sleepQuality: number | null
    energy: number | null
    mood: number | null
    menstruation: boolean | null
    notes: string | null
  } | null
  history: { date: string; sleepHours: number | null; energy: number | null; mood: number | null }[]
}

export async function loadWellbeing(requested?: string): Promise<Gate | WellbeingReady> {
  const { account, date, today } = await gate(requested)
  if (account.status !== "ready") return account
  const rows = await account.auth.supabase
    .from("wellbeing_entries")
    .select("entry_date, sleep_hours, sleep_quality, energy, mood, menstruation, notes")
    .order("entry_date", { ascending: false })
    .limit(30)
  const stop = failed(rows.error)
  if (stop) return stop
  const list = rows.data ?? []
  const current = list.find((row) => row.entry_date === date) ?? null
  return {
    status: "ready",
    date,
    today,
    entry: current
      ? {
          sleepHours: nullable(current.sleep_hours),
          sleepQuality: current.sleep_quality,
          energy: current.energy,
          mood: current.mood,
          menstruation: current.menstruation,
          notes: current.notes,
        }
      : null,
    history: list.map((row) => ({
      date: row.entry_date,
      sleepHours: nullable(row.sleep_hours),
      energy: row.energy,
      mood: row.mood,
    })),
  }
}

export type DayHealth = {
  hasIntake: boolean
  kcal: number
  protein: number
  carbs: number
  fat: number
  hasWater: boolean
  waterMl: number
  hasCardio: boolean
  cardioMinutes: number
  estimateKcal: number
  informedKcal: number
  weightKg: number | null
  mood: number | null
  energyLevel: number | null
  sleepHours: number | null
}

export async function loadDayHealth(
  supabase: Extract<Awaited<ReturnType<typeof requireReadyAccount>>, { status: "ready" }>["auth"]["supabase"],
  date: string,
): Promise<DayHealth | null> {
  const meals = await supabase.from("meal_logs").select("id").eq("eaten_on", date)
  const mealIds = (meals.data ?? []).map((meal) => meal.id)
  const items = mealIds.length
    ? await supabase.from("meal_log_items").select("kcal, protein_g, carbs_g, fat_g").in("meal_log_id", mealIds)
    : { data: [], error: null }
  const [water, cardio, weight, wellbeing] = await Promise.all([
    supabase.from("water_logs").select("milliliters").eq("logged_on", date),
    supabase.from("cardio_sessions").select("duration_minutes, energy_kcal, energy_kind").eq("performed_on", date),
    supabase.from("body_weights").select("weight_kg").eq("recorded_on", date).maybeSingle(),
    supabase.from("wellbeing_entries").select("mood, energy, sleep_hours").eq("entry_date", date).maybeSingle(),
  ])
  if ([meals, items, water, cardio, weight, wellbeing].some((result) => result.error && isSchemaMissing(result.error))) {
    return null
  }
  const lines = (items.data ?? []).map((item) => ({
    kcal: num(item.kcal),
    protein: num(item.protein_g),
    carbs: num(item.carbs_g),
    fat: num(item.fat_g),
  }))
  const macros = sumLines(lines)
  const sessions = cardio.data ?? []
  return {
    hasIntake: lines.length > 0,
    ...macros,
    hasWater: (water.data ?? []).length > 0,
    waterMl: (water.data ?? []).reduce((total, row) => total + num(row.milliliters), 0),
    hasCardio: sessions.length > 0,
    cardioMinutes: sessions.reduce((total, row) => total + row.duration_minutes, 0),
    estimateKcal: sessions.filter((row) => row.energy_kind === "acsm_estimate").reduce((total, row) => total + num(row.energy_kcal), 0),
    informedKcal: sessions.filter((row) => row.energy_kind === "informed").reduce((total, row) => total + num(row.energy_kcal), 0),
    weightKg: weight.data ? num(weight.data.weight_kg) : null,
    mood: wellbeing.data?.mood ?? null,
    energyLevel: wellbeing.data?.energy ?? null,
    sleepHours: wellbeing.data ? nullable(wellbeing.data.sleep_hours) : null,
  }
}
