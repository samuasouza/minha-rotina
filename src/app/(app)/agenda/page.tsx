import { Suspense } from "react"
import { connection } from "next/server"
import { redirect } from "next/navigation"
import { WeekView } from "@/components/agenda/week-view"
import { StatusNotice } from "@/components/status-notice"
import { loadWeek, type WeekData } from "@/lib/data/week"
import { addIsoDays, isIsoDate, startOfWeek, todayInTimeZone } from "@/lib/domain/dates"

export const metadata = { title: "Agenda" }

export default function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string | string[] }>
}) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando a agenda...</p>}>
      <AgendaContent searchParams={searchParams} />
    </Suspense>
  )
}

async function AgendaContent({
  searchParams,
}: {
  searchParams: Promise<{ data?: string | string[] }>
}) {
  const params = await searchParams
  await connection()
  const requested = typeof params.data === "string" ? params.data : undefined
  const week = await loadWeek(requested)

  if (week.status === "unauthenticated") {
    redirect("/entrar")
  }

  if (week.status === "error") {
    return <StatusNotice status="error" />
  }

  if (week.status !== "ready") {
    return (
      <div className="grid gap-6">
        <StatusNotice status={week.status} />
        <WeekView week={emptyWeek(requested)} persistable={false} />
      </div>
    )
  }

  return <WeekView week={week} />
}

function emptyWeek(requested?: string): WeekData {
  const today = todayInTimeZone("America/Sao_Paulo")
  const anchor = requested && isIsoDate(requested) ? requested : today
  const start = startOfWeek(anchor)
  return {
    status: "ready",
    anchor,
    today,
    days: Array.from({ length: 7 }, (_, index) => addIsoDays(start, index)),
    profile: {
      id: "",
      displayName: "você",
      fullName: null,
      timezone: "America/Sao_Paulo",
      email: null,
    },
    appointments: [],
  }
}
