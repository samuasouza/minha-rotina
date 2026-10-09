import type { ActivityFacts } from "@/lib/domain/activity"
import { inWindow } from "@/lib/domain/activity"
import {
  addIsoDays,
  clockInTimeZone,
  endOfMonth,
  inclusiveDayCount,
  isIsoDate,
  startOfMonth,
  startOfWeek,
  todayInTimeZone,
  weekdayOfIsoDate,
  zonedLocalToUtc,
} from "@/lib/domain/dates"

export const goalPeriods = ["daily", "weekly", "monthly", "custom"] as const
export const goalCategories = [
  "devotional",
  "training",
  "study",
  "nutrition",
  "hydration",
  "cardio",
  "body",
  "wellbeing",
  "habit",
] as const
export const goalMeasures = [
  "manual",
  "devotional_days",
  "workout_sessions",
  "training_volume",
  "study_minutes",
  "nutrition_kcal",
  "nutrition_protein",
  "water_ml",
  "cardio_sessions",
  "cardio_minutes",
  "body_weight",
  "sleep_hours",
] as const
export const goalStatuses = ["active", "paused", "completed", "archived"] as const
export const reminderKinds = ["devotional", "training", "study", "water", "appointment", "goal"] as const

export type GoalPeriod = (typeof goalPeriods)[number]
export type GoalCategory = (typeof goalCategories)[number]
export type GoalMeasure = (typeof goalMeasures)[number]
export type GoalStatus = (typeof goalStatuses)[number]
export type ReminderKind = (typeof reminderKinds)[number]

export const categoryLabels: Record<GoalCategory, string> = {
  devotional: "Devocional",
  training: "Treinos",
  study: "Estudos",
  nutrition: "Alimentação",
  hydration: "Hidratação",
  cardio: "Cardio",
  body: "Evolução corporal",
  wellbeing: "Bem-estar",
  habit: "Hábito personalizado",
}

export const periodLabels: Record<GoalPeriod, string> = {
  daily: "Diária",
  weekly: "Semanal",
  monthly: "Mensal",
  custom: "Personalizada",
}

export const measureLabels: Record<GoalMeasure, string> = {
  manual: "Manual",
  devotional_days: "Dias com devocional",
  workout_sessions: "Sessões de treino",
  training_volume: "Volume de treino",
  study_minutes: "Minutos de estudo",
  nutrition_kcal: "Calorias",
  nutrition_protein: "Proteína",
  water_ml: "Água",
  cardio_sessions: "Sessões de cardio",
  cardio_minutes: "Minutos de cardio",
  body_weight: "Peso",
  sleep_hours: "Horas de sono",
}

export const statusLabels: Record<GoalStatus, string> = {
  active: "Ativa",
  paused: "Pausada",
  completed: "Concluída",
  archived: "Arquivada",
}

export const reminderLabels: Record<ReminderKind, string> = {
  devotional: "Devocional",
  training: "Treinos",
  study: "Estudos",
  water: "Água",
  appointment: "Compromissos",
  goal: "Meta pessoal",
}

export const defaultUnits: Record<GoalMeasure, string> = {
  manual: "vezes",
  devotional_days: "dias",
  workout_sessions: "sessões",
  training_volume: "kg",
  study_minutes: "min",
  nutrition_kcal: "kcal",
  nutrition_protein: "g",
  water_ml: "ml",
  cardio_sessions: "sessões",
  cardio_minutes: "min",
  body_weight: "kg",
  sleep_hours: "h",
}

export type GoalWindow = { from: string; to: string }

export type GoalDefinition = {
  id: string
  measure: GoalMeasure
  target: number
  period: GoalPeriod
  customDays: number | null
  startsOn: string
  endsOn: string | null
  status: GoalStatus
}

export type GoalProgress = {
  window: GoalWindow | null
  amount: number | null
  ratio: number | null
  samples: number
}

export function periodWindow(input: {
  period: GoalPeriod
  anchor: string
  startsOn: string
  endsOn: string | null
  customDays: number | null
}): GoalWindow | null {
  if (input.anchor < input.startsOn) return null
  if (input.endsOn && input.anchor > input.endsOn) return null

  let from = input.anchor
  let to = input.anchor

  if (input.period === "weekly") {
    from = startOfWeek(input.anchor)
    to = addIsoDays(from, 6)
  } else if (input.period === "monthly") {
    from = startOfMonth(input.anchor)
    to = endOfMonth(input.anchor)
  } else if (input.period === "custom") {
    if (!input.customDays || input.customDays < 1) return null
    to = input.anchor
    from = addIsoDays(input.anchor, 1 - input.customDays)
  }

  if (from < input.startsOn) from = input.startsOn
  if (input.endsOn && to > input.endsOn) to = input.endsOn
  if (from > to) return null
  return { from, to }
}

export function reportBounds(
  preset: "7" | "30" | "90" | "custom",
  today: string,
  customFrom?: string,
  customTo?: string,
): { from: string; to: string; previousFrom: string; previousTo: string } | null {
  if (preset === "custom") {
    if (!customFrom || !customTo || !isIsoDate(customFrom) || !isIsoDate(customTo) || customFrom > customTo) {
      return null
    }
    if (inclusiveDayCount(customFrom, customTo) > 366) return null
    const length = inclusiveDayCount(customFrom, customTo)
    const previousTo = addIsoDays(customFrom, -1)
    return {
      from: customFrom,
      to: customTo,
      previousFrom: addIsoDays(previousTo, 1 - length),
      previousTo,
    }
  }

  const length = preset === "7" ? 7 : preset === "30" ? 30 : 90
  const from = addIsoDays(today, 1 - length)
  const previousTo = addIsoDays(from, -1)
  return {
    from,
    to: today,
    previousFrom: addIsoDays(previousTo, 1 - length),
    previousTo,
  }
}

export function goalProgress(goal: GoalDefinition, facts: ActivityFacts, anchor: string): GoalProgress {
  const window = periodWindow({
    period: goal.period,
    anchor,
    startsOn: goal.startsOn,
    endsOn: goal.endsOn,
    customDays: goal.customDays,
  })
  if (!window) return { window: null, amount: null, ratio: null, samples: 0 }

  if (goal.measure === "body_weight") {
    return { window, ...weightProgress(facts, window, goal.target, goal.startsOn) }
  }
  if (goal.measure === "sleep_hours") {
    return { window, ...averageProgress(sleepValues(facts, window), goal.target) }
  }

  const total = totalForMeasure(goal, facts, window)
  if (total === null) return { window, amount: null, ratio: null, samples: 0 }
  return { window, amount: round2(total.amount), ratio: completionRatio(total.amount, goal.target), samples: total.samples }
}

function weightProgress(facts: ActivityFacts, window: GoalWindow, target: number, startsOn: string) {
  const known = [...new Map(
    [facts.weightBefore, ...facts.weights]
      .filter((point): point is { date: string; kg: number } => point !== null)
      .map((point) => [point.date, point]),
  ).values()]
  const inside = known
    .filter((point) => inWindow(point.date, window.from, window.to))
    .sort((left, right) => left.date.localeCompare(right.date))
  const latest = inside.at(-1) ?? null
  if (!latest) return { amount: null, ratio: null, samples: 0 }

  const baseline = known
    .filter((point) => point.date <= startsOn && point.date !== latest.date)
    .sort((left, right) => right.date.localeCompare(left.date))[0]
  if (!baseline) return { amount: round2(latest.kg), ratio: null, samples: inside.length }
  return {
    amount: round2(latest.kg),
    ratio: bodyRatio(baseline.kg, latest.kg, target),
    samples: inside.length,
  }
}

function bodyRatio(baseline: number, latest: number, target: number) {
  const gap = target - baseline
  if (gap === 0) return latest === target ? 1 : 0
  return Math.min(1, Math.max(0, (latest - baseline) / gap))
}

function averageProgress(values: number[], target: number) {
  if (values.length === 0) return { amount: null, ratio: null, samples: 0 }
  const average = values.reduce((sum, value) => sum + value, 0) / values.length
  return { amount: round2(average), ratio: completionRatio(average, target), samples: values.length }
}

function sleepValues(facts: ActivityFacts, window: GoalWindow) {
  return facts.wellbeing
    .filter((entry) => inWindow(entry.date, window.from, window.to) && entry.sleep !== null)
    .map((entry) => entry.sleep as number)
}

function totalForMeasure(goal: GoalDefinition, facts: ActivityFacts, window: GoalWindow) {
  const dates = (values: string[]) => unique(values.filter((date) => inWindow(date, window.from, window.to)))

  if (goal.measure === "manual") {
    const rows = facts.checkins.filter((row) => row.goalId === goal.id && inWindow(row.date, window.from, window.to))
    if (rows.length === 0) return null
    return { amount: rows.reduce((sum, row) => sum + row.amount, 0), samples: rows.length }
  }
  if (goal.measure === "devotional_days") {
    const rows = dates(facts.devotionalDates)
    return rows.length === 0 ? null : { amount: rows.length, samples: rows.length }
  }
  if (goal.measure === "workout_sessions") {
    const rows = facts.workoutDates.filter((date) => inWindow(date, window.from, window.to))
    return rows.length === 0 ? null : { amount: rows.length, samples: rows.length }
  }
  if (goal.measure === "training_volume") {
    const rows = facts.sets.filter((set) => set.completed && inWindow(set.date, window.from, window.to))
    if (rows.length === 0) return null
    return { amount: rows.reduce((sum, set) => sum + set.reps * set.loadKg, 0), samples: rows.length }
  }
  if (goal.measure === "study_minutes") {
    const rows = facts.study.filter((session) => session.minutes !== null && inWindow(session.date, window.from, window.to))
    if (rows.length === 0) return null
    return { amount: rows.reduce((sum, session) => sum + (session.minutes ?? 0), 0), samples: rows.length }
  }
  if (goal.measure === "nutrition_kcal" || goal.measure === "nutrition_protein") {
    const rows = facts.meals.filter((meal) => inWindow(meal.date, window.from, window.to))
    if (rows.length === 0) return null
    const amount = rows.reduce((sum, meal) => sum + (goal.measure === "nutrition_kcal" ? meal.kcal : meal.protein), 0)
    return { amount, samples: rows.length }
  }
  if (goal.measure === "water_ml") {
    const rows = facts.water.filter((row) => inWindow(row.date, window.from, window.to))
    if (rows.length === 0) return null
    return { amount: rows.reduce((sum, row) => sum + row.ml, 0), samples: rows.length }
  }
  if (goal.measure === "cardio_sessions") {
    const rows = facts.cardio.filter((row) => inWindow(row.date, window.from, window.to))
    return rows.length === 0 ? null : { amount: rows.length, samples: rows.length }
  }
  if (goal.measure === "cardio_minutes") {
    const rows = facts.cardio.filter((row) => inWindow(row.date, window.from, window.to))
    if (rows.length === 0) return null
    return { amount: rows.reduce((sum, row) => sum + row.minutes, 0), samples: rows.length }
  }
  return null
}

function unique(values: string[]) {
  return [...new Set(values)]
}

function completionRatio(amount: number, target: number) {
  if (target <= 0) return null
  return Math.min(1, Math.max(0, amount / target))
}

function round2(value: number) {
  return Math.round(value * 100) / 100
}

export function bodyWeightRatio(baseline: number, latest: number, target: number) {
  return bodyRatio(baseline, latest, target)
}

export function reminderIsDue(input: {
  enabled: boolean
  weekdays: number[]
  remindAt: string
  snoozedUntil: string | null
  now: Date
  timeZone: string
}) {
  if (!input.enabled) return false
  const date = todayInTimeZone(input.timeZone, input.now)
  if (!input.weekdays.includes(weekdayOfIsoDate(date))) return false
  if (clockInTimeZone(input.timeZone, input.now) < input.remindAt.slice(0, 5)) return false
  if (input.snoozedUntil && new Date(input.snoozedUntil).getTime() > input.now.getTime()) return false
  return true
}

export function snoozeUntil(mode: "later" | "tomorrow", now: Date, timeZone: string, remindAt: string) {
  if (mode === "later") return new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString()
  const tomorrow = addIsoDays(todayInTimeZone(timeZone, now), 1)
  return zonedLocalToUtc(tomorrow, remindAt, timeZone).toISOString()
}

export function formatQuantity(value: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value)
}

export function percentLabel(ratio: number | null) {
  if (ratio === null) return null
  return `${Math.round(ratio * 100)}%`
}
