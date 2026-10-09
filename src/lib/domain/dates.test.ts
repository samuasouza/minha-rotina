import { describe, expect, it } from "vitest"
import { addIsoDays, formatLongDate, isIsoDate, startOfWeek, weekdayOfIsoDate } from "./dates"

describe("datas de calendário", () => {
  it("reconhece uma data real e rejeita dia inexistente", () => {
    expect(isIsoDate("2026-10-09")).toBe(true)
    expect(isIsoDate("2026-02-31")).toBe(false)
    expect(isIsoDate("09-10-2026")).toBe(false)
  })

  it("trata sexta-feira, 9 de outubro de 2026, como dia 5", () => {
    expect(weekdayOfIsoDate("2026-10-09")).toBe(5)
  })

  it("avança o mês sem deslocar o dia por fuso", () => {
    expect(addIsoDays("2026-10-31", 1)).toBe("2026-11-01")
  })

  it("começa a semana na segunda-feira", () => {
    expect(startOfWeek("2026-10-09")).toBe("2026-10-05")
    expect(startOfWeek("2026-10-11")).toBe("2026-10-05")
  })

  it("formata a data longa em português", () => {
    expect(formatLongDate("2026-10-09")).toBe("Sexta-feira, 9 de outubro")
  })
})
