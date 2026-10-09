import Link from "next/link"
import { PasswordResetForm } from "@/components/auth/auth-form"
import { StatusNotice } from "@/components/status-notice"
import { getSupabaseEnv } from "@/lib/supabase/env"

export const metadata = { title: "Recuperar senha" }

export default function RecoverPage() {
  const configured = Boolean(getSupabaseEnv())

  return (
    <div>
      <h1 className="text-3xl">Nova senha</h1>
      <p className="mt-2 mb-6 text-sm leading-6 text-muted-foreground">
        Enviaremos um link se este e-mail já tiver uma conta.
      </p>
      {configured ? <PasswordResetForm /> : <StatusNotice status="unconfigured" />}
      <p className="mt-6 text-sm text-muted-foreground">
        <Link href="/entrar" className="text-foreground underline-offset-4 hover:underline">
          Voltar para entrar
        </Link>
      </p>
    </div>
  )
}
