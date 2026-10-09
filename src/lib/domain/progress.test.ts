import { describe, expect, it } from "vitest"
import { calculateDayProgress, canCompleteFromChecklist, validateReschedule } from "./progress"

describe("progresso do dia", () => {
  it("ignora atividades opcionais, ignoradas e reagendadas no percentual", () => {
    const progress = calculateDayProgress([
      { status: "completed", isOptional: false },
      { status: "pending", isOptional: false },
      { status: "pending", isOptional: true },
      { status: "skipped", isOptional: false },
      { status: "rescheduled", isOptional: false },
    ])

    expect(progress.requiredTotal).toBe(2)
    expect(progress.requiredCompleted).toBe(1)
    expect(progress.percent).toBe(50)
    expect(progress.optionalTotal).toBe(1)
    expect(progress.skipped).toBe(1)
    expect(progress.rescheduled).toBe(1)
  })

  it("não inventa 100% quando não há atividade obrigatória", () => {
    const progress = calculateDayProgress([{ status: "pending", isOptional: true }])
    expect(progress.percent).toBeNull()
  })

  it("impede concluir pelo checklist uma atividade que exige registro do módulo", () => {
    expect(canCompleteFromChecklist("checklist")).toBe(true)
    expect(canCompleteFromChecklist("module_record")).toBe(false)
  })

  it("exige outra data para reagendar", () => {
    expect(validateReschedule("2026-10-09", "2026-10-09")).toBe("Escolha um dia diferente.")
    expect(validateReschedule("2026-10-09", "2026-10-10")).toBeNull()
  })
})
