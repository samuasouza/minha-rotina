import { Suspense } from "react"
import { connection } from "next/server"
import { redirect } from "next/navigation"
import { DayView } from "@/components/day/day-view"
import { OnboardingBanner } from "@/components/profile/onboarding-banner"
import { StatusNotice } from "@/components/status-notice"
import { loadDay, type DayData } from "@/lib/data/day"
import { loadDaySignals } from "@/lib/data/goals"
import { loadOnboardingGate } from "@/lib/data/anamnesis"
import { isIsoDate, todayInTimeZone } from "@/lib/domain/dates"

export const metadata = { title: "Meu Dia" }

export default function MeuDiaPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string | string[] }>
}) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando o dia...</p>}>
      <MeuDiaContent searchParams={searchParams} />
    </Suspense>
  )
}

async function MeuDiaContent({
  searchParams,
}: {
  searchParams: Promise<{ data?: string | string[] }>
}) {
  const params = await searchParams
  await connection()
  const requested = typeof params.data === "string" ? params.data : undefined
  const gate = await loadOnboardingGate()
  if (gate === "missing") redirect("/perfil")
  const day = await loadDay(requested)

  if (day.status === "unauthenticated") {
    redirect("/entrar")
  }

  if (day.status === "error") {
    return <StatusNotice status="error" />
  }

  if (day.status !== "ready") {
    const today = todayInTimeZone("America/Sao_Paulo")
    const date = requested && isIsoDate(requested) ? requested : today
    return (
      <div className="grid gap-6">
        {gate === "open" || gate === "deferred" ? <OnboardingBanner /> : null}
        <StatusNotice status={day.status} />
        <DayView day={emptyDay(date, today)} persistable={false} />
      </div>
    )
  }

  const signals = await loadDaySignals(day.date, day.today, day.profile.timezone)

  return (
    <>
      {gate === "open" || gate === "deferred" ? <OnboardingBanner /> : null}
      <DayView day={day} pulse={signals.lines} reminders={signals.reminders} />
    </>
  )
}

function emptyDay(date: string, today: string): DayData {
  return {
    status: "ready",
    date,
    today,
    profile: {
      id: "",
      displayName: "você",
      fullName: null,
      timezone: "America/Sao_Paulo",
      email: null,
    },
    tasks: [],
    appointments: [],
    health: null,
  }
}
