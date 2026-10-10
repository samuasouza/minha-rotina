import { describe, expect, it } from "vitest"
import { gateDestination } from "./gate"

describe("proteção das rotas", () => {
  it("manda a raiz e os módulos para o login quando não há sessão", () => {
    for (const path of ["/", "/meu-dia", "/treinos", "/alimentacao", "/devocional", "/configuracoes"]) {
      expect(gateDestination(path, false)).toBe("/entrar")
    }
  })

  it("mantém login, cadastro, recuperação e confirmação abertos", () => {
    for (const path of ["/entrar", "/cadastro", "/recuperar", "/nova-senha", "/auth/confirm"]) {
      expect(gateDestination(path, false)).toBeNull()
    }
  })

  it("leva a raiz e as telas de acesso para o dia quando a sessão existe", () => {
    expect(gateDestination("/", true)).toBe("/meu-dia")
    expect(gateDestination("/entrar", true)).toBe("/meu-dia")
    expect(gateDestination("/cadastro", true)).toBe("/meu-dia")
    expect(gateDestination("/meu-dia", true)).toBeNull()
    expect(gateDestination("/nova-senha", true)).toBeNull()
  })
})
