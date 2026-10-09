"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { deleteCardioSession, saveCardioGoal, saveCardioSession } from "@/lib/actions/cardio"
import type { CardioReady } from "@/lib/data/health"
import { DateNav } from "@/components/health/date-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function CardioView({ data }: { data: CardioReady }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function run(action: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      router.refresh()
    })
  }

  const estimate = data.sessions.filter((session) => session.kind === "acsm_estimate").reduce((total, session) => total + (session.kcal ?? 0), 0)
  const informed = data.sessions.filter((session) => session.kind === "informed").reduce((total, session) => total + (session.kcal ?? 0), 0)

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl">Cardio</h1>
        <DateNav base="/cardio" date={data.date} today={data.today} />
      </div>
      <section className="rounded-2xl border border-border bg-card px-5 py-4">
        <h2 className="text-xl">Esta semana</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {data.weekSessions} sessões · {data.weekMinutes} min
          {data.goal ? ` · meta ${data.goal.sessions} sessões${data.goal.minutes ? ` e ${data.goal.minutes} min` : ""}` : ""}
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Estimativa ACSM: {estimate} kcal. Informado por você: {informed} kcal. Esses valores não são somados entre si e não são medições do aplicativo.
        </p>
        <form
          className="mt-4 flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            run(() =>
              saveCardioGoal({
                weekStartsOn: data.weekStart,
                targetSessions: String(form.get("sessions") ?? ""),
                targetMinutes: String(form.get("minutes") ?? ""),
              }),
            )
          }}
        >
          <Input name="sessions" inputMode="numeric" placeholder="Sessões" aria-label="Sessões na semana" className="w-28" />
          <Input name="minutes" inputMode="numeric" placeholder="Minutos" aria-label="Minutos na semana" className="w-28" />
          <Button type="submit" variant="outline" disabled={pending}>Guardar meta</Button>
        </form>
      </section>
      <section className="rounded-2xl border border-border bg-card px-5 py-4">
        <h2 className="text-xl">Registrar</h2>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            run(() =>
              saveCardioSession({
                performedOn: data.date,
                activity: String(form.get("activity") ?? "treadmill"),
                customLabel: String(form.get("customLabel") ?? ""),
                durationMinutes: String(form.get("duration") ?? ""),
                distanceKm: String(form.get("distance") ?? ""),
                speedKmh: String(form.get("speed") ?? ""),
                inclinePercent: String(form.get("incline") ?? ""),
                intensity: String(form.get("intensity") ?? ""),
                heartRate: String(form.get("heart") ?? ""),
                energyMode: String(form.get("energyMode") ?? "none"),
                informedKcal: String(form.get("informed") ?? ""),
                notes: String(form.get("notes") ?? ""),
              }),
            )
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="activity">Atividade</Label>
            <select id="activity" name="activity" className="h-10 rounded-xl border border-border bg-background px-3 text-sm">
              <option value="treadmill">Esteira</option>
              <option value="walk">Caminhada</option>
              <option value="run">Corrida</option>
              <option value="cycle">Bicicleta</option>
              <option value="other">Outra</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="custom">Nome, se for outra</Label>
            <Input id="custom" name="customLabel" />
          </div>
          <div className="grid gap-1.5"><Label htmlFor="duration">Duração (min)</Label><Input id="duration" name="duration" inputMode="numeric" required /></div>
          <div className="grid gap-1.5"><Label htmlFor="distance">Distância (km)</Label><Input id="distance" name="distance" inputMode="decimal" /></div>
          <div className="grid gap-1.5"><Label htmlFor="speed">Velocidade (km/h)</Label><Input id="speed" name="speed" inputMode="decimal" /></div>
          <div className="grid gap-1.5"><Label htmlFor="incline">Inclinação (%)</Label><Input id="incline" name="incline" inputMode="decimal" /></div>
          <div className="grid gap-1.5">
            <Label htmlFor="intensity">Intensidade</Label>
            <select id="intensity" name="intensity" className="h-10 rounded-xl border border-border bg-background px-3 text-sm" defaultValue="">
              <option value="">Não informar</option>
              <option value="easy">Leve</option>
              <option value="moderate">Moderada</option>
              <option value="vigorous">Intensa</option>
            </select>
          </div>
          <div className="grid gap-1.5"><Label htmlFor="heart">Frequência cardíaca</Label><Input id="heart" name="heart" inputMode="numeric" /></div>
          <div className="grid gap-1.5">
            <Label htmlFor="energy">Calorias</Label>
            <select id="energy" name="energyMode" className="h-10 rounded-xl border border-border bg-background px-3 text-sm">
              <option value="none">Não registrar</option>
              <option value="estimate">Estimar pela equação ACSM</option>
              <option value="informed">Usar o número do equipamento</option>
            </select>
          </div>
          <div className="grid gap-1.5"><Label htmlFor="informed">Número informado</Label><Input id="informed" name="informed" inputMode="decimal" /></div>
          <Button type="submit" disabled={pending} className="sm:col-span-2">Salvar atividade</Button>
        </form>
      </section>
      <section className="rounded-2xl border border-border bg-card px-5 py-4">
        <h2 className="text-xl">Histórico da semana</h2>
        <ul className="mt-3 grid gap-3 text-sm">
          {data.sessions.map((session) => (
            <li key={session.id} className="flex justify-between gap-3">
              <span>
                {session.date} · {session.label ?? session.activity} · {session.minutes} min
                {session.incline !== null ? ` · ${session.incline}%` : ""}
                {session.kind === "acsm_estimate" ? ` · estimativa ${session.kcal} kcal (${session.formula}, ${session.weight} kg)` : ""}
                {session.kind === "informed" ? ` · informado ${session.kcal} kcal` : ""}
              </span>
              <button type="button" onClick={() => run(() => deleteCardioSession({ id: session.id }))}>Excluir</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
