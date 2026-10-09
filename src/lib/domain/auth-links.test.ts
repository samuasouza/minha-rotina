import { describe, expect, it } from "vitest"
import { authConfirmUrl } from "./auth-links"

describe("links de autenticação", () => {
  it("monta a confirmação sem duplicar a barra final do site", () => {
    expect(authConfirmUrl("https://minha-rotina.vercel.app/")).toBe(
      "https://minha-rotina.vercel.app/auth/confirm",
    )
    expect(authConfirmUrl("https://minha-rotina.vercel.app/", "/nova-senha")).toBe(
      "https://minha-rotina.vercel.app/auth/confirm?next=/nova-senha",
    )
  })
})
