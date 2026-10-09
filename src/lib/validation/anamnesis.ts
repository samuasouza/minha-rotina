import { z } from "zod"
import { goalKinds } from "@/lib/domain/anamnesis"
import { isoDateSchema } from "@/lib/validation/schemas"
import { amountOrNull } from "@/lib/validation/health"

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""))

export const personalStepSchema = z
  .object({
    displayName: z.string().trim().min(1, "Como podemos te chamar?").max(80),
    birthDate: z.string().trim().optional().or(z.literal("")),
    height: z.string().trim().optional().or(z.literal("")),
    weight: z.string().trim().optional().or(z.literal("")),
    sex: z.enum(["", "female", "male"]),
    measurementSystem: z.enum(["metric", "imperial"]),
  })
  .superRefine((value, context) => {
    if (value.birthDate && !isoDateSchema.safeParse(value.birthDate).success) {
      context.addIssue({ code: "custom", path: ["birthDate"], message: "Informe uma data válida." })
    }
    const height = amountOrNull(value.height)
    const weight = amountOrNull(value.weight)
    const metric = value.measurementSystem === "metric"
    if (height !== null && (height < (metric ? 50 : 20) || height > (metric ? 250 : 98))) {
      context.addIssue({ code: "custom", path: ["height"], message: "A altura ficou fora do intervalo aceito." })
    }
    if (weight !== null && (weight < (metric ? 20 : 44) || weight > (metric ? 400 : 880))) {
      context.addIssue({ code: "custom", path: ["weight"], message: "O peso ficou fora do intervalo aceito." })
    }
  })

export const goalsStepSchema = z.object({
  selected: z.array(z.enum(goalKinds)).max(8),
  primary: z.enum(goalKinds).or(z.literal("")),
  custom: z.array(z.string().trim().max(80)).max(3),
})

export const measuresStepSchema = z.object({
  waist: optionalText(12),
  abdomen: optionalText(12),
  hip: optionalText(12),
  chest: optionalText(12),
  arm: optionalText(12),
  thigh: optionalText(12),
  calf: optionalText(12),
  extraName: optionalText(60),
  extraValue: optionalText(12),
  extraUnit: z.string().trim().max(12).optional().or(z.literal("")),
})

export const routineStepSchema = z.object({
  strengthSessions: optionalText(2),
  cardioSessions: optionalText(2),
  activityLevel: z.enum(["", "sedentary", "light", "moderate", "active"]),
  typicalSleepHours: optionalText(5),
  weeklyHours: optionalText(5),
  preferredPeriod: z.enum(["", "morning", "afternoon", "evening", "flexible"]),
})

export const healthStepSchema = z.object({
  injuries: optionalText(2000),
  dietaryRestrictions: optionalText(2000),
  foodAllergies: optionalText(2000),
  foodPreferences: optionalText(2000),
  nutritionist: z.enum(["", "yes", "no"]),
  notes: optionalText(4000),
  trackSleep: z.boolean().optional(),
  trackEnergy: z.boolean().optional(),
  trackMood: z.boolean().optional(),
  trackCycle: z.boolean().optional(),
  complete: z.boolean().optional(),
})
