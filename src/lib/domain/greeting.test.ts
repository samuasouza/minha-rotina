import { describe, expect, it } from "vitest"
import { greetingForHour } from "./greeting"

describe("saudação", () => {
  it("muda conforme a hora", () => {
    expect(greetingForHour(8, "Ana")).toBe("Bom dia, Ana")
    expect(greetingForHour(12, "Ana")).toBe("Boa tarde, Ana")
    expect(greetingForHour(18, "Ana")).toBe("Boa noite, Ana")
  })

  it("usa um tratamento neutro quando o nome está vazio", () => {
    expect(greetingForHour(9, "  ")).toBe("Bom dia, você")
  })
})
