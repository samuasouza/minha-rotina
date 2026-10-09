import Link from "next/link"
import { AuthForm } from "@/components/auth/auth-form"
import { StatusNotice } from "@/components/status-notice"
import { getSupabaseEnv } from "@/lib/supabase/env"

export const metadata = { title: "Criar conta" }

export default function CadastroPage() {
  const configured = Boolean(getSupabaseEnv())

  return (
    <div>
      <h1 className="text-3xl">Criar conta</h1>
      <p className="mt-2 mb-6 text-sm leading-6 text-muted-foreground">
        Cada conta vê somente os próprios registros. O nome fica no seu perfil.
      </p>
      {configured ? <AuthForm mode="cadastro" /> : <StatusNotice status="unconfigured" />}
      <p className="mt-6 text-sm text-muted-foreground">
        <Link href="/entrar" className="text-foreground underline-offset-4 hover:underline">
          Já tenho conta
        </Link>
        <span aria-hidden="true"> · </span>
        <Link href="/recuperar" className="text-foreground underline-offset-4 hover:underline">
          Esqueci a senha
        </Link>
      </p>
    </div>
  )
}
