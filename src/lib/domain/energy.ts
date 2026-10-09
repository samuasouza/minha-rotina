export type EnergyFormula = "acsm_walking_v1" | "acsm_running_v1"

export type EnergyEstimate =
  | { kind: "unavailable"; reason: string }
  | {
      kind: "acsm_estimate"
      kcal: number
      formula: EnergyFormula
      weightKg: number
    }

function round2(value: number) {
  return Math.round(value * 100) / 100
}

// ACSM metabolic equations. Grade is the incline as a fraction (10% = 0.10).
// Walking: VO2 = 0.1×speed + 1.8×speed×grade + 3.5
// Running: VO2 = 0.2×speed + 0.9×speed×grade + 3.5
// VO2 is ml/kg/min and speed is m/min. kcal ≈ VO2 × kg / 1000 × 5 × minutes.
// The result is an estimate, not a measurement from a device.
export function estimateSessionKcal(input: {
  formula: EnergyFormula
  speedKmh: number | null
  inclinePercent: number | null
  weightKg: number | null
  durationMinutes: number | null
}): EnergyEstimate {
  if (input.weightKg === null || !(input.weightKg > 0)) {
    return { kind: "unavailable", reason: "Informe um peso para calcular a estimativa." }
  }
  if (input.speedKmh === null || !(input.speedKmh > 0)) {
    return { kind: "unavailable", reason: "Informe a velocidade para calcular a estimativa." }
  }
  if (input.durationMinutes === null || !(input.durationMinutes > 0)) {
    return { kind: "unavailable", reason: "Informe a duração para calcular a estimativa." }
  }
  if (input.inclinePercent === null || input.inclinePercent < 0) {
    return { kind: "unavailable", reason: "Informe a inclinação para calcular a estimativa." }
  }

  const speedMetersPerMinute = (input.speedKmh * 1000) / 60
  const grade = input.inclinePercent / 100
  const vo2 =
    input.formula === "acsm_walking_v1"
      ? 0.1 * speedMetersPerMinute + 1.8 * speedMetersPerMinute * grade + 3.5
      : 0.2 * speedMetersPerMinute + 0.9 * speedMetersPerMinute * grade + 3.5

  return {
    kind: "acsm_estimate",
    kcal: round2((vo2 * input.weightKg * 5 * input.durationMinutes) / 1000),
    formula: input.formula,
    weightKg: input.weightKg,
  }
}

export function formulaForActivity(activity: "treadmill" | "walk" | "run" | "cycle" | "other"): EnergyFormula | null {
  if (activity === "run") {
    return "acsm_running_v1"
  }
  if (activity === "treadmill" || activity === "walk") {
    return "acsm_walking_v1"
  }
  return null
}
