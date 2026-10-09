import Link from "next/link"
import { connection } from "next/server"
import { addIsoDays, formatLongDate, hourInTimeZone } from "@/lib/domain/dates"
import { greetingForHour } from "@/lib/domain/greeting"
import { calculateDayProgress } from "@/lib/domain/progress"
import type { DayData } from "@/lib/data/day"
import { AppointmentForm, AppointmentList } from "@/components/day/appointments"
import { LaterModules } from "@/components/day/later-modules"
import { TaskForm } from "@/components/day/task-form"
import { TaskList } from "@/components/day/task-list"
import { DayHealthCard } from "@/components/health/day-health-card"
import { DueReminders } from "@/components/goals/due-reminders"
import { WeekPulse } from "@/components/goals/week-pulse"
import type { ReminderCard } from "@/lib/data/goals"
import type { PulseLine } from "@/lib/domain/reports"
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress"

export async function DayView({
  day,
  persistable = true,
  pulse = [],
  reminders = [],
}: {
  day: DayData
  persistable?: boolean
  pulse?: PulseLine[]
  reminders?: ReminderCard[]
}) {
  await connection()
  const progress = calculateDayProgress(day.tasks)
  const greeting = greetingForHour(hourInTimeZone(day.profile.timezone), day.profile.displayName)
  const previous = addIsoDays(day.date, -1)
  const next = addIsoDays(day.date, 1)

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{formatLongDate(day.date)}</p>
          <h1 className="mt-1 text-4xl text-foreground">{greeting}</h1>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <DateLink href={`/meu-dia?data=${previous}`} label="Dia anterior">
            Anterior
          </DateLink>
          {day.date !== day.today ? (
            <DateLink href="/meu-dia" label="Voltar para hoje">
              Hoje
            </DateLink>
          ) : null}
          <DateLink href={`/meu-dia?data=${next}`} label="Próximo dia">
            Próximo
          </DateLink>
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-card px-5 py-4" aria-labelledby="progresso-dia">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 id="progresso-dia" className="text-xl">
            Progresso
          </h2>
          <p className="text-sm text-muted-foreground">
            {progress.percent === null
              ? "Sem atividades obrigatórias"
              : `${progress.requiredCompleted} de ${progress.requiredTotal}`}
          </p>
        </div>
        {progress.percent === null ? (
          <p className="text-sm leading-6 text-muted-foreground">
            O dia não tem atividades obrigatórias. As opcionais continuam visíveis, sem reduzir o progresso.
          </p>
        ) : (
          <Progress value={progress.percent} aria-label="Progresso das atividades obrigatórias">
            <ProgressLabel className="sr-only">Progresso</ProgressLabel>
            <ProgressValue />
          </Progress>
        )}
      </section>

      {persistable ? <WeekPulse lines={pulse} /> : null}
      {day.health ? <DayHealthCard health={day.health} /> : null}
      {persistable ? <DueReminders reminders={reminders} /> : null}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
        <section aria-labelledby="checklist-dia" className="rounded-2xl border border-border bg-background">
          <div className="flex items-center justify-between gap-3 px-4 py-4">
            <h2 id="checklist-dia" className="text-2xl">
              Checklist
            </h2>
            <TaskForm date={day.date} disabled={!persistable} />
          </div>
          <div className="px-4 pb-4">
            <TaskList tasks={day.tasks} date={day.date} />
          </div>
        </section>
        <section aria-labelledby="agenda-dia">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="agenda-dia" className="text-2xl">
              Agenda
            </h2>
            <AppointmentForm date={day.date} disabled={!persistable} />
          </div>
          <AppointmentList appointments={day.appointments} date={day.date} />
        </section>
      </div>
      <LaterModules />
    </div>
  )
}

function DateLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="rounded-full border border-border bg-card px-3 py-1.5 text-foreground hover:bg-muted"
    >
      {children}
    </Link>
  )
}
