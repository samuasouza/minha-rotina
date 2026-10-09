import { Suspense } from "react"
import { connection } from "next/server"
import Link from "next/link"
import { redirect } from "next/navigation"
import { GoalsBoard } from "@/components/goals/goals-board"
import { RemindersBoard } from "@/components/goals/reminders-board"
import { ReportsView } from "@/components/goals/reports-view"
import { StatusNotice } from "@/components/status-notice"
import { loadGoalCenter } from "@/lib/data/goals"
import { cn } from "@/lib/utils"

export const metadata = { title: "Minhas Metas" }

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ secao?: string | string[]; periodo?: string | string[]; de?: string | string[]; ate?: string | string[] }>
}) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando as metas...</p>}>
      <Content searchParams={searchParams} />
    </Suspense>
  )
}

async function Content({
  searchParams,
}: {
  searchParams: Promise<{ secao?: string | string[]; periodo?: string | string[]; de?: string | string[]; ate?: string | string[] }>
}) {
  const params = await searchParams
  await connection()
  const section = first(params.secao)
  const preset = first(params.periodo)
  const from = first(params.de)
  const to = first(params.ate)
  const data = await loadGoalCenter({ section, preset, from, to })
  if (data.status === "unauthenticated") redirect("/entrar")
  if (data.status !== "ready") return <StatusNotice status={data.status} />

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-4xl">Minhas Metas</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Metas, relatórios e lembretes usam os registros que já existem. Nada aqui muda um plano alimentar nem conclui um treino no seu lugar.
        </p>
      </div>
      <nav className="flex flex-wrap gap-2" aria-label="Seções de metas">
        <SectionLink href="/metas" current={data.section === "metas"}>Metas</SectionLink>
        <SectionLink href="/metas?secao=relatorios" current={data.section === "relatorios"}>Relatórios</SectionLink>
        <SectionLink href="/metas?secao=lembretes" current={data.section === "lembretes"}>Lembretes</SectionLink>
      </nav>
      {data.section === "relatorios" ? <ReportsView data={data} customFrom={from} customTo={to} /> : null}
      {data.section === "lembretes" ? <RemindersBoard reminders={data.reminders} goals={data.goals} /> : null}
      {data.section === "metas" ? <GoalsBoard goals={data.goals} today={data.today} /> : null}
    </div>
  )
}

function SectionLink({ href, current, children }: { href: string; current: boolean; children: string }) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm",
        current ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-muted",
      )}
    >
      {children}
    </Link>
  )
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}
