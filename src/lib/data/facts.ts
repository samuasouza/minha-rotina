import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { emptyFacts, type ActivityFacts } from "@/lib/domain/activity"
import { addIsoDays, startOfWeek, todayInTimeZone } from "@/lib/domain/dates"
import { isSchemaMissing, logOperationFailure } from "@/lib/errors"
import type { AppDatabase } from "@/types/app-database"

type Client = SupabaseClient<AppDatabase>
type QueryError = { code?: string; message?: string }

export type FactsResult = { status: "ready"; facts: ActivityFacts } | { status: "schema_missing" } | { status: "error" }

function numberOrNull(value: number | string | null | undefined) {
  if (value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function numberValue(value: number | string | null | undefined) {
  return numberOrNull(value) ?? 0
}

export async function loadActivityFacts(supabase: Client, from: string, to: string, timeZone: string): Promise<FactsResult> {
  const studyFrom = `${addIsoDays(from, -1)}T00:00:00.000Z`
  const studyTo = `${addIsoDays(to, 2)}T00:00:00.000Z`
  const weekFrom = startOfWeek(from)

  const [
    devotional,
    readingLogs,
    plans,
    planItems,
    sessions,
    study,
    meals,
    water,
    cardio,
    weights,
    priorWeight,
    definitions,
    measurements,
    wellbeing,
    checkins,
    target,
    studyGoals,
    devotionalGoals,
    cardioGoals,
  ] = await Promise.all([
    supabase.from("devotional_entries").select("entry_date, reflection").gte("entry_date", from).lte("entry_date", to).limit(1000),
    supabase.from("reading_logs").select("read_on, plan_item_id").gte("read_on", from).lte("read_on", to).limit(1000),
    supabase.from("reading_plans").select("id, title").limit(1000),
    supabase.from("reading_plan_items").select("id, plan_id").limit(1000),
    supabase.from("workout_sessions").select("id, performed_on").gte("performed_on", from).lte("performed_on", to).limit(1000),
    supabase.from("study_sessions").select("started_at, duration_seconds, status").eq("status", "completed").gte("started_at", studyFrom).lte("started_at", studyTo).limit(1000),
    supabase.from("meal_logs").select("id, eaten_on").gte("eaten_on", from).lte("eaten_on", to).limit(1000),
    supabase.from("water_logs").select("logged_on, milliliters").gte("logged_on", from).lte("logged_on", to).limit(1000),
    supabase.from("cardio_sessions").select("performed_on, duration_minutes, distance_km, energy_kcal, energy_kind").gte("performed_on", from).lte("performed_on", to).limit(1000),
    supabase.from("body_weights").select("recorded_on, weight_kg").gte("recorded_on", from).lte("recorded_on", to).order("recorded_on").limit(1000),
    supabase.from("body_weights").select("recorded_on, weight_kg").lte("recorded_on", from).order("recorded_on", { ascending: false }).limit(1),
    supabase.from("measure_definitions").select("id, name, unit").limit(1000),
    supabase.from("body_measurements").select("definition_id, recorded_on, value").gte("recorded_on", from).lte("recorded_on", to).limit(1000),
    supabase.from("wellbeing_entries").select("entry_date, sleep_hours, energy, mood").gte("entry_date", from).lte("entry_date", to).limit(1000),
    supabase.from("goal_checkins").select("goal_id, recorded_on, amount").gte("recorded_on", from).lte("recorded_on", to).limit(1000),
    supabase.from("nutrition_targets").select("starts_on, kcal, protein_g, carbs_g, fat_g, water_ml").lte("starts_on", to).order("starts_on", { ascending: false }).limit(1),
    supabase.from("study_week_goals").select("week_starts_on, title, is_done").gte("week_starts_on", weekFrom).lte("week_starts_on", to).limit(1000),
    supabase.from("devotional_week_goals").select("week_starts_on, title, is_done").gte("week_starts_on", weekFrom).lte("week_starts_on", to).limit(1000),
    supabase.from("cardio_week_goals").select("week_starts_on, target_sessions, target_minutes").gte("week_starts_on", weekFrom).lte("week_starts_on", to).limit(1000),
  ])

  const queried = [devotional, readingLogs, plans, planItems, sessions, study, meals, water, cardio, weights, priorWeight, definitions, measurements, wellbeing, checkins, target, studyGoals, devotionalGoals, cardioGoals]
  const failure = queried.find((result) => result.error)?.error
  if (failure) return failed(failure)

  const sessionIds = (sessions.data ?? []).map((session) => session.id)
  const mealIds = (meals.data ?? []).map((meal) => meal.id)
  const sets = sessionIds.length === 0
    ? { data: [], error: null }
    : await supabase.from("workout_sets").select("session_id, exercise_id, reps, load_kg, completed").in("session_id", sessionIds).limit(1000)
  const items = mealIds.length === 0
    ? { data: [], error: null }
    : await supabase.from("meal_log_items").select("meal_log_id, kcal, protein_g, carbs_g, fat_g").in("meal_log_id", mealIds).limit(1000)
  if (sets.error) return failed(sets.error)
  if (items.error) return failed(items.error)

  const exerciseIds = [...new Set((sets.data ?? []).map((set) => set.exercise_id))]
  const exercises = exerciseIds.length === 0
    ? { data: [], error: null }
    : await supabase.from("exercises").select("id, name").in("id", exerciseIds).limit(1000)
  if (exercises.error) return failed(exercises.error)

  const truncated = [...queried, sets, items, exercises].some((result) => (result.data?.length ?? 0) >= 1000)
  const sessionDates = new Map((sessions.data ?? []).map((session) => [session.id, session.performed_on]))
  const mealDates = new Map((meals.data ?? []).map((meal) => [meal.id, meal.eaten_on]))
  const exerciseNames = new Map((exercises.data ?? []).map((exercise) => [exercise.id, exercise.name]))
  const planByItem = new Map((planItems.data ?? []).map((item) => [item.id, item.plan_id]))
  const itemCounts = new Map<string, number>()
  for (const item of planItems.data ?? []) itemCounts.set(item.plan_id, (itemCounts.get(item.plan_id) ?? 0) + 1)
  const definitionNames = new Map((definitions.data ?? []).map((definition) => [definition.id, definition]))
  const prior = priorWeight.data?.[0]

  const facts: ActivityFacts = {
    ...emptyFacts(),
    truncated,
    devotionalDates: (devotional.data ?? []).map((entry) => entry.entry_date),
    reflections: (devotional.data ?? [])
      .filter((entry) => entry.reflection?.trim())
      .map((entry) => ({ date: entry.entry_date, text: entry.reflection?.trim().slice(0, 180) ?? "" })),
    readingLogs: (readingLogs.data ?? []).map((log) => ({
      date: log.read_on,
      planId: log.plan_item_id ? planByItem.get(log.plan_item_id) ?? null : null,
    })),
    plans: (plans.data ?? []).map((plan) => ({ id: plan.id, title: plan.title, itemCount: itemCounts.get(plan.id) ?? 0 })),
    workoutDates: (sessions.data ?? []).map((session) => session.performed_on),
    sets: (sets.data ?? []).flatMap((set) => {
      const date = sessionDates.get(set.session_id)
      if (!date) return []
      return [{
        date,
        exerciseName: exerciseNames.get(set.exercise_id) ?? "Exercício",
        reps: numberValue(set.reps),
        loadKg: numberValue(set.load_kg),
        completed: set.completed,
      }]
    }),
    study: (study.data ?? []).flatMap((session) => {
      const date = todayInTimeZone(timeZone, new Date(session.started_at))
      if (date < from || date > to) return []
      const seconds = numberOrNull(session.duration_seconds)
      return [{ date, minutes: seconds === null ? null : Math.round((seconds / 60) * 100) / 100 }]
    }),
    meals: (items.data ?? []).flatMap((item) => {
      const date = mealDates.get(item.meal_log_id)
      if (!date) return []
      return [{
        date,
        kcal: numberValue(item.kcal),
        protein: numberValue(item.protein_g),
        carbs: numberValue(item.carbs_g),
        fat: numberValue(item.fat_g),
      }]
    }),
    water: (water.data ?? []).map((row) => ({ date: row.logged_on, ml: numberValue(row.milliliters) })),
    cardio: (cardio.data ?? []).map((row) => ({
      date: row.performed_on,
      minutes: numberValue(row.duration_minutes),
      distanceKm: numberOrNull(row.distance_km),
      estimateKcal: row.energy_kind === "acsm_estimate" ? numberOrNull(row.energy_kcal) : null,
      informedKcal: row.energy_kind === "informed" ? numberOrNull(row.energy_kcal) : null,
    })),
    weights: (weights.data ?? []).flatMap((row) => {
      const kg = numberOrNull(row.weight_kg)
      return kg === null ? [] : [{ date: row.recorded_on, kg }]
    }),
    weightBefore: prior && numberOrNull(prior.weight_kg) !== null ? { date: prior.recorded_on, kg: numberOrNull(prior.weight_kg) as number } : null,
    measures: (measurements.data ?? []).flatMap((row) => {
      const definition = definitionNames.get(row.definition_id)
      const value = numberOrNull(row.value)
      if (!definition || value === null) return []
      return [{ date: row.recorded_on, name: definition.name, unit: definition.unit, value }]
    }),
    wellbeing: (wellbeing.data ?? []).map((row) => ({
      date: row.entry_date,
      sleep: numberOrNull(row.sleep_hours),
      energy: numberOrNull(row.energy),
      mood: numberOrNull(row.mood),
    })),
    checkins: (checkins.data ?? []).flatMap((row) => {
      const amount = numberOrNull(row.amount)
      return amount === null ? [] : [{ goalId: row.goal_id, date: row.recorded_on, amount }]
    }),
    nutritionTarget: target.data?.[0]
      ? {
          startsOn: target.data[0].starts_on,
          kcal: numberOrNull(target.data[0].kcal),
          protein: numberOrNull(target.data[0].protein_g),
          carbs: numberOrNull(target.data[0].carbs_g),
          fat: numberOrNull(target.data[0].fat_g),
          waterMl: numberOrNull(target.data[0].water_ml),
        }
      : null,
    studyWeekGoals: (studyGoals.data ?? []).map((goal) => ({ weekStartsOn: goal.week_starts_on, title: goal.title, isDone: goal.is_done })),
    devotionalWeekGoals: (devotionalGoals.data ?? []).map((goal) => ({ weekStartsOn: goal.week_starts_on, title: goal.title, isDone: goal.is_done })),
    cardioWeekGoals: (cardioGoals.data ?? []).map((goal) => ({
      weekStartsOn: goal.week_starts_on,
      targetSessions: numberValue(goal.target_sessions),
      targetMinutes: numberOrNull(goal.target_minutes),
    })),
  }

  return { status: "ready", facts }
}

function failed(error: QueryError): FactsResult {
  if (isSchemaMissing(error)) return { status: "schema_missing" }
  logOperationFailure("activity_facts_failed", error)
  return { status: "error" }
}
