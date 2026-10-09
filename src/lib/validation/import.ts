import { z } from "zod"
import { importLimits, importModules } from "@/lib/domain/import"
import { isoDateSchema } from "@/lib/validation/schemas"

const foodUnit = z.enum(["g", "ml", "unit"])

const dietItemSchema = z
  .object({
    label: z.string().trim().min(1, "Informe o alimento que está no material.").max(120),
    quantity: z.number().positive("A quantidade precisa ser maior que zero.").max(10000).nullable(),
    unit: foodUnit.nullable(),
  })
  .refine((item) => (item.quantity == null) === (item.unit == null), {
    message: "Informe quantidade e unidade juntas, ou deixe as duas em branco.",
  })

export const dietProposalSchema = z.object({
  title: z.string().trim().min(1, "Dê um nome ao plano.").max(120),
  prescribedBy: z.string().trim().max(120).nullable(),
  meals: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Dê um nome à refeição.").max(80),
        items: z.array(dietItemSchema).min(1, "Inclua ao menos um alimento que esteja no material."),
      }),
    )
    .min(1, "Inclua ao menos uma refeição que esteja no material.")
    .max(20),
})

export const workoutProposalSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome à ficha.").max(120),
  notes: z.string().trim().max(2000).nullable(),
  days: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Dê um nome ao dia da ficha.").max(80),
        exercises: z
          .array(
            z.object({
              name: z.string().trim().min(1, "Informe o nome do exercício.").max(120),
              targetSets: z.number().int().min(1, "Informe as séries da ficha.").max(20),
              targetReps: z.string().trim().min(1, "Informe as repetições da ficha.").max(40),
            }),
          )
          .min(1, "Inclua ao menos um exercício da ficha.")
          .max(40),
      }),
    )
    .min(1, "Inclua ao menos um dia da ficha.")
    .max(14),
})

export const studyProposalSchema = z
  .object({
    subjectName: z.string().trim().min(1, "Informe a matéria.").max(160),
    kind: z.enum(["subject", "course"]),
    notes: z.string().trim().min(1, "Escreva a nota que está no material.").max(8000),
    minutes: z.number().int().min(1).max(1440).nullable(),
    date: isoDateSchema.nullable(),
  })
  .refine((value) => value.minutes == null || value.date != null, {
    message: "Informe o dia da sessão de estudo.",
  })

export const scheduleProposalSchema = z.object({
  items: z
    .array(
      z.object({
        title: z.string().trim().min(1, "Dê um nome ao item.").max(160),
        date: isoDateSchema,
        time: z
          .string()
          .trim()
          .refine((value) => value === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(value), "Informe um horário válido.")
          .nullable(),
        kind: z.enum(["task", "appointment"]),
      }),
    )
    .min(1, "Inclua ao menos um item que esteja no material.")
    .max(40),
})

export const waterProposalSchema = z.object({
  date: isoDateSchema,
  milliliters: z.number().int().min(1, "Informe a quantidade em mililitros.").max(5000),
})

export const mealProposalSchema = z.object({
  date: isoDateSchema,
  name: z.string().trim().min(1, "Dê um nome à refeição.").max(80),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Informe o alimento.").max(120),
        quantity: z.number().positive().max(10000),
        unit: foodUnit,
        kcal: z.number().min(0).max(10000),
        protein: z.number().min(0).max(1000),
        carbs: z.number().min(0).max(1000),
        fat: z.number().min(0).max(1000),
        sourceNote: z.string().trim().min(1, "Informe a fonte dos valores. Eles não são estimados.").max(160),
      }),
    )
    .min(1, "Inclua ao menos um alimento com os valores que você conhece.")
    .max(40),
})

export const proposalSchemas = {
  diet: dietProposalSchema,
  workout: workoutProposalSchema,
  study: studyProposalSchema,
  schedule: scheduleProposalSchema,
  water: waterProposalSchema,
  meal: mealProposalSchema,
} as const

const draftBase = z.object({
  module: z.enum(importModules),
  sourceName: z.string().trim().min(1).max(180).nullable(),
})

export const textDraftSchema = draftBase.extend({
  sourceKind: z.literal("text"),
  sourceText: z.string().trim().min(1, "Escreva ou cole o material.").max(importLimits.textChars),
})

export const fileDraftSchema = draftBase.extend({
  sourceKind: z.enum(["pdf", "image", "audio"]),
  storagePath: z.string().trim().min(3).max(240),
})

export const confirmDraftSchema = z.object({
  id: z.uuid(),
  proposal: z.unknown(),
})

export const draftIdSchema = z.object({ id: z.uuid() })

export function proposalTooLarge(value: unknown) {
  return JSON.stringify(value).length > importLimits.proposalChars
}

function text(value: unknown) {
  return typeof value === "string" ? value : ""
}

function nullableText(value: unknown) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim().replace(",", "."))
    if (Number.isFinite(parsed)) return parsed
  }
  return value
}

function nullableNumber(value: unknown) {
  if (value == null || value === "") return null
  return numberValue(value)
}

function rows(value: unknown) {
  return Array.isArray(value) ? value : []
}

export function normalizeProposal(module: (typeof importModules)[number], input: unknown) {
  if (!input || typeof input !== "object") return input
  const value = input as Record<string, unknown>
  if (module === "diet") {
    return {
      title: text(value.title),
      prescribedBy: nullableText(value.prescribedBy),
      meals: rows(value.meals).map((meal) => {
        const row = meal as Record<string, unknown>
        return {
          name: text(row.name),
          items: rows(row.items).map((item) => {
            const line = item as Record<string, unknown>
            return {
              label: text(line.label),
              quantity: nullableNumber(line.quantity),
              unit: line.unit == null || line.unit === "" ? null : line.unit,
            }
          }),
        }
      }),
    }
  }
  if (module === "workout") {
    return {
      name: text(value.name),
      notes: nullableText(value.notes),
      days: rows(value.days).map((day) => {
        const row = day as Record<string, unknown>
        return {
          name: text(row.name),
          exercises: rows(row.exercises).map((exercise) => {
            const line = exercise as Record<string, unknown>
            return {
              name: text(line.name),
              targetSets: numberValue(line.targetSets),
              targetReps: text(line.targetReps),
            }
          }),
        }
      }),
    }
  }
  if (module === "study") {
    return {
      subjectName: text(value.subjectName),
      kind: value.kind,
      notes: text(value.notes),
      minutes: nullableNumber(value.minutes),
      date: nullableText(value.date),
    }
  }
  if (module === "schedule") {
    return {
      items: rows(value.items).map((item) => {
        const row = item as Record<string, unknown>
        return {
          title: text(row.title),
          date: text(row.date),
          time: nullableText(row.time),
          kind: row.kind,
        }
      }),
    }
  }
  if (module === "water") {
    return { date: text(value.date), milliliters: numberValue(value.milliliters) }
  }
  return {
    date: text(value.date),
    name: text(value.name),
    items: rows(value.items).map((item) => {
      const line = item as Record<string, unknown>
      return {
        name: text(line.name),
        quantity: numberValue(line.quantity),
        unit: line.unit,
        kcal: numberValue(line.kcal),
        protein: numberValue(line.protein),
        carbs: numberValue(line.carbs),
        fat: numberValue(line.fat),
        sourceNote: text(line.sourceNote),
      }
    }),
  }
}
