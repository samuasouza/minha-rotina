import { describe, expect, it } from "vitest"
import { authConfirmUrl, destinationAfterConfirm, requestOriginFromHeaders, resolveAuthSiteUrl } from "./auth-links"

describe("links de autenticação", () => {
  it("monta a confirmação sem duplicar a barra final do site", () => {
    expect(authConfirmUrl("https://minha-rotina.vercel.app/")).toBe(
      "https://minha-rotina.vercel.app/auth/confirm",
    )
    expect(authConfirmUrl("https://minha-rotina.vercel.app/", "/nova-senha")).toBe(
      "https://minha-rotina.vercel.app/auth/confirm?next=/nova-senha",
    )
  })

  it("não duplica /auth/confirm quando a origem configurada já traz o caminho", () => {
    expect(authConfirmUrl("https://minha-rotina-lime.vercel.app")).toBe(
      "https://minha-rotina-lime.vercel.app/auth/confirm",
    )
    expect(authConfirmUrl("https://minha-rotina-lime.vercel.app/auth/confirm")).toBe(
      "https://minha-rotina-lime.vercel.app/auth/confirm",
    )
    expect(authConfirmUrl("https://minha-rotina-lime.vercel.app/auth/confirm/", "/nova-senha")).toBe(
      "https://minha-rotina-lime.vercel.app/auth/confirm?next=/nova-senha",
    )
  })

  it("usa o domínio publicado quando o endereço configurado ainda é local", () => {
    expect(resolveAuthSiteUrl("http://localhost:3000", "https://minha-rotina-lime.vercel.app")).toBe(
      "https://minha-rotina-lime.vercel.app",
    )
    expect(resolveAuthSiteUrl("https://minha-rotina-lime.vercel.app", "https://outro.vercel.app")).toBe(
      "https://minha-rotina-lime.vercel.app",
    )
    expect(resolveAuthSiteUrl("https://minha-rotina-lime.vercel.app/auth/confirm", null)).toBe(
      "https://minha-rotina-lime.vercel.app",
    )
    expect(resolveAuthSiteUrl("http://localhost:3000", "https://evil.example")).toBe("http://localhost:3000")
  })

  it("depois da confirmação abre o dia, e a recuperação abre a nova senha", () => {
    expect(destinationAfterConfirm("signup", null)).toBe("/meu-dia")
    expect(destinationAfterConfirm("recovery", null)).toBe("/nova-senha")
    expect(destinationAfterConfirm(null, "/nova-senha")).toBe("/nova-senha")
    expect(destinationAfterConfirm("signup", "/outro")).toBe("/meu-dia")
  })

  it("lê a origem encaminhada pelo domínio publicado", () => {
    const headers = new Headers({
      "x-forwarded-host": "minha-rotina-lime.vercel.app",
      "x-forwarded-proto": "https",
    })
    expect(requestOriginFromHeaders(headers)).toBe("https://minha-rotina-lime.vercel.app")
  })
})
