import { describe, expect, it } from "vitest"
import { occursOnDate } from "./recurrence"

const routine = {
  daysOfWeek: [1, 3, 5],
  startsOn: "2026-10-01",
  endsOn: "2026-10-31",
  isActive: true,
}

describe("recorrência", () => {
  it("aparece apenas nos dias configurados e dentro do período", () => {
    expect(occursOnDate(routine, "2026-10-09")).toBe(true)
    expect(occursOnDate(routine, "2026-10-08")).toBe(false)
    expect(occursOnDate(routine, "2026-09-30")).toBe(false)
    expect(occursOnDate(routine, "2026-11-02")).toBe(false)
  })

  it("não gera ocorrência quando a rotina está inativa", () => {
    expect(occursOnDate({ ...routine, isActive: false }, "2026-10-09")).toBe(false)
  })
})
