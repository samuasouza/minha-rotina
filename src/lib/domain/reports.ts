import { type ActivityFacts, inWindow } from "@/lib/domain/activity"
import { addIsoDays, inclusiveDayCount, startOfWeek } from "@/lib/domain/dates"
import {
  formatQuantity,
  goalProgress,
  percentLabel,
  type GoalDefinition,
} from "@/lib/domain/goals"

export type ChartPoint = { date: string; value: number }

export type PulseLine = { label: string; detail: string }

export function chartSeries(points: ChartPoint[], mode: "sum" | "last"): ChartPoint[] {
  const sorted = [...points].sort((left, right) => left.date.localeCompare(right.date))
  if (sorted.length < 2) return []
  if (sorted.length <= 14) return sorted

  const groups = new Map<string, ChartPoint>()
  for (const point of sorted) {
    const week = startOfWeek(point.date)
    const current = groups.get(week)
    if (!current) {
      groups.set(week, { date: week, value: point.value })
      continue
    }
    current.value = mode === "sum" ? current.value + point.value : point.value
  }

  const bucketed = [...groups.values()]
  return bucketed.length >= 2 ? bucketed : []
}

export function weekPulse(facts: ActivityFacts, goals: GoalDefinition[], titles: Map<string, string>, anchor: string): PulseLine[] {
  const week = { from: startOfWeek(anchor), to: addIsoDays(startOfWeek(anchor), 6) }
  const lines: PulseLine[] = []
  const devotional = new Set(facts.devotionalDates.filter((date) => inWindow(date, week.from, week.to)))
  if (devotional.size > 0) lines.push({ label: "Devocional", detail: `${devotional.size} ${devotional.size === 1 ? "dia com registro" : "dias com registro"}` })

  const sessions = facts.workoutDates.filter((date) => inWindow(date, week.from, week.to))
  if (sessions.length > 0) lines.push({ label: "Treinos", detail: `${sessions.length} ${sessions.length === 1 ? "sessão" : "sessões"}` })

  const cardio = facts.cardio.filter((row) => inWindow(row.date, week.from, week.to))
  if (cardio.length > 0) {
    const minutes = cardio.reduce((sum, row) => sum + row.minutes, 0)
    const estimate = cardio.reduce((sum, row) => sum + (row.estimateKcal ?? 0), 0)
    const estimateDetail = estimate > 0 ? ` · estimativa de ${formatQuantity(estimate)} kcal` : ""
    lines.push({ label: "Cardio", detail: `${formatQuantity(minutes)} min${estimateDetail}` })
  }

  const study = facts.study.filter((row) => row.minutes !== null && inWindow(row.date, week.from, week.to))
  if (study.length > 0) {
    const minutes = study.reduce((sum, row) => sum + (row.minutes ?? 0), 0)
    lines.push({ label: "Estudos", detail: `${formatQuantity(minutes)} min` })
  }

  const water = facts.water.filter((row) => inWindow(row.date, week.from, week.to))
  if (water.length > 0) {
    const ml = water.reduce((sum, row) => sum + row.ml, 0)
    lines.push({ label: "Hidratação", detail: `${formatQuantity(ml)} ml` })
  }

  const active = goals.filter((goal) => goal.status === "active")
  const recorded = active
    .map((goal) => ({ goal, progress: goalProgress(goal, facts, anchor) }))
    .filter((item) => item.progress.amount !== null)
  if (recorded.length > 0) {
    const shown = recorded.slice(0, 3).map((item) => {
      const title = titles.get(item.goal.id) ?? "Meta"
      return `${title}: ${formatQuantity(item.progress.amount ?? 0)}`
    })
    lines.push({ label: "Metas", detail: shown.join(" · ") })
  }

  const ratios = recorded.map((item) => item.progress.ratio).filter((ratio): ratio is number => ratio !== null)
  if (ratios.length > 0) {
    const average = ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length
    lines.push({ label: "Progresso", detail: percentLabel(average) ?? "" })
  }

  return lines
}

export type TrainingReport = {
  sessions: number
  days: number
  volume: number | null
  exercises: string[]
  loads: { name: string; firstDate: string; firstLoad: number; lastDate: string; lastLoad: number }[]
  previousSessions: number | null
  previousVolume: number | null
  chart: ChartPoint[]
}

export function trainingReport(facts: ActivityFacts, from: string, to: string, previousFrom: string, previousTo: string): TrainingReport {
  const sessions = facts.workoutDates.filter((date) => inWindow(date, from, to))
  const sets = facts.sets.filter((set) => set.completed && inWindow(set.date, from, to))
  const previousSets = facts.sets.filter((set) => set.completed && inWindow(set.date, previousFrom, previousTo))
  const previousSessions = facts.workoutDates.filter((date) => inWindow(date, previousFrom, previousTo))
  const byDay = sumByDate(sets.map((set) => ({ date: set.date, value: set.reps * set.loadKg })))

  return {
    sessions: sessions.length,
    days: new Set(sessions).size,
    volume: sets.length === 0 ? null : round2(sets.reduce((sum, set) => sum + set.reps * set.loadKg, 0)),
    exercises: [...new Set(sets.map((set) => set.exerciseName))].sort((left, right) => left.localeCompare(right, "pt-BR")),
    loads: loadChanges(sets),
    previousSessions: previousSessions.length > 0 ? previousSessions.length : null,
    previousVolume: previousSets.length > 0 ? round2(previousSets.reduce((sum, set) => sum + set.reps * set.loadKg, 0)) : null,
    chart: chartSeries(byDay, "sum"),
  }
}

function loadChanges(sets: ActivityFacts["sets"]) {
  const grouped = new Map<string, Map<string, number>>()
  for (const set of sets) {
    const days = grouped.get(set.exerciseName) ?? new Map<string, number>()
    days.set(set.date, Math.max(days.get(set.date) ?? 0, set.loadKg))
    grouped.set(set.exerciseName, days)
  }

  const changes = []
  for (const [name, days] of grouped) {
    const ordered = [...days.entries()].sort((left, right) => left[0].localeCompare(right[0]))
    if (ordered.length < 2) continue
    const first = ordered[0]
    const last = ordered[ordered.length - 1]
    changes.push({ name, firstDate: first[0], firstLoad: first[1], lastDate: last[0], lastLoad: last[1] })
  }
  return changes
}

export type NutritionReport = {
  mealDays: number
  totals: { kcal: number; protein: number; carbs: number; fat: number } | null
  averages: { kcal: number; protein: number; carbs: number; fat: number } | null
  waterDays: number
  waterTotal: number | null
  waterAverage: number | null
  target: ActivityFacts["nutritionTarget"]
  previousAverages: { kcal: number; protein: number; carbs: number; fat: number } | null
  chart: ChartPoint[]
}

export function nutritionReport(facts: ActivityFacts, from: string, to: string, previousFrom: string, previousTo: string): NutritionReport {
  const meals = facts.meals.filter((meal) => inWindow(meal.date, from, to))
  const previous = facts.meals.filter((meal) => inWindow(meal.date, previousFrom, previousTo))
  const water = facts.water.filter((row) => inWindow(row.date, from, to))
  const mealDays = new Set(meals.map((meal) => meal.date)).size
  const waterDays = new Set(water.map((row) => row.date)).size
  const totals = meals.length === 0 ? null : sumMeals(meals)
  const previousTotals = previous.length === 0 ? null : sumMeals(previous)
  const previousDays = new Set(previous.map((meal) => meal.date)).size

  return {
    mealDays,
    totals,
    averages: totals && mealDays > 0 ? divideMeals(totals, mealDays) : null,
    waterDays,
    waterTotal: water.length === 0 ? null : round2(water.reduce((sum, row) => sum + row.ml, 0)),
    waterAverage: water.length === 0 || waterDays === 0 ? null : round2(water.reduce((sum, row) => sum + row.ml, 0) / waterDays),
    target: facts.nutritionTarget && facts.nutritionTarget.startsOn <= to ? facts.nutritionTarget : null,
    previousAverages: previousTotals && previousDays > 0 ? divideMeals(previousTotals, previousDays) : null,
    chart: chartSeries(sumByDate(meals.map((meal) => ({ date: meal.date, value: meal.kcal }))), "sum"),
  }
}

function sumMeals(meals: ActivityFacts["meals"]) {
  return meals.reduce(
    (sum, meal) => ({
      kcal: sum.kcal + meal.kcal,
      protein: sum.protein + meal.protein,
      carbs: sum.carbs + meal.carbs,
      fat: sum.fat + meal.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  )
}

function divideMeals(totals: { kcal: number; protein: number; carbs: number; fat: number }, days: number) {
  return {
    kcal: round2(totals.kcal / days),
    protein: round2(totals.protein / days),
    carbs: round2(totals.carbs / days),
    fat: round2(totals.fat / days),
  }
}

export type CardioReport = {
  sessions: number
  minutes: number
  distanceKm: number | null
  distanceSamples: number
  weeklyFrequency: number | null
  estimateKcal: number | null
  estimateSamples: number
  informedKcal: number | null
  informedSamples: number
  previousSessions: number | null
  chart: ChartPoint[]
}

export function cardioReport(facts: ActivityFacts, from: string, to: string, previousFrom: string, previousTo: string): CardioReport {
  const rows = facts.cardio.filter((row) => inWindow(row.date, from, to))
  const previous = facts.cardio.filter((row) => inWindow(row.date, previousFrom, previousTo))
  const withDistance = rows.filter((row) => row.distanceKm !== null)
  const estimates = rows.filter((row) => row.estimateKcal !== null)
  const informed = rows.filter((row) => row.informedKcal !== null)
  const weeks = Math.max(1, inclusiveDayCount(from, to) / 7)

  return {
    sessions: rows.length,
    minutes: round2(rows.reduce((sum, row) => sum + row.minutes, 0)),
    distanceKm: withDistance.length === 0 ? null : round2(withDistance.reduce((sum, row) => sum + (row.distanceKm ?? 0), 0)),
    distanceSamples: withDistance.length,
    weeklyFrequency: rows.length === 0 ? null : round2(rows.length / weeks),
    estimateKcal: estimates.length === 0 ? null : round2(estimates.reduce((sum, row) => sum + (row.estimateKcal ?? 0), 0)),
    estimateSamples: estimates.length,
    informedKcal: informed.length === 0 ? null : round2(informed.reduce((sum, row) => sum + (row.informedKcal ?? 0), 0)),
    informedSamples: informed.length,
    previousSessions: previous.length > 0 ? previous.length : null,
    chart: chartSeries(sumByDate(rows.map((row) => ({ date: row.date, value: row.minutes }))), "sum"),
  }
}

export type BodyReport = {
  weights: { date: string; kg: number }[]
  chart: ChartPoint[]
  measures: { name: string; unit: string; firstDate: string; firstValue: number; lastDate: string; lastValue: number }[]
}

export function bodyReport(facts: ActivityFacts, from: string, to: string): BodyReport {
  const weights = facts.weights
    .filter((point) => inWindow(point.date, from, to))
    .sort((left, right) => left.date.localeCompare(right.date))
  const grouped = new Map<string, { unit: string; points: { date: string; value: number }[] }>()
  for (const measure of facts.measures.filter((point) => inWindow(point.date, from, to))) {
    const current = grouped.get(measure.name) ?? { unit: measure.unit, points: [] }
    current.points.push({ date: measure.date, value: measure.value })
    grouped.set(measure.name, current)
  }

  const measures = [...grouped.entries()]
    .map(([name, group]) => {
      const ordered = group.points.sort((left, right) => left.date.localeCompare(right.date))
      const first = ordered[0]
      const last = ordered[ordered.length - 1]
      return { name, unit: group.unit, firstDate: first.date, firstValue: first.value, lastDate: last.date, lastValue: last.value }
    })
    .filter((measure) => measure.firstDate !== measure.lastDate)

  return {
    weights,
    chart: chartSeries(weights.map((point) => ({ date: point.date, value: point.kg })), "last"),
    measures,
  }
}

export type StudyReport = {
  sessions: number
  timedSessions: number
  minutes: number | null
  days: number
  goals: { weekStartsOn: string; title: string; isDone: boolean }[]
  chart: ChartPoint[]
}

export function studyReport(facts: ActivityFacts, from: string, to: string): StudyReport {
  const sessions = facts.study.filter((session) => inWindow(session.date, from, to))
  const timed = sessions.filter((session) => session.minutes !== null)
  return {
    sessions: sessions.length,
    timedSessions: timed.length,
    minutes: timed.length === 0 ? null : round2(timed.reduce((sum, session) => sum + (session.minutes ?? 0), 0)),
    days: new Set(sessions.map((session) => session.date)).size,
    goals: facts.studyWeekGoals.filter((goal) => inWindow(goal.weekStartsOn, startOfWeek(from), to)),
    chart: chartSeries(
      sumByDate(timed.map((session) => ({ date: session.date, value: session.minutes ?? 0 }))),
      "sum",
    ),
  }
}

export type DevotionalReport = {
  days: number
  logs: number
  plans: { title: string; logged: number; items: number }[]
  reflections: { date: string; text: string }[]
  goals: { weekStartsOn: string; title: string; isDone: boolean }[]
}

export function devotionalReport(facts: ActivityFacts, from: string, to: string): DevotionalReport {
  const days = new Set(facts.devotionalDates.filter((date) => inWindow(date, from, to)))
  const logs = facts.readingLogs.filter((log) => inWindow(log.date, from, to))
  return {
    days: days.size,
    logs: logs.length,
    plans: facts.plans
      .map((plan) => ({
        title: plan.title,
        items: plan.itemCount,
        logged: logs.filter((log) => log.planId === plan.id).length,
      }))
      .filter((plan) => plan.logged > 0),
    reflections: facts.reflections.filter((entry) => inWindow(entry.date, from, to)).slice(0, 5),
    goals: facts.devotionalWeekGoals.filter((goal) => inWindow(goal.weekStartsOn, startOfWeek(from), to)),
  }
}

export type WellbeingReport = {
  sleepAverage: number | null
  sleepSamples: number
  energyAverage: number | null
  energySamples: number
  moodAverage: number | null
  moodSamples: number
  sleepChart: ChartPoint[]
  energyChart: ChartPoint[]
}

export function wellbeingReport(facts: ActivityFacts, from: string, to: string): WellbeingReport {
  const rows = facts.wellbeing.filter((entry) => inWindow(entry.date, from, to))
  const sleep = rows.filter((entry) => entry.sleep !== null)
  const energy = rows.filter((entry) => entry.energy !== null)
  const mood = rows.filter((entry) => entry.mood !== null)
  return {
    sleepAverage: average(sleep.map((entry) => entry.sleep as number)),
    sleepSamples: sleep.length,
    energyAverage: average(energy.map((entry) => entry.energy as number)),
    energySamples: energy.length,
    moodAverage: average(mood.map((entry) => entry.mood as number)),
    moodSamples: mood.length,
    sleepChart: chartSeries(sleep.map((entry) => ({ date: entry.date, value: entry.sleep as number })), "last"),
    energyChart: chartSeries(energy.map((entry) => ({ date: entry.date, value: entry.energy as number })), "last"),
  }
}

function average(values: number[]) {
  if (values.length === 0) return null
  return round2(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function sumByDate(points: ChartPoint[]) {
  const grouped = new Map<string, number>()
  for (const point of points) grouped.set(point.date, (grouped.get(point.date) ?? 0) + point.value)
  return [...grouped.entries()].map(([date, value]) => ({ date, value: round2(value) }))
}

function round2(value: number) {
  return Math.round(value * 100) / 100
}
