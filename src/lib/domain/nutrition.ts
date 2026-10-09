export type MacroLine = {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export type FoodBasis = MacroLine & {
  basisQuantity: number
}

export type Intake = MacroLine & {
  waterMl: number
}

export type IntakeTarget = {
  kcal: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  waterMl: number | null
}

export type IntakeComparison = {
  key: keyof Intake
  label: string
  consumed: number
  target: number | null
  difference: number | null
}

const labels: Record<keyof Intake, string> = {
  kcal: "Calorias",
  protein: "Proteínas",
  carbs: "Carboidratos",
  fat: "Gorduras",
  waterMl: "Água",
}

function round2(value: number) {
  return Math.round(value * 100) / 100
}

export function scaleFood(food: FoodBasis, quantity: number): MacroLine | null {
  if (!(food.basisQuantity > 0) || !(quantity > 0)) {
    return null
  }
  if ([food.kcal, food.protein, food.carbs, food.fat].some((value) => value < 0 || Number.isNaN(value))) {
    return null
  }

  const factor = quantity / food.basisQuantity
  return {
    kcal: round2(food.kcal * factor),
    protein: round2(food.protein * factor),
    carbs: round2(food.carbs * factor),
    fat: round2(food.fat * factor),
  }
}

export function sumLines(lines: MacroLine[]): MacroLine {
  return lines.reduce(
    (total, line) => ({
      kcal: round2(total.kcal + line.kcal),
      protein: round2(total.protein + line.protein),
      carbs: round2(total.carbs + line.carbs),
      fat: round2(total.fat + line.fat),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  )
}

export function compareIntake(consumed: Intake, target: IntakeTarget): IntakeComparison[] {
  const keys = ["kcal", "protein", "carbs", "fat", "waterMl"] as const
  return keys.map((key) => {
    const goal = target[key]
    return {
      key,
      label: labels[key],
      consumed: consumed[key],
      target: goal,
      difference: goal === null ? null : round2(consumed[key] - goal),
    }
  })
}

export function macroDifference(original: MacroLine | null, suggested: MacroLine) {
  if (!original) {
    return null
  }
  return {
    kcal: round2(suggested.kcal - original.kcal),
    protein: round2(suggested.protein - original.protein),
    carbs: round2(suggested.carbs - original.carbs),
    fat: round2(suggested.fat - original.fat),
  }
}
