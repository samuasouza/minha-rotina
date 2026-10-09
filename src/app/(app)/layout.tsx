import { Suspense } from "react"
import { connection } from "next/server"
import { redirect } from "next/navigation"
import { AppShell, ShellFallback } from "@/components/layout/app-shell"
import { requireReadyAccount } from "@/lib/data/account"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <AuthenticatedFrame>{children}</AuthenticatedFrame>
    </Suspense>
  )
}

async function AuthenticatedFrame({ children }: { children: React.ReactNode }) {
  await connection()
  const account = await requireReadyAccount()
  if (account.status === "unauthenticated") {
    redirect("/entrar")
  }

  const displayName =
    account.status === "ready"
      ? account.profile.displayName
      : account.status === "unconfigured"
        ? null
        : "Conta conectada"

  return (
    <AppShell displayName={displayName} configured={account.status !== "unconfigured"}>
      {children}
    </AppShell>
  )
}
