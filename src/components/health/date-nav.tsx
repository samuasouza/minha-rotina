import Link from "next/link"
import { addIsoDays, formatLongDate } from "@/lib/domain/dates"

export function DateNav({ base, date, today }: { base: string; date: string; today: string }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm text-muted-foreground">{formatLongDate(date)}</p>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        <Link className="inline-flex min-h-10 items-center underline-offset-4 hover:underline" href={`${base}?data=${addIsoDays(date, -1)}`}>
          Anterior
        </Link>
        {date !== today ? (
          <Link className="inline-flex min-h-10 items-center underline-offset-4 hover:underline" href={base}>
            Hoje
          </Link>
        ) : null}
        <Link className="inline-flex min-h-10 items-center underline-offset-4 hover:underline" href={`${base}?data=${addIsoDays(date, 1)}`}>
          Próximo
        </Link>
      </div>
    </header>
  )
}
