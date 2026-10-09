"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  addExercise,
  addPrescription,
  addSheet,
  addWorkoutDay,
  addWorkoutSet,
  decideSuggestion,
  deleteSheet,
  finishWorkoutSession,
  startWorkoutSession,
  suggestLoad,
} from "@/lib/actions/training"
import type { TrainingState } from "@/lib/data/records"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Ready = Extract<TrainingState, { status: "ready" }>

export function TrainingView({ data, today }: { data: Ready; today: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [sessionId, setSessionId] = useState<string | null>(data.sessions.find((session) => session.status === "partial")?.id ?? null)

  function run(action: () => Promise<{ ok: boolean; message: string; id?: string }>) {
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      if (result.id) setSessionId(result.id)
      toast.success(result.message)
      router.refresh()
    })
  }

  const active = data.sessions.find((session) => session.id === sessionId) ?? null

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-4xl">Treinos</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          A carga fica no registro de cada série. Uma sugestão só entra na ficha se você editar a prescrição.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card px-5 py-4">
        <h2 className="text-2xl">Exercícios</h2>
        <p className="mt-2 text-sm text-muted-foreground">{data.exercises.map((item) => item.name).join(" · ") || "Nenhum ainda."}</p>
        <Inline
          pending={pending}
          placeholder="Nome do exercício"
          onSubmit={(name) => run(() => addExercise({ name }))}
        />
      </section>

      <section className="grid gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl">Fichas</h2>
        </div>
        <Inline pending={pending} placeholder="Nome da ficha" onSubmit={(name) => run(() => addSheet({ name }))} />
        {data.sheets.map((sheet) => (
          <article key={sheet.id} className="rounded-2xl border border-border bg-card px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl">{sheet.name}</h3>
              <button type="button" className="text-xs underline-offset-4 hover:underline" onClick={() => run(() => deleteSheet({ id: sheet.id }))}>
                Excluir
              </button>
            </div>
            {sheet.days.map((day) => (
              <div key={day.id} className="mt-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-base">{day.name}</h4>
                  <Button
                    className="h-8"
                    disabled={pending}
                    type="button"
                    onClick={() =>
                      run(() => startWorkoutSession({ performedOn: today, dayId: day.id, sheetId: sheet.id }))
                    }
                  >
                    Começar
                  </Button>
                </div>
                <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
                  {day.exercises.map((exercise) => (
                    <li key={exercise.id}>
                      {exercise.name} · {exercise.target_sets}x{exercise.target_reps}
                    </li>
                  ))}
                </ul>
                <form
                  className="mt-2 grid gap-2 sm:grid-cols-5"
                  onSubmit={(event) => {
                    event.preventDefault()
                    const form = new FormData(event.currentTarget)
                    run(() =>
                      addPrescription({
                        dayId: day.id,
                        exerciseId: String(form.get("exerciseId") ?? ""),
                        position: String(form.get("position") ?? "0"),
                        targetSets: String(form.get("targetSets") ?? "3"),
                        targetReps: String(form.get("targetReps") ?? ""),
                      }),
                    )
                  }}
                >
                  <select className="h-10 w-full rounded-xl border border-input bg-card px-2 text-sm" name="exerciseId" aria-label="Exercício">
                    {data.exercises.map((exercise) => (
                      <option key={exercise.id} value={exercise.id}>
                        {exercise.name}
                      </option>
                    ))}
                  </select>
                  <Input name="position" defaultValue={day.exercises.length} inputMode="numeric" aria-label="Posição" />
                  <Input name="targetSets" defaultValue="3" inputMode="numeric" aria-label="Séries" />
                  <Input name="targetReps" placeholder="8-12" aria-label="Repetições" />
                  <Button className="h-10" disabled={pending} type="submit">
                    Incluir
                  </Button>
                </form>
              </div>
            ))}
            <form
              className="mt-3 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                const form = new FormData(event.currentTarget)
                run(() => addWorkoutDay({ sheetId: sheet.id, name: String(form.get("name") ?? ""), position: String(sheet.days.length) }))
                event.currentTarget.reset()
              }}
            >
              <Input name="name" placeholder="Nome do dia, como A ou inferiores" className="min-w-0 flex-1" aria-label="Nome do dia" />
              <Button className="h-10" disabled={pending} type="submit">
                Dia
              </Button>
            </form>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-border bg-card px-5 py-4">
        <h2 className="text-2xl">Sessão de hoje</h2>
        {active ? (
          <div className="mt-3 grid gap-3">
            <p className="text-sm text-muted-foreground">
              {active.performed_on} · {active.status === "completed" ? "concluída" : "parcial"}
            </p>
            <ul className="grid gap-1 text-sm">
              {active.sets.map((set) => {
                const previous = previousLoad(data.sessions, set.exercise_id, active.id)
                return (
                  <li key={set.id}>
                    {set.name} série {set.set_number}: {set.load_kg} kg × {set.reps}
                    {previous === null ? "" : ` · anterior ${previous} kg`}
                  </li>
                )
              })}
            </ul>
            <form
              className="grid gap-2 sm:grid-cols-5"
              onSubmit={(event) => {
                event.preventDefault()
                const form = new FormData(event.currentTarget)
                run(() =>
                  addWorkoutSet({
                    sessionId: active.id,
                    exerciseId: String(form.get("exerciseId") ?? ""),
                    setNumber: String(form.get("setNumber") ?? "1"),
                    reps: String(form.get("reps") ?? "0"),
                    loadKg: String(form.get("loadKg") ?? "0"),
                    completed: true,
                  }),
                )
              }}
            >
              <select className="h-10 w-full rounded-xl border border-input bg-card px-2 text-sm" name="exerciseId" aria-label="Exercício da série">
                {data.exercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
              </select>
              <Input name="setNumber" defaultValue={active.sets.length + 1} inputMode="numeric" aria-label="Número da série" />
              <Input name="reps" placeholder="Reps" inputMode="numeric" aria-label="Repetições" />
              <Input name="loadKg" placeholder="Kg" inputMode="decimal" aria-label="Carga em quilos" />
              <Button className="h-10" disabled={pending} type="submit">
                Série
              </Button>
            </form>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={pending}
                type="button"
                onClick={() =>
                  run(() => finishWorkoutSession({ id: active.id, status: "completed", performedOn: active.performed_on, title: "Treino" }))
                }
              >
                Concluir
              </Button>
              <Button
                variant="ghost"
                disabled={pending}
                type="button"
                onClick={() =>
                  run(() => finishWorkoutSession({ id: active.id, status: "partial", performedOn: active.performed_on, title: "Treino" }))
                }
              >
                Salvar parcial
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Comece por um dia da ficha.</p>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card px-5 py-4">
        <h2 className="text-2xl">Sugestão de carga</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Aceitar registra a decisão. A ficha continua como está.</p>
        <form
          className="mt-3 grid gap-2 sm:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            run(() =>
              suggestLoad({
                exerciseId: String(form.get("exerciseId") ?? ""),
                suggestedLoadKg: String(form.get("load") ?? ""),
                note: String(form.get("note") ?? ""),
              }),
            )
          }}
        >
          <select className="h-10 w-full rounded-xl border border-input bg-card px-2 text-sm" name="exerciseId" aria-label="Exercício da sugestão">
            {data.exercises.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>
                {exercise.name}
              </option>
            ))}
          </select>
          <Input name="load" placeholder="Kg sugeridos" inputMode="decimal" aria-label="Carga sugerida em quilos" />
          <Input name="note" placeholder="Motivo" aria-label="Motivo da sugestão" />
          <Button className="h-10" disabled={pending} type="submit">
            Sugerir
          </Button>
        </form>
        <ul className="mt-4 grid gap-2 text-sm">
          {data.suggestions.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {item.exerciseName}: {item.suggested_load_kg} kg · {item.status}
              </span>
              {item.status === "pending" ? (
                <span className="flex flex-wrap gap-2">
                  <button type="button" className="underline-offset-4 hover:underline" onClick={() => run(() => decideSuggestion({ id: item.id, decision: "accepted" }))}>
                    Aceitar
                  </button>
                  <button type="button" className="underline-offset-4 hover:underline" onClick={() => run(() => decideSuggestion({ id: item.id, decision: "dismissed" }))}>
                    Recusar
                  </button>
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function previousLoad(sessions: Ready["sessions"], exerciseId: string, currentSessionId: string) {
  for (const session of sessions) {
    if (session.id === currentSessionId) continue
    const match = [...session.sets].reverse().find((set) => set.exercise_id === exerciseId && set.completed)
    if (match) return match.load_kg
  }
  return null
}

function Inline({ pending, placeholder, onSubmit }: { pending: boolean; placeholder: string; onSubmit: (value: string) => void }) {
  return (
    <form
      className="mt-3 flex gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        const form = new FormData(event.currentTarget)
        onSubmit(String(form.get("value") ?? ""))
        event.currentTarget.reset()
      }}
    >
      <Input name="value" placeholder={placeholder} className="min-w-0 flex-1" />
      <Button className="h-10" disabled={pending} type="submit">
        Salvar
      </Button>
    </form>
  )
}
