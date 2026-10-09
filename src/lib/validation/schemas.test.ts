import { describe, expect, it } from "vitest"
import { appointmentFormSchema, signUpSchema, skipTaskSchema, taskFormSchema } from "./schemas"

describe("validação", () => {
  it("aceita uma atividade opcional e recorrente", () => {
    const parsed = taskFormSchema.safeParse({
      title: "  Alongamento  ",
      notes: "",
      timeOfDay: "",
      isOptional: true,
      repeat: true,
      daysOfWeek: [1, 5],
      scheduledOn: "2026-10-09",
    })

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.title).toBe("Alongamento")
      expect(parsed.data.notes).toBe("")
    }
  })

  it("exige um dia quando a atividade se repete", () => {
    const parsed = taskFormSchema.safeParse({
      title: "Leitura",
      notes: "",
      timeOfDay: "",
      isOptional: false,
      repeat: true,
      daysOfWeek: [],
      scheduledOn: "2026-10-09",
    })

    expect(parsed.success).toBe(false)
  })

  it("exige motivo para ignorar", () => {
    expect(skipTaskSchema.safeParse({ taskId: "11111111-1111-4111-8111-111111111111", reason: "  " }).success).toBe(
      false,
    )
  })

  it("recusa compromisso com horário final anterior ao início", () => {
    const parsed = appointmentFormSchema.safeParse({
      title: "Consulta",
      notes: "",
      location: "",
      scheduledOn: "2026-10-09",
      startsAt: "15:00",
      endsAt: "14:00",
    })

    expect(parsed.success).toBe(false)
  })

  it("pede nome no cadastro", () => {
    const parsed = signUpSchema.safeParse({
      email: "ana@example.com",
      password: "senha-segura",
      confirmPassword: "senha-segura",
      displayName: " ",
    })

    expect(parsed.success).toBe(false)
  })

  it("exige a mesma senha na confirmação", () => {
    const parsed = signUpSchema.safeParse({
      email: "ana@example.com",
      password: "senha-segura",
      confirmPassword: "outra-senha",
      displayName: "Ana",
    })

    expect(parsed.success).toBe(false)
  })
})
