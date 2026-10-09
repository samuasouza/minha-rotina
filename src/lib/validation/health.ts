import { z } from "zod"
import { isoDateSchema } from "@/lib/validation/schemas"

export const foodUnits = ["g", "ml", "unit"] as const
export const cardioActivities = ["treadmill", "walk", "run", "cycle", "other"] as const

const optionalBlank = z.string().trim().optional().or(z.literal(""))

function optionalAmount(max: number, message: string) {
  return optionalBlank.refine((value) => {
    if (!value) return true
    const number = Number(value)
    return Number.isFinite(number) && number >= 0 && number <= max
  }, message)
}

export function amountOrNull(value: string | undefined) {
  if (!value?.trim()) return null
  return Number(value)
}

export const foodSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome ao alimento.").max(120),
  basisQuantity: z.coerce.number().positive("A quantidade de referência precisa ser maior que zero.").max(10000),
  basisUnit: z.enum(foodUnits),
  kcal: z.coerce.number().min(0).max(9999),
  protein: z.coerce.number().min(0).max(999),
  carbs: z.coerce.number().min(0).max(999),
  fat: z.coerce.number().min(0).max(999),
  sourceNote: z.string().trim().min(1, "Diga de onde veio esse valor.").max(160),
})

export const mealLogSchema = z.object({
  eatenOn: isoDateSchema,
  name: z.string().trim().min(1, "Dê um nome à refeição.").max(80),
  saveAsFavorite: z.boolean().optional(),
  items: z
    .array(
      z.object({
        foodId: z.uuid(),
        quantity: z.coerce.number().positive("A quantidade precisa ser maior que zero.").max(10000),
      }),
    )
    .min(1, "Inclua ao menos um alimento.")
    .max(20),
})

export const waterSchema = z.object({
  loggedOn: isoDateSchema,
  milliliters: z.coerce.number().int().min(1).max(5000),
})

export const nutritionTargetSchema = z
  .object({
    startsOn: isoDateSchema,
    kcal: optionalAmount(19999, "Revise a meta de calorias."),
    protein: optionalAmount(1999, "Revise a meta de proteínas."),
    carbs: optionalAmount(1999, "Revise a meta de carboidratos."),
    fat: optionalAmount(1999, "Revise a meta de gorduras."),
    waterMl: optionalAmount(20000, "Revise a meta de água."),
  })
  .refine((value) => [value.kcal, value.protein, value.carbs, value.fat, value.waterMl].some(Boolean), {
    message: "Informe ao menos uma meta.",
  })

export const dietPlanSchema = z.object({
  title: z.string().trim().min(1).max(120),
  prescribedBy: z.string().trim().max(120).optional(),
  prescribedOn: z.string().trim().optional(),
  notes: z.string().trim().max(4000).optional(),
})

export const dietMealSchema = z.object({
  planId: z.uuid(),
  name: z.string().trim().min(1).max(80),
})

export const dietItemSchema = z.object({
  mealId: z.uuid(),
  label: z.string().trim().min(1).max(120),
  foodId: z.string().trim().optional(),
  quantity: optionalAmount(10000, "Revise a quantidade."),
  unit: z.enum(foodUnits).optional().or(z.literal("")),
})

export const substitutionSchema = z.object({
  dietItemId: z.uuid(),
  suggestedFoodId: z.uuid(),
  quantity: z.coerce.number().positive().max(10000),
})

export const recordIdSchema = z.object({ id: z.uuid() })

export const decisionSchema = z.object({
  id: z.uuid(),
  status: z.enum(["accepted", "rejected"]),
})

export const cardioSchema = z.object({
  performedOn: isoDateSchema,
  activity: z.enum(cardioActivities),
  customLabel: z.string().trim().max(80).optional(),
  durationMinutes: z.coerce.number().int().min(1).max(1440),
  distanceKm: optionalAmount(500, "Revise a distância."),
  speedKmh: optionalAmount(80, "Revise a velocidade."),
  inclinePercent: optionalAmount(40, "Revise a inclinação."),
  intensity: z.enum(["easy", "moderate", "vigorous", ""]).optional(),
  heartRate: optionalAmount(230, "Revise a frequência cardíaca."),
  energyMode: z.enum(["none", "estimate", "informed"]),
  informedKcal: optionalAmount(9999, "Revise as calorias informadas."),
  notes: z.string().trim().max(1000).optional(),
})

export const cardioGoalSchema = z.object({
  weekStartsOn: isoDateSchema,
  targetSessions: z.coerce.number().int().min(1).max(14),
  targetMinutes: optionalAmount(2000, "Revise os minutos da meta."),
})

export const weightSchema = z.object({
  recordedOn: isoDateSchema,
  weightKg: z.coerce.number().min(20).max(400),
  notes: z.string().trim().max(500).optional(),
})

export const measureDefinitionSchema = z.object({
  name: z.string().trim().min(1).max(60),
  unit: z.string().trim().min(1).max(12).default("cm"),
})

export const measurementSchema = z.object({
  definitionId: z.uuid(),
  recordedOn: isoDateSchema,
  value: z.coerce.number().positive().max(499),
})

export const wellbeingSchema = z
  .object({
    entryDate: isoDateSchema,
    sleepHours: optionalAmount(24, "O sono fica entre 0 e 24 horas."),
    sleepQuality: optionalAmount(5, "A qualidade fica de 1 a 5."),
    energy: optionalAmount(5, "A energia fica de 1 a 5."),
    mood: optionalAmount(5, "O humor fica de 1 a 5."),
    menstruation: z.enum(["", "yes", "no"]).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine(
    (value) =>
      Boolean(value.sleepHours || value.sleepQuality || value.energy || value.mood || value.menstruation || value.notes),
    { message: "Preencha ao menos um campo. Tudo aqui é opcional." },
  )
