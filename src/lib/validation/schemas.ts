import { z } from "zod"
import { isIsoDate } from "@/lib/domain/dates"

export const timezones = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Rio_Branco",
  "America/Noronha",
  "America/Fortaleza",
  "America/Belem",
  "America/Cuiaba",
  "UTC",
] as const

export const timezoneSchema = z.enum(timezones)

const optionalTime = z
  .string()
  .trim()
  .refine((value) => value === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(value), {
    message: "Informe um horário válido.",
  })

export function blankToNull(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export const isoDateSchema = z.string().refine(isIsoDate, "Informe uma data válida.")

export const taskFormSchema = z
  .object({
    title: z.string().trim().min(1, "Dê um nome para a atividade.").max(160),
    notes: z.string().trim().max(2000),
    timeOfDay: optionalTime,
    isOptional: z.boolean(),
    repeat: z.boolean(),
    daysOfWeek: z.array(z.number().int().min(0).max(6)),
    scheduledOn: isoDateSchema,
  })
  .superRefine((value, context) => {
    if (value.repeat && value.daysOfWeek.length === 0) {
      context.addIssue({
        code: "custom",
        message: "Escolha ao menos um dia da semana.",
        path: ["daysOfWeek"],
      })
    }
  })

export const skipTaskSchema = z.object({
  taskId: z.uuid(),
  reason: z.string().trim().min(1, "Conte o motivo, mesmo que seja breve.").max(280),
})

export const rescheduleSchema = z
  .object({
    id: z.uuid(),
    targetDate: isoDateSchema,
  })
  .superRefine((value, context) => {
    if (!value.targetDate) {
      context.addIssue({
        code: "custom",
        message: "Informe uma data válida.",
        path: ["targetDate"],
      })
    }
  })

export const taskIdSchema = z.object({
  taskId: z.uuid(),
})

export const appointmentFormSchema = z
  .object({
    title: z.string().trim().min(1, "Dê um nome para o compromisso.").max(160),
    notes: z.string().trim().max(2000),
    location: z.string().trim().max(160),
    scheduledOn: isoDateSchema,
    startsAt: optionalTime,
    endsAt: optionalTime,
  })
  .superRefine((value, context) => {
    if (value.startsAt && value.endsAt && value.endsAt <= value.startsAt) {
      context.addIssue({
        code: "custom",
        message: "O horário final precisa ser depois do início.",
        path: ["endsAt"],
      })
    }
  })

export const appointmentIdSchema = z.object({
  appointmentId: z.uuid(),
})

export const appointmentStatusSchema = appointmentIdSchema.extend({
  status: z.enum(["completed", "cancelled"]),
})

export const signInSchema = z.object({
  email: z.email("Informe um e-mail válido."),
  password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres.").max(72),
})

export const signUpSchema = signInSchema
  .extend({
    displayName: z.string().trim().min(1, "Como podemos te chamar?").max(80),
    confirmPassword: z.string().min(1, "Confirme a senha."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  })

export const profileFormSchema = z.object({
  displayName: z.string().trim().min(1, "Como podemos te chamar?").max(80),
  fullName: z.string().trim().max(120),
  timezone: timezoneSchema,
})

export type TaskFormValues = z.input<typeof taskFormSchema>
export type AppointmentFormValues = z.input<typeof appointmentFormSchema>
export type ProfileFormValues = z.input<typeof profileFormSchema>
