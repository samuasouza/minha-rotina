import { z } from "zod"
import { isoDateSchema } from "@/lib/validation/schemas"

const httpsUrl = z
  .string()
  .trim()
  .refine((value) => value === "" || value.startsWith("https://"), "O link precisa começar com https://")

export const devotionalEntrySchema = z.object({
  entryDate: isoDateSchema,
  passageLabel: z.string().trim().max(160),
  passageUrl: httpsUrl,
  reflection: z.string().trim().max(8000),
  completed: z.boolean(),
})

export const gratitudeSchema = z.object({
  entryDate: isoDateSchema,
  body: z.string().trim().min(1, "Escreva a gratidão.").max(2000),
})

export const prayerSchema = z.object({
  title: z.string().trim().min(1, "Dê um nome ao pedido.").max(160),
  details: z.string().trim().max(4000),
  askedOn: isoDateSchema,
})

export const prayerAnswerSchema = z.object({
  prayerId: z.uuid(),
  answer: z.string().trim().min(1, "Registre a resposta.").max(4000),
  answeredOn: isoDateSchema,
})

export const readingPlanSchema = z.object({
  title: z.string().trim().min(1, "Dê um nome ao plano.").max(160),
  startsOn: isoDateSchema,
})

export const readingItemSchema = z.object({
  planId: z.uuid(),
  dayNumber: z.coerce.number().int().min(1).max(400),
  passageLabel: z.string().trim().min(1, "Informe a passagem.").max(160),
  passageUrl: httpsUrl,
})

export const readingLogSchema = z.object({
  readOn: isoDateSchema,
  passageLabel: z.string().trim().min(1, "Informe a passagem.").max(160),
  passageUrl: httpsUrl,
  planItemId: z.uuid().optional(),
})

export const weekGoalSchema = z.object({
  weekStartsOn: isoDateSchema,
  title: z.string().trim().min(1, "Descreva a meta.").max(160),
  targetMinutes: z.coerce.number().int().min(1).max(10080).optional(),
  subjectId: z.uuid().optional(),
})

export const exerciseSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome ao exercício.").max(120),
})

export const sheetSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome à ficha.").max(120),
})

export const workoutDaySchema = z.object({
  sheetId: z.uuid(),
  name: z.string().trim().min(1, "Dê um nome ao dia.").max(80),
  position: z.coerce.number().int().min(0).max(13),
})

export const prescriptionSchema = z.object({
  dayId: z.uuid(),
  exerciseId: z.uuid(),
  position: z.coerce.number().int().min(0).max(40),
  targetSets: z.coerce.number().int().min(1).max(20),
  targetReps: z.string().trim().min(1, "Informe as repetições.").max(40),
})

export const sessionSchema = z.object({
  performedOn: isoDateSchema,
  dayId: z.uuid().optional(),
  sheetId: z.uuid().optional(),
})

export const setSchema = z.object({
  sessionId: z.uuid(),
  exerciseId: z.uuid(),
  setNumber: z.coerce.number().int().min(1).max(30),
  reps: z.coerce.number().int().min(0).max(500),
  loadKg: z.coerce.number().min(0).max(999.99),
  completed: z.boolean(),
})

export const suggestionSchema = z.object({
  exerciseId: z.uuid(),
  suggestedLoadKg: z.coerce.number().min(0).max(999.99),
  note: z.string().trim().max(280),
})

export const subjectSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome à matéria.").max(160),
  kind: z.enum(["subject", "course"]),
})

export const topicSchema = z.object({
  subjectId: z.uuid(),
  title: z.string().trim().min(1, "Descreva o conteúdo.").max(160),
  position: z.coerce.number().int().min(0).max(200),
})

export const studySessionSchema = z.object({
  subjectId: z.uuid(),
})

export const finishSessionSchema = z.object({
  sessionId: z.uuid(),
  sessionDate: isoDateSchema,
  durationSeconds: z.coerce.number().int().min(0).max(86400),
  notes: z.string().trim().max(8000),
})

export const studyNoteSchema = z.object({
  subjectId: z.uuid(),
  body: z.string().trim().min(1, "Escreva a anotação.").max(8000),
})

export const recordIdSchema = z.object({
  id: z.uuid(),
})
