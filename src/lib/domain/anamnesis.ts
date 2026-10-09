export const standardMeasures = [
  { key: "waist", name: "Cintura" },
  { key: "abdomen", name: "Abdômen" },
  { key: "hip", name: "Quadril" },
  { key: "chest", name: "Tórax" },
  { key: "arm", name: "Braço" },
  { key: "thigh", name: "Coxa" },
  { key: "calf", name: "Panturrilha" },
] as const

export const goalKinds = [
  "fat_loss",
  "muscle_gain",
  "recomposition",
  "conditioning",
  "maintenance",
  "wellbeing",
  "other",
] as const

export type GoalKind = (typeof goalKinds)[number]
export type MeasurementSystem = "metric" | "imperial"

const POUNDS_PER_KILOGRAM = 2.2046226218
const CENTIMETERS_PER_INCH = 2.54

function round2(value: number) {
  return Math.round(value * 100) / 100
}

export function kilogramsFromInput(value: number, system: MeasurementSystem) {
  return round2(system === "imperial" ? value / POUNDS_PER_KILOGRAM : value)
}

export function inputFromKilograms(kilograms: number, system: MeasurementSystem) {
  return round2(system === "imperial" ? kilograms * POUNDS_PER_KILOGRAM : kilograms)
}

export function centimetersFromInput(value: number, system: MeasurementSystem) {
  return round2(system === "imperial" ? value * CENTIMETERS_PER_INCH : value)
}

export function inputFromCentimeters(centimeters: number, system: MeasurementSystem) {
  return round2(system === "imperial" ? centimeters / CENTIMETERS_PER_INCH : centimeters)
}

export function choosePrimary(selected: GoalKind[], requested: GoalKind | "") {
  if (selected.length === 0) return null
  if (requested && selected.includes(requested)) return requested
  return selected[0]
}

export const goalLabels: Record<GoalKind, string> = {
  fat_loss: "Emagrecimento",
  muscle_gain: "Ganho de massa muscular",
  recomposition: "Recomposição corporal",
  conditioning: "Condicionamento físico",
  maintenance: "Manutenção",
  wellbeing: "Bem-estar geral",
  other: "Outro",
}

export const activityLabels = {
  sedentary: "A maior parte do dia é parada",
  light: "Movimento leve no dia",
  moderate: "Rotina ativa",
  active: "Movimento intenso na semana",
} as const

export const periodLabels = {
  morning: "Manhã",
  afternoon: "Tarde",
  evening: "Noite",
  flexible: "Sem horário fixo",
} as const
