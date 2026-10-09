import { describe, expect, it } from "vitest"
import {
  duplicateTitle,
  fileByteLimit,
  findSameLabel,
  importObjectPath,
  kindFromMime,
  needsReview,
  providerFromEnv,
  providerMissingMessage,
  sameLabel,
} from "@/lib/domain/import"
import { dietProposalSchema, proposalSchemas, textDraftSchema } from "@/lib/validation/import"

describe("importação assistida", () => {
  it("não considera um provedor configurado quando falta alguma credencial", () => {
    expect(providerFromEnv({})).toBeNull()
    expect(providerFromEnv({ IMPORT_AI_API_KEY: "secret", IMPORT_AI_BASE_URL: "https://example.com/v1" })).toBeNull()
    expect(providerFromEnv({ IMPORT_AI_API_KEY: "secret", IMPORT_AI_BASE_URL: "http://example.com", IMPORT_AI_MODEL: "m" })).toBeNull()
    const ready = providerFromEnv({
      IMPORT_AI_API_KEY: "secret",
      IMPORT_AI_BASE_URL: "https://example.com/v1/",
      IMPORT_AI_MODEL: "m",
    })
    expect(ready).toEqual({ base: "https://example.com/v1", model: "m" })
    expect(JSON.stringify(ready)).not.toContain("secret")
  })

  it("pede revisão quando a confiança é baixa ou ausente", () => {
    expect(needsReview(null)).toBe(true)
    expect(needsReview(0.59)).toBe(true)
    expect(needsReview(0.6)).toBe(false)
  })

  it("reconhece o mesmo nome sem diferenciar maiúsculas", () => {
    expect(sameLabel("  Treino A ", "treino a")).toBe(true)
    expect(duplicateTitle(["Plano atual"], "plano atual")).toBe(true)
    expect(findSameLabel([{ id: "1", name: "Agachamento" }], "agachamento")?.id).toBe("1")
    expect(findSameLabel([{ id: "1", name: "Agachamento" }], "Supino")).toBeNull()
  })

  it("limita arquivo, texto e tipo", () => {
    expect(fileByteLimit("pdf")).toBe(8 * 1024 * 1024)
    expect(fileByteLimit("image")).toBe(5 * 1024 * 1024)
    expect(fileByteLimit("audio")).toBe(10 * 1024 * 1024)
    expect(kindFromMime("audio/webm;codecs=opus")).toBe("audio")
    expect(kindFromMime("text/plain")).toBeNull()
    expect(importObjectPath("user", "Ficha final.pdf", "abc")).toBe("user/abc-Ficha-final.pdf")
  })

  it("rejeita plano vazio e quantidade sem unidade", () => {
    expect(dietProposalSchema.safeParse({ title: "Plano", prescribedBy: null, meals: [] }).success).toBe(false)
    const paired = dietProposalSchema.safeParse({
      title: "Plano",
      prescribedBy: null,
      meals: [{ name: "Almoço", items: [{ label: "Arroz", quantity: 100, unit: null }] }],
    })
    expect(paired.success).toBe(false)
    expect(proposalSchemas.workout.safeParse({ name: "A", notes: null, days: [] }).success).toBe(false)
  })

  it("exige o tipo do texto antes de guardar a prévia", () => {
    expect(
      textDraftSchema.safeParse({ module: "workout", sourceName: "Texto colado", sourceText: "Ficha A" }).success,
    ).toBe(false)
    expect(
      textDraftSchema.safeParse({
        module: "workout",
        sourceKind: "text",
        sourceName: "Texto colado",
        sourceText: "Ficha A",
      }).success,
    ).toBe(true)
  })

  it("explica a dependência sem simular uma leitura", () => {
    expect(providerMissingMessage).toContain("não está configurada")
    expect(providerFromEnv({})).toBeNull()
  })
})
