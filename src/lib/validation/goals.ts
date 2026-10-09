import { z } from "zod"
import { goalCategories, goalMeasures, goalPeriods, goalStatuses, reminderKinds } from "@/lib/domain/goals"
import { isIsoDate } from "@/lib/domain/dates"
import { isoDateSchema } from "@/lib/validation/schemas"

const optionalBlank = z.string().trim().optional().or(z.literal(""))

const goalFields = {
  title: z.string().trim().min(1, "Dê um nome à meta.").max(120),
  category: z.enum(goalCategories),
  measure: z.enum(goalMeasures),
  targetValue: z.coerce.number().positive("O valor-alvo precisa ser maior que zero.").lt(1000000),
  unit: z.string().trim().min(1, "Informe a unidade.").max(20),
  period: z.enum(goalPeriods),
  customDays: optionalBlank,
  startsOn: isoDateSchema,
  endsOn: optionalBlank,
}

function refineGoal(value: { period: string; customDays?: string; startsOn: string; endsOn?: string }, context: z.RefinementCtx) {
  if (value.period === "custom") {
    const days = Number(value.customDays)
    if (!value.customDays || !Number.isInteger(days) || days < 1 || days > 366) {
      context.addIssue({ code: "custom", path: ["customDays"], message: "Informe a duração entre 1 e 366 dias." })
    }
  } else if (value.customDays) {
    context.addIssue({ code: "custom", path: ["customDays"], message: "A duração personalizada só vale para o período personalizado." })
  }

  if (value.endsOn && (!isIsoDate(value.endsOn) || value.endsOn < value.startsOn)) {
    context.addIssue({ code: "custom", path: ["endsOn"], message: "O término precisa ser igual ou posterior ao início." })
  }
}

export const goalSchema = z.object(goalFields).superRefine(refineGoal)

export const goalUpdateSchema = z
  .object({ ...goalFields, id: z.uuid(), status: z.enum(goalStatuses) })
  .superRefine(refineGoal)

export const checkinSchema = z.object({
  goalId: z.uuid(),
  recordedOn: isoDateSchema,
  amount: z.coerce.number().positive("O lançamento precisa ser maior que zero.").lt(1000000),
  note: z.string().trim().max(280),
})

const reminderFields = {
  title: z.string().trim().min(1, "Dê um nome ao lembrete.").max(120),
  kind: z.enum(reminderKinds),
  goalId: z.union([z.literal(""), z.uuid()]),
  enabled: z.boolean(),
  remindAt: z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe um horário válido."),
  weekdays: z.array(z.number().int().min(0).max(6)).min(1, "Escolha ao menos um dia.").max(7),
}

function refineReminder(value: { kind: string; goalId: string }, context: z.RefinementCtx) {
  if (value.kind === "goal" && !value.goalId) {
    context.addIssue({ code: "custom", path: ["goalId"], message: "Escolha a meta deste lembrete." })
  }
  if (value.kind !== "goal" && value.goalId) {
    context.addIssue({ code: "custom", path: ["goalId"], message: "Só um lembrete de meta pessoal fica ligado a uma meta." })
  }
}

export const reminderSchema = z.object(reminderFields).superRefine(refineReminder)

export const reminderUpdateSchema = z.object({ ...reminderFields, id: z.uuid() }).superRefine(refineReminder)

export const snoozeSchema = z.object({
  id: z.uuid(),
  mode: z.enum(["later", "tomorrow"]),
})
