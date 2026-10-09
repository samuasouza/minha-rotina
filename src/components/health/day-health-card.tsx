import Link from "next/link"
import type { DayHealth } from "@/lib/data/health"

export function DayHealthCard({ health }: { health: DayHealth }) {
  const lines = [
    health.hasIntake ? `Alimentação: ${health.kcal} kcal, ${health.protein} g de proteína, ${health.carbs} g de carboidrato, ${health.fat} g de gordura` : null,
    health.hasWater ? `Água: ${health.waterMl} ml` : null,
    health.hasCardio
      ? `Cardio: ${health.cardioMinutes} min${health.estimateKcal ? ` · estimativa ${health.estimateKcal} kcal` : ""}${health.informedKcal ? ` · informado ${health.informedKcal} kcal` : ""}`
      : null,
    health.weightKg !== null ? `Peso: ${health.weightKg} kg` : null,
    health.sleepHours !== null || health.energyLevel !== null || health.mood !== null
      ? `Bem-estar:${health.sleepHours !== null ? ` sono ${health.sleepHours} h` : ""}${health.energyLevel !== null ? ` · energia ${health.energyLevel}` : ""}${health.mood !== null ? ` · humor ${health.mood}` : ""}`
      : null,
  ].filter(Boolean)

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card px-5 py-4" aria-labelledby="corpo-dia">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="corpo-dia" className="text-xl">Hoje, além da lista</h2>
        <p className="text-xs text-muted-foreground">Só o que foi registrado</p>
      </div>
      {lines.length === 0 ? (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Nenhum registro de alimentação, cardio, peso ou bem-estar neste dia.
        </p>
      ) : (
        <ul className="mt-3 grid gap-1 text-sm leading-6 text-muted-foreground">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
      <p className="mt-3 flex flex-wrap gap-3 text-sm">
        <Link href="/alimentacao" className="underline-offset-4 hover:underline">Alimentação</Link>
        <Link href="/cardio" className="underline-offset-4 hover:underline">Cardio</Link>
        <Link href="/meu-corpo" className="underline-offset-4 hover:underline">Corpo</Link>
        <Link href="/bem-estar" className="underline-offset-4 hover:underline">Bem-estar</Link>
      </p>
    </section>
  )
}
