"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { saveWellbeing } from "@/lib/actions/wellbeing"
import type { WellbeingReady } from "@/lib/data/health"
import { DateNav } from "@/components/health/date-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function WellbeingView({ data }: { data: WellbeingReady }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const entry = data.entry

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl">Bem-estar</h1>
        <DateNav base="/bem-estar" date={data.date} today={data.today} />
      </div>
      <section className="rounded-2xl border border-border bg-card px-5 py-4">
        <h2 className="text-xl">Este dia</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Tudo é opcional. Um campo em branco não significa que algo deixou de acontecer.
        </p>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            startTransition(async () => {
              const result = await saveWellbeing({
                entryDate: data.date,
                sleepHours: String(form.get("sleep") ?? ""),
                sleepQuality: String(form.get("quality") ?? ""),
                energy: String(form.get("energy") ?? ""),
                mood: String(form.get("mood") ?? ""),
                menstruation: String(form.get("cycle") ?? ""),
                notes: String(form.get("notes") ?? ""),
              })
              if (!result.ok) {
                toast.error(result.message)
                return
              }
              toast.success(result.message)
              router.refresh()
            })
          }}
        >
          <div className="grid gap-1.5"><Label htmlFor="sleep">Horas de sono</Label><Input id="sleep" name="sleep" inputMode="decimal" defaultValue={entry?.sleepHours ?? ""} /></div>
          <div className="grid gap-1.5"><Label htmlFor="quality">Qualidade do sono (1 a 5)</Label><Input id="quality" name="quality" inputMode="numeric" defaultValue={entry?.sleepQuality ?? ""} /></div>
          <div className="grid gap-1.5"><Label htmlFor="energy">Energia (1 a 5)</Label><Input id="energy" name="energy" inputMode="numeric" defaultValue={entry?.energy ?? ""} /></div>
          <div className="grid gap-1.5"><Label htmlFor="mood">Humor (1 a 5)</Label><Input id="mood" name="mood" inputMode="numeric" defaultValue={entry?.mood ?? ""} /></div>
          <div className="grid gap-1.5">
            <Label htmlFor="cycle">Ciclo menstrual</Label>
            <select id="cycle" name="cycle" defaultValue={entry?.menstruation === true ? "yes" : entry?.menstruation === false ? "no" : ""} className="h-10 rounded-xl border border-border bg-background px-3 text-sm">
              <option value="">Não registrar</option>
              <option value="yes">Sim</option>
              <option value="no">Não</option>
            </select>
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" defaultValue={entry?.notes ?? ""} />
          </div>
          <Button type="submit" disabled={pending}>{pending ? "Aguarde..." : "Guardar"}</Button>
        </form>
      </section>
      <section className="rounded-2xl border border-border bg-card px-5 py-4">
        <h2 className="text-xl">Histórico</h2>
        <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
          {data.history.map((row) => (
            <li key={row.date}>
              {row.date}
              {row.sleepHours !== null ? ` · sono ${row.sleepHours} h` : ""}
              {row.energy !== null ? ` · energia ${row.energy}` : ""}
              {row.mood !== null ? ` · humor ${row.mood}` : ""}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
