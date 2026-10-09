import { describe, expect, it } from "vitest"
import {
  centimetersFromInput,
  choosePrimary,
  inputFromCentimeters,
  inputFromKilograms,
  kilogramsFromInput,
} from "@/lib/domain/anamnesis"

describe("unidades da anamnese", () => {
  it("guarda peso imperial em quilos", () => {
    expect(kilogramsFromInput(154.32, "imperial")).toBe(70)
    expect(inputFromKilograms(70, "imperial")).toBe(154.32)
    expect(kilogramsFromInput(70, "metric")).toBe(70)
  })

  it("guarda altura imperial em centímetros", () => {
    expect(centimetersFromInput(70, "imperial")).toBe(177.8)
    expect(inputFromCentimeters(177.8, "imperial")).toBe(70)
  })

  it("escolhe um objetivo principal entre os marcados", () => {
    expect(choosePrimary(["fat_loss", "conditioning"], "conditioning")).toBe("conditioning")
    expect(choosePrimary(["maintenance"], "")).toBe("maintenance")
    expect(choosePrimary([], "fat_loss")).toBeNull()
  })
})
