"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  addMeasureDefinition,
  deleteBodyPhoto,
  deleteWeight,
  saveMeasurement,
  saveWeight,
  uploadBodyPhoto,
} from "@/lib/actions/body"
import type { BodyReady } from "@/lib/data/health"
import { DateNav } from "@/components/health/date-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function BodyView({ data }: { data: BodyReady }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const latest = data.weights.at(-1)
  const previous = data.weights.at(-2)

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

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl">Meu Corpo</h1>
        <DateNav base="/meu-corpo" date={data.date} today={data.today} />
      </div>
      <section className="rounded-2xl border border-border bg-card px-5 py-4">
        <h2 className="text-xl">Peso</h2>
        {latest && previous ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Último {latest.kg} kg em {latest.date}. Diferença para o registro anterior: {(latest.kg - previous.kg).toFixed(2)} kg.
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">O gráfico aparece a partir do segundo registro.</p>
        )}
        <WeightChart points={data.weights} />
        <form
          className="mt-4 flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const kg = String(new FormData(event.currentTarget).get("kg") ?? "")
            run(() => saveWeight({ recordedOn: data.date, weightKg: kg }))
          }}
        >
          <Input name="kg" inputMode="decimal" placeholder="kg" aria-label="Peso em quilos" className="w-28" />
          <Button type="submit" disabled={pending}>Guardar peso</Button>
        </form>
        <ul className="mt-3 text-sm">
          {data.weights.map((row) => (
            <li key={row.id} className="flex justify-between">
              {row.date} · {row.kg} kg
              <button type="button" onClick={() => run(() => deleteWeight({ id: row.id }))}>Excluir</button>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border border-border bg-card px-5 py-4">
        <h2 className="text-xl">Medidas</h2>
        <form
          className="mt-4 flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            run(() => addMeasureDefinition({ name: String(form.get("name") ?? ""), unit: String(form.get("unit") ?? "cm") }))
          }}
        >
          <Input name="name" placeholder="Nome da medida" aria-label="Nome da medida" />
          <Input name="unit" defaultValue="cm" aria-label="Unidade" className="w-20" />
          <Button type="submit" variant="outline">Criar</Button>
        </form>
        {data.definitions.map((definition) => {
          const series = data.measurements.filter((item) => item.definitionId === definition.id)
          const last = series.at(-1)
          const before = series.at(-2)
          return (
            <div key={definition.id} className="mt-4">
              <h3 className="text-sm">
                {definition.name} ({definition.unit})
                {last && before ? ` · diferença ${(last.value - before.value).toFixed(1)}` : ""}
              </h3>
              <form
                className="mt-2 flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault()
                  const value = String(new FormData(event.currentTarget).get("value") ?? "")
                  run(() => saveMeasurement({ definitionId: definition.id, recordedOn: data.date, value }))
                }}
              >
                <Input name="value" inputMode="decimal" aria-label={`Valor de ${definition.name}`} className="w-28" />
                <Button type="submit" variant="outline">Guardar</Button>
              </form>
            </div>
          )
        })}
      </section>
      <section className="rounded-2xl border border-border bg-card px-5 py-4">
        <h2 className="text-xl">Fotos</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          As fotos ficam em um espaço privado. O link de visualização expira e não é público.
        </p>
        <form
          className="mt-4 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            const formData = new FormData(event.currentTarget)
            formData.set("recordedOn", data.date)
            run(() => uploadBodyPhoto(formData))
          }}
        >
          <Label htmlFor="photo">Foto</Label>
          <Input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" required />
          <Input name="caption" placeholder="Legenda opcional" aria-label="Legenda" />
          <Button type="submit" disabled={pending}>Enviar foto</Button>
        </form>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {data.photos.map((photo) => (
            <li key={photo.id}>
              {photo.url ? (
                // Signed URLs are temporary and private to this account.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.url} alt={photo.caption ?? `Foto de ${photo.date}`} className="aspect-[3/4] w-full rounded-2xl object-cover" />
              ) : (
                <p className="text-sm text-muted-foreground">A foto está guardada, mas o link temporário não pôde ser criado agora.</p>
              )}
              <p className="mt-2 text-sm">{photo.date}{photo.caption ? ` · ${photo.caption}` : ""}</p>
              <button type="button" className="text-sm underline-offset-4 hover:underline" onClick={() => run(() => deleteBodyPhoto({ id: photo.id }))}>
                Excluir
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function WeightChart({ points }: { points: { date: string; kg: number }[] }) {
  if (points.length < 2) return null
  const values = points.map((point) => point.kg)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const width = 320
  const height = 120
  const coordinates = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width
      const y = height - ((point.kg - min) / span) * (height - 16) - 8
      return `${x},${y}`
    })
    .join(" ")

  return (
    <div className="mt-4">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Gráfico da evolução do peso" className="w-full text-primary">
        <polyline fill="none" stroke="currentColor" strokeWidth="2" points={coordinates} />
      </svg>
      <table className="mt-2 w-full text-left text-xs text-muted-foreground">
        <caption className="sr-only">Histórico de peso</caption>
        <thead>
          <tr>
            <th>Data</th>
            <th>Peso</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.date}>
              <td>{point.date}</td>
              <td>{point.kg} kg</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
