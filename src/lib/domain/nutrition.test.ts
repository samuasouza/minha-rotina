import { describe, expect, it } from "vitest"
import { compareIntake, macroDifference, scaleFood, sumLines } from "./nutrition"

describe("nutrição", () => {
  const oats = { basisQuantity: 100, kcal: 370, protein: 13, carbs: 60, fat: 7 }

  it("escala os valores cadastrados pela quantidade", () => {
    expect(scaleFood(oats, 40)).toEqual({ kcal: 148, protein: 5.2, carbs: 24, fat: 2.8 })
  })

  it("não inventa valor quando a base é inválida", () => {
    expect(scaleFood({ ...oats, basisQuantity: 0 }, 40)).toBeNull()
  })

  it("soma o dia e compara só com metas informadas", () => {
    const total = sumLines([
      { kcal: 148, protein: 5.2, carbs: 24, fat: 2.8 },
      { kcal: 100, protein: 8, carbs: 2, fat: 7 },
    ])
    const compared = compareIntake({ ...total, waterMl: 500 }, {
      kcal: 200,
      protein: null,
      carbs: 20,
      fat: null,
      waterMl: 2000,
    })

    expect(total).toEqual({ kcal: 248, protein: 13.2, carbs: 26, fat: 9.8 })
    expect(compared.find((item) => item.key === "kcal")?.difference).toBe(48)
    expect(compared.find((item) => item.key === "protein")?.difference).toBeNull()
    expect(compared.find((item) => item.key === "waterMl")?.difference).toBe(-1500)
  })

  it("mostra a diferença da substituição sem alterar o original", () => {
    const original = scaleFood(oats, 40)
    const suggested = scaleFood({ basisQuantity: 100, kcal: 150, protein: 10, carbs: 20, fat: 3 }, 40)
    expect(macroDifference(original, suggested!)).toEqual({
      kcal: -88,
      protein: -1.2,
      carbs: -16,
      fat: -1.6,
    })
  })
})
