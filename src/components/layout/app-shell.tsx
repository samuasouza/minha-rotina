import Link from "next/link"
import { signOut } from "@/lib/actions/organization"
import { MobileNav } from "@/components/layout/mobile-nav"
import { SidebarNav } from "@/components/layout/sidebar-nav"
import { PwaControls } from "@/components/pwa/install-prompt"

export function AppShell({
  children,
  displayName,
  configured,
}: {
  children: React.ReactNode
  displayName: string | null
  configured: boolean
}) {
  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-card focus:px-3 focus:py-2"
      >
        Ir para o conteúdo
      </a>
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl">
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border py-6 md:flex">
          <Link href="/meu-dia" className="px-6 pb-8">
            <span className="block font-heading text-2xl text-foreground">Minha Rotina</span>
            <span className="mt-1 block text-xs text-muted-foreground">O dia, com calma</span>
          </Link>
          <SidebarNav />
          <div className="mt-auto px-6 pt-6">
            <p className="truncate text-sm text-foreground">{displayName ?? "Sem conta conectada"}</p>
            {configured ? (
              <form action={signOut}>
                <button type="submit" className="mt-2 text-xs text-muted-foreground underline-offset-4 hover:underline">
                  Sair
                </button>
              </form>
            ) : (
              <Link href="/configuracoes" className="mt-2 block text-xs text-muted-foreground underline-offset-4 hover:underline">
                Conectar conta
              </Link>
            )}
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between px-4 py-4 md:hidden">
            <Link href="/meu-dia" className="font-heading text-2xl">
              Minha Rotina
            </Link>
            <p className="max-w-32 truncate text-sm text-muted-foreground">{displayName}</p>
          </header>
          <main id="conteudo" className="flex-1 px-4 pt-2 pb-28 md:px-8 md:pt-8 md:pb-10">
            {children}
          </main>
        </div>
      </div>
      <PwaControls />
      <MobileNav />
    </div>
  )
}

export function ShellFallback() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh max-w-6xl">
        <div className="hidden w-60 border-r border-border md:block" />
        <div className="flex-1 px-4 py-8 md:px-8">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
          <div className="mt-6 h-28 animate-pulse rounded-2xl bg-muted" />
          <div className="mt-4 h-64 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    </div>
  )
}
