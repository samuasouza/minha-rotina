import { describe, expect, it } from "vitest"
import { estimateSessionKcal, formulaForActivity } from "./energy"

describe("estimativa de cardio", () => {
  it("usa a equação de caminhada da ACSM e identifica o resultado como estimativa", () => {
    const estimate = estimateSessionKcal({
      formula: "acsm_walking_v1",
      speedKmh: 4.8,
      inclinePercent: 10,
      weightKg: 70,
      durationMinutes: 30,
    })

    expect(estimate).toEqual({
      kind: "acsm_estimate",
      kcal: 271.95,
      formula: "acsm_walking_v1",
      weightKg: 70,
    })
  })

  it("não calcula sem peso", () => {
    const estimate = estimateSessionKcal({
      formula: "acsm_walking_v1",
      speedKmh: 4.8,
      inclinePercent: 10,
      weightKg: null,
      durationMinutes: 30,
    })

    expect(estimate.kind).toBe("unavailable")
  })

  it("não aplica a equação de esteira a bike ou atividade livre", () => {
    expect(formulaForActivity("treadmill")).toBe("acsm_walking_v1")
    expect(formulaForActivity("run")).toBe("acsm_running_v1")
    expect(formulaForActivity("cycle")).toBeNull()
  })
})
