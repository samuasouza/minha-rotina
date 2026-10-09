import Link from "next/link"
import type { PulseLine } from "@/lib/domain/reports"

export function WeekPulse({ lines }: { lines: PulseLine[] }) {
  if (lines.length === 0) return null

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card px-5 py-4" aria-labelledby="resumo-semana">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="resumo-semana" className="text-xl">
          Esta semana
        </h2>
        <Link href="/metas" className="text-sm text-foreground underline-offset-4 hover:underline">
          Ver metas
        </Link>
      </div>
      <ul className="mt-3 grid gap-1 sm:grid-cols-2">
        {lines.map((line) => (
          <li key={line.label} className="text-sm leading-6">
            <span className="text-foreground">{line.label}: </span>
            <span className="text-muted-foreground">{line.detail}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
