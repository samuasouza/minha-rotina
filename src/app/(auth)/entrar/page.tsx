import { Suspense } from "react"
import Link from "next/link"
import { AuthForm } from "@/components/auth/auth-form"
import { StatusNotice } from "@/components/status-notice"
import { getSupabaseEnv } from "@/lib/supabase/env"

export const metadata = { title: "Entrar" }

export default function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string }>
}) {
  const configured = Boolean(getSupabaseEnv())

  return (
    <div>
      <h1 className="text-3xl">Entrar</h1>
      <p className="mt-2 mb-6 text-sm leading-6 text-muted-foreground">
        Cada pessoa entra com a própria conta. Os dados de uma não ficam visíveis para a outra.
      </p>
      <Suspense>
        <AuthNotice searchParams={searchParams} />
      </Suspense>
      {configured ? <AuthForm mode="entrar" /> : <StatusNotice status="unconfigured" />}
      <p className="mt-6 text-sm text-muted-foreground">
        <Link href="/cadastro" className="text-foreground underline-offset-4 hover:underline">
          Criar conta
        </Link>
        <span aria-hidden="true"> · </span>
        <Link href="/recuperar" className="text-foreground underline-offset-4 hover:underline">
          Esqueci a senha
        </Link>
      </p>
    </div>
  )
}

async function AuthNotice({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  const params = await searchParams
  if (params.aviso !== "link") {
    return null
  }

  return (
    <p className="mb-4 rounded-xl bg-accent px-3 py-2 text-sm text-accent-foreground" role="status">
      Esse link não é mais válido. Entre com a senha ou peça outro.
    </p>
  )
}
