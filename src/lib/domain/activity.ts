export type ActivityFacts = {
  devotionalDates: string[]
  reflections: { date: string; text: string }[]
  readingLogs: { date: string; planId: string | null }[]
  plans: { id: string; title: string; itemCount: number }[]
  workoutDates: string[]
  sets: { date: string; exerciseName: string; reps: number; loadKg: number; completed: boolean }[]
  study: { date: string; minutes: number | null }[]
  meals: { date: string; kcal: number; protein: number; carbs: number; fat: number }[]
  water: { date: string; ml: number }[]
  cardio: {
    date: string
    minutes: number
    distanceKm: number | null
    estimateKcal: number | null
    informedKcal: number | null
  }[]
  weights: { date: string; kg: number }[]
  weightBefore: { date: string; kg: number } | null
  measures: { date: string; name: string; unit: string; value: number }[]
  wellbeing: { date: string; sleep: number | null; energy: number | null; mood: number | null }[]
  checkins: { goalId: string; date: string; amount: number }[]
  nutritionTarget: {
    startsOn: string
    kcal: number | null
    protein: number | null
    carbs: number | null
    fat: number | null
    waterMl: number | null
  } | null
  studyWeekGoals: { weekStartsOn: string; title: string; isDone: boolean }[]
  devotionalWeekGoals: { weekStartsOn: string; title: string; isDone: boolean }[]
  cardioWeekGoals: { weekStartsOn: string; targetSessions: number; targetMinutes: number | null }[]
  truncated: boolean
}

export function emptyFacts(): ActivityFacts {
  return {
    devotionalDates: [],
    reflections: [],
    readingLogs: [],
    plans: [],
    workoutDates: [],
    sets: [],
    study: [],
    meals: [],
    water: [],
    cardio: [],
    weights: [],
    weightBefore: null,
    measures: [],
    wellbeing: [],
    checkins: [],
    nutritionTarget: null,
    studyWeekGoals: [],
    devotionalWeekGoals: [],
    cardioWeekGoals: [],
    truncated: false,
  }
}

export function inWindow(date: string, from: string, to: string) {
  return date >= from && date <= to
}
