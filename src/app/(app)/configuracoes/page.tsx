import { Suspense } from "react"
import Link from "next/link"
import { connection } from "next/server"
import { redirect } from "next/navigation"
import { signOut } from "@/lib/actions/organization"
import { StatusNotice } from "@/components/status-notice"
import { PrivacyPanel } from "@/components/settings/privacy-panel"
import { ProfileForm } from "@/components/settings/profile-form"
import { requireReadyAccount } from "@/lib/data/account"

export const metadata = { title: "Configurações" }

export default function SettingsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando configurações...</p>}>
      <SettingsContent />
    </Suspense>
  )
}

async function SettingsContent() {
  await connection()
  const account = await requireReadyAccount()
  if (account.status === "unauthenticated") {
    redirect("/entrar")
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-4xl">Configurações</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        O fuso, o e-mail e a saída da conta ficam aqui. Objetivos, medidas e rotina ficam em{" "}
        <Link href="/perfil" className="underline-offset-4 hover:underline">
          Meu Perfil
        </Link>
        .
      </p>
      <div className="mt-8">
        {account.status === "ready" ? (
          <ProfileForm profile={account.profile} />
        ) : (
          <StatusNotice status={account.status} />
        )}
      </div>
      <section className="mt-10 rounded-2xl border border-border bg-card px-5 py-4">
        <h2 className="text-xl">Seus dados</h2>
        {account.status === "ready" ? (
          <div className="mt-4">
            <PrivacyPanel email={account.profile.email} />
          </div>
        ) : (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            A exportação fica disponível quando a conta está conectada.
          </p>
        )}
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          A senha pode ser trocada em{" "}
          <Link href="/nova-senha" className="underline-offset-4 hover:underline">
            definir senha
          </Link>
          .
        </p>
        {account.status !== "unconfigured" ? (
          <form action={signOut} className="mt-4">
            <button type="submit" className="text-sm text-foreground underline-offset-4 hover:underline">
              Sair da conta
            </button>
          </form>
        ) : null}
      </section>
    </div>
  )
}
