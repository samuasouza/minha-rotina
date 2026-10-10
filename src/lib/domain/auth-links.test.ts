import { describe, expect, it } from "vitest"
import { authConfirmUrl, requestOriginFromHeaders, resolveAuthSiteUrl } from "./auth-links"

describe("links de autenticação", () => {
  it("monta a confirmação sem duplicar a barra final do site", () => {
    expect(authConfirmUrl("https://minha-rotina.vercel.app/")).toBe(
      "https://minha-rotina.vercel.app/auth/confirm",
    )
    expect(authConfirmUrl("https://minha-rotina.vercel.app/", "/nova-senha")).toBe(
      "https://minha-rotina.vercel.app/auth/confirm?next=/nova-senha",
    )
  })

  it("usa o domínio publicado quando o endereço configurado ainda é local", () => {
    expect(resolveAuthSiteUrl("http://localhost:3000", "https://minha-rotina-lime.vercel.app")).toBe(
      "https://minha-rotina-lime.vercel.app",
    )
    expect(resolveAuthSiteUrl("https://minha-rotina-lime.vercel.app", "https://outro.vercel.app")).toBe(
      "https://minha-rotina-lime.vercel.app",
    )
    expect(resolveAuthSiteUrl("http://localhost:3000", "https://evil.example")).toBe("http://localhost:3000")
  })

  it("lê a origem encaminhada pelo domínio publicado", () => {
    const headers = new Headers({
      "x-forwarded-host": "minha-rotina-lime.vercel.app",
      "x-forwarded-proto": "https",
    })
    expect(requestOriginFromHeaders(headers)).toBe("https://minha-rotina-lime.vercel.app")
  })
})
