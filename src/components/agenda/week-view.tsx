import Link from "next/link"
import { addIsoDays, formatShortDate, formatWeekday } from "@/lib/domain/dates"
import type { WeekData } from "@/lib/data/week"
import { AppointmentForm, AppointmentList } from "@/components/day/appointments"
import { cn } from "@/lib/utils"

export function WeekView({ week, persistable = true }: { week: WeekData; persistable?: boolean }) {
  const previous = addIsoDays(week.days[0], -7)
  const next = addIsoDays(week.days[0], 7)

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Semana</p>
          <h1 className="mt-1 text-4xl">Agenda</h1>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link className="rounded-full border border-border bg-card px-3 py-1.5" href={`/agenda?data=${previous}`}>
            Semana anterior
          </Link>
          <Link className="rounded-full border border-border bg-card px-3 py-1.5" href="/agenda">
            Esta semana
          </Link>
          <Link className="rounded-full border border-border bg-card px-3 py-1.5" href={`/agenda?data=${next}`}>
            Próxima
          </Link>
        </div>
      </div>
      <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
        Os horários são opcionais. A integração com o Google Calendar ainda não faz parte desta etapa.
      </p>
      <div className="mt-6 flex justify-end">
        <AppointmentForm date={week.anchor} disabled={!persistable} />
      </div>
      <div className="mt-4 grid gap-4">
        {week.days.map((day) => {
          const items = week.appointments.filter((item) => item.scheduledOn === day)
          return (
            <section key={day} className={cn("rounded-2xl border border-border px-4 py-4", day === week.today && "bg-card")}>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="text-xl capitalize">
                  {formatWeekday(day)} · {formatShortDate(day)}
                </h2>
                <Link href={`/meu-dia?data=${day}`} className="text-xs text-muted-foreground underline-offset-4 hover:underline">
                  Abrir o dia
                </Link>
              </div>
              <AppointmentList appointments={items} date={day} />
            </section>
          )
        })}
      </div>
    </div>
  )
}
