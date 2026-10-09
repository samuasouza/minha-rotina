import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { deletionRequestMessage, personalExport } from "@/lib/domain/privacy"

describe("privacidade", () => {
  it("exporta registros sem prometer link público", () => {
    const document = personalExport({
      exportedOn: "2026-10-09",
      tables: { profiles: [{ id: "1" }], body_photos: [{ storage_path: "1/foto" }] },
      truncated: [],
    })
    expect(document.note).toContain("não os bytes")
    expect(JSON.stringify(document)).not.toContain("http")
    expect(document.tables.body_photos).toEqual([{ storage_path: "1/foto" }])
  })

  it("registra o pedido sem apagar a identidade", () => {
    expect(deletionRequestMessage).toContain("continuam")
    expect(deletionRequestMessage).toContain("painel do Supabase")
  })

  it("não coloca páginas autenticadas no cache do aplicativo", () => {
    const worker = readFileSync("public/sw.js", "utf8")
    expect(worker).toContain("/offline.html")
    expect(worker).not.toContain("supabase")
    expect(worker).not.toContain("/meu-dia")
    expect(worker).toContain("SHELL_URLS.includes")
  })
})