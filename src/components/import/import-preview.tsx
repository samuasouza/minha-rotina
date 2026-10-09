"use client"

import { useId, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { confirmDraft, discardDraft, readDraft } from "@/lib/actions/import"
import type { ImportModule } from "@/lib/domain/import"
import { providerMissingMessage } from "@/lib/domain/import"
import type { ImportDraftCard } from "@/lib/data/import"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const labels: Record<ImportModule, string> = {
  diet: "Dieta",
  workout: "Ficha de treino",
  study: "Estudo",
  schedule: "Tarefas e compromissos",
  water: "Água",
  meal: "Refeição",
}

export function ImportPreview({
  draft,
  providerConfigured,
}: {
  draft: ImportDraftCard
  providerConfigured: boolean
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [proposal, setProposal] = useState(() => initialProposal(draft.module, draft.proposal))

  async function confirm() {
    setPending(true)
    const result = await confirmDraft({ id: draft.id, proposal })
    setPending(false)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success(result.message)
    router.refresh()
  }

  async function read() {
    setPending(true)
    const result = await readDraft({ id: draft.id })
    setPending(false)
    if (!result.ok) {
      toast.message(result.message)
      return
    }
    toast.success(result.message)
    router.refresh()
  }

  async function discard() {
    setPending(true)
    const result = await discardDraft({ id: draft.id })
    setPending(false)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success(result.message)
    router.refresh()
  }

  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl">{labels[draft.module]}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {draft.sourceName ?? "Material sem nome"} · {draft.sourceKind}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {providerConfigured ? (
            <Button type="button" variant="outline" disabled={pending} onClick={() => void read()}>
              Ler material
            </Button>
          ) : null}
          <Button type="button" variant="ghost" disabled={pending} onClick={() => void discard()}>
            Descartar
          </Button>
        </div>
      </header>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {draft.reviewNote ?? (providerConfigured ? "Revise a prévia antes de confirmar." : providerMissingMessage)}
      </p>
      <div className="mt-4 grid gap-4">
        <ProposalFields module={draft.module} value={proposal} onChange={setProposal} />
      </div>
      <Button type="button" className="mt-4" disabled={pending} onClick={() => void confirm()}>
        Confirmar e salvar
      </Button>
    </article>
  )
}

function ProposalFields({
  module,
  value,
  onChange,
}: {
  module: ImportModule
  value: Record<string, unknown>
  onChange: (value: Record<string, unknown>) => void
}) {
  if (module === "diet") return <DietFields value={value} onChange={onChange} />
  if (module === "workout") return <WorkoutFields value={value} onChange={onChange} />
  if (module === "study") return <StudyFields value={value} onChange={onChange} />
  if (module === "schedule") return <ScheduleFields value={value} onChange={onChange} />
  if (module === "water") return <WaterFields value={value} onChange={onChange} />
  return <MealFields value={value} onChange={onChange} />
}

function DietFields({ value, onChange }: { value: Record<string, unknown>; onChange: (value: Record<string, unknown>) => void }) {
  const meals = arrayOf(value.meals)
  return (
    <>
      <Field label="Nome do plano" value={text(value.title)} onChange={(title) => onChange({ ...value, title })} />
      <Field
        label="Prescrito por"
        value={text(value.prescribedBy)}
        onChange={(prescribedBy) => onChange({ ...value, prescribedBy })}
        placeholder="Deixe em branco se o material não informar"
      />
      {meals.map((meal, mealIndex) => (
        <fieldset key={mealIndex} className="grid gap-3 rounded-xl border border-border p-3">
          <Field
            label={`Refeição ${mealIndex + 1}`}
            value={text(meal.name)}
            onChange={(name) => onChange({ ...value, meals: replace(meals, mealIndex, { ...meal, name }) })}
          />
          {arrayOf(meal.items).map((item, itemIndex) => (
            <div key={itemIndex} className="grid gap-2 sm:grid-cols-[1fr_7rem_6rem]">
              <Field
                label={`Alimento ${itemIndex + 1}`}
                value={text(item.label)}
                onChange={(label) =>
                  onChange({
                    ...value,
                    meals: replace(meals, mealIndex, { ...meal, items: replace(arrayOf(meal.items), itemIndex, { ...item, label }) }),
                  })
                }
              />
              <Field
                label="Quantidade"
                value={text(item.quantity)}
                onChange={(quantity) =>
                  onChange({
                    ...value,
                    meals: replace(meals, mealIndex, {
                      ...meal,
                      items: replace(arrayOf(meal.items), itemIndex, { ...item, quantity }),
                    }),
                  })
                }
              />
              <UnitField
                value={text(item.unit)}
                onChange={(unit) =>
                  onChange({
                    ...value,
                    meals: replace(meals, mealIndex, { ...meal, items: replace(arrayOf(meal.items), itemIndex, { ...item, unit }) }),
                  })
                }
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              onChange({
                ...value,
                meals: replace(meals, mealIndex, {
                  ...meal,
                  items: [...arrayOf(meal.items), { label: "", quantity: "", unit: "" }],
                }),
              })
            }
          >
            Adicionar alimento
          </Button>
        </fieldset>
      ))}
      <Button type="button" variant="outline" onClick={() => onChange({ ...value, meals: [...meals, { name: "", items: [{ label: "", quantity: "", unit: "" }] }] })}>
        Adicionar refeição
      </Button>
    </>
  )
}

function WorkoutFields({ value, onChange }: { value: Record<string, unknown>; onChange: (value: Record<string, unknown>) => void }) {
  const days = arrayOf(value.days)
  return (
    <>
      <Field label="Nome da ficha" value={text(value.name)} onChange={(name) => onChange({ ...value, name })} />
      <label className="grid gap-1 text-sm">
        <span>Observação</span>
        <Textarea value={text(value.notes)} onChange={(event) => onChange({ ...value, notes: event.target.value })} />
      </label>
      {days.map((day, dayIndex) => (
        <fieldset key={dayIndex} className="grid gap-3 rounded-xl border border-border p-3">
          <Field
            label={`Dia ${dayIndex + 1}`}
            value={text(day.name)}
            onChange={(name) => onChange({ ...value, days: replace(days, dayIndex, { ...day, name }) })}
          />
          {arrayOf(day.exercises).map((exercise, exerciseIndex) => (
            <div key={exerciseIndex} className="grid gap-2 sm:grid-cols-[1fr_6rem_7rem]">
              <Field
                label={`Exercício ${exerciseIndex + 1}`}
                value={text(exercise.name)}
                onChange={(name) =>
                  onChange({
                    ...value,
                    days: replace(days, dayIndex, {
                      ...day,
                      exercises: replace(arrayOf(day.exercises), exerciseIndex, { ...exercise, name }),
                    }),
                  })
                }
              />
              <Field
                label="Séries"
                value={text(exercise.targetSets)}
                onChange={(targetSets) =>
                  onChange({
                    ...value,
                    days: replace(days, dayIndex, {
                      ...day,
                      exercises: replace(arrayOf(day.exercises), exerciseIndex, { ...exercise, targetSets }),
                    }),
                  })
                }
              />
              <Field
                label="Repetições"
                value={text(exercise.targetReps)}
                onChange={(targetReps) =>
                  onChange({
                    ...value,
                    days: replace(days, dayIndex, {
                      ...day,
                      exercises: replace(arrayOf(day.exercises), exerciseIndex, { ...exercise, targetReps }),
                    }),
                  })
                }
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              onChange({
                ...value,
                days: replace(days, dayIndex, {
                  ...day,
                  exercises: [...arrayOf(day.exercises), { name: "", targetSets: "", targetReps: "" }],
                }),
              })
            }
          >
            Adicionar exercício
          </Button>
        </fieldset>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          onChange({ ...value, days: [...days, { name: "", exercises: [{ name: "", targetSets: "", targetReps: "" }] }] })
        }
      >
        Adicionar dia
      </Button>
    </>
  )
}

function StudyFields({ value, onChange }: { value: Record<string, unknown>; onChange: (value: Record<string, unknown>) => void }) {
  return (
    <>
      <Field label="Matéria" value={text(value.subjectName)} onChange={(subjectName) => onChange({ ...value, subjectName })} />
      <label className="grid gap-1 text-sm">
        <span>Tipo</span>
        <select
          className="h-9 rounded-lg border border-border bg-background px-2"
          value={value.kind === "course" ? "course" : "subject"}
          onChange={(event) => onChange({ ...value, kind: event.target.value })}
        >
          <option value="subject">Matéria</option>
          <option value="course">Curso</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span>Nota</span>
        <Textarea value={text(value.notes)} onChange={(event) => onChange({ ...value, notes: event.target.value })} />
      </label>
      <Field
        label="Minutos, se o material informar"
        value={text(value.minutes)}
        onChange={(minutes) => onChange({ ...value, minutes })}
      />
      <label className="grid gap-1 text-sm">
        <span>Dia da sessão, se houver minutos</span>
        <Input type="date" value={text(value.date)} onChange={(event) => onChange({ ...value, date: event.target.value })} />
      </label>
    </>
  )
}

function ScheduleFields({ value, onChange }: { value: Record<string, unknown>; onChange: (value: Record<string, unknown>) => void }) {
  const items = arrayOf(value.items)
  return (
    <>
      {items.map((item, index) => (
        <div key={index} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-2">
          <Field
            label={`Item ${index + 1}`}
            value={text(item.title)}
            onChange={(title) => onChange({ ...value, items: replace(items, index, { ...item, title }) })}
          />
          <label className="grid gap-1 text-sm">
            <span>Tipo</span>
            <select
              className="h-9 rounded-lg border border-border bg-background px-2"
              value={item.kind === "appointment" ? "appointment" : "task"}
              onChange={(event) => onChange({ ...value, items: replace(items, index, { ...item, kind: event.target.value }) })}
            >
              <option value="task">Tarefa</option>
              <option value="appointment">Compromisso</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span>Data</span>
            <Input
              type="date"
              value={text(item.date)}
              onChange={(event) => onChange({ ...value, items: replace(items, index, { ...item, date: event.target.value }) })}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>Horário, se houver</span>
            <Input
              type="time"
              value={text(item.time)}
              onChange={(event) => onChange({ ...value, items: replace(items, index, { ...item, time: event.target.value }) })}
            />
          </label>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() => onChange({ ...value, items: [...items, { title: "", date: "", time: "", kind: "task" }] })}
      >
        Adicionar item
      </Button>
    </>
  )
}

function WaterFields({ value, onChange }: { value: Record<string, unknown>; onChange: (value: Record<string, unknown>) => void }) {
  return (
    <>
      <label className="grid gap-1 text-sm">
        <span>Data</span>
        <Input type="date" value={text(value.date)} onChange={(event) => onChange({ ...value, date: event.target.value })} />
      </label>
      <Field label="Mililitros" value={text(value.milliliters)} onChange={(milliliters) => onChange({ ...value, milliliters })} />
    </>
  )
}

function MealFields({ value, onChange }: { value: Record<string, unknown>; onChange: (value: Record<string, unknown>) => void }) {
  const items = arrayOf(value.items)
  return (
    <>
      <label className="grid gap-1 text-sm">
        <span>Data</span>
        <Input type="date" value={text(value.date)} onChange={(event) => onChange({ ...value, date: event.target.value })} />
      </label>
      <Field label="Refeição" value={text(value.name)} onChange={(name) => onChange({ ...value, name })} />
      {items.map((item, index) => (
        <fieldset key={index} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-2">
          <Field
            label={`Alimento ${index + 1}`}
            value={text(item.name)}
            onChange={(name) => onChange({ ...value, items: replace(items, index, { ...item, name }) })}
          />
          <Field
            label="Quantidade"
            value={text(item.quantity)}
            onChange={(quantity) => onChange({ ...value, items: replace(items, index, { ...item, quantity }) })}
          />
          <UnitField
            value={text(item.unit)}
            onChange={(unit) => onChange({ ...value, items: replace(items, index, { ...item, unit }) })}
          />
          <Field label="kcal" value={text(item.kcal)} onChange={(kcal) => onChange({ ...value, items: replace(items, index, { ...item, kcal }) })} />
          <Field
            label="Proteína (g)"
            value={text(item.protein)}
            onChange={(protein) => onChange({ ...value, items: replace(items, index, { ...item, protein }) })}
          />
          <Field
            label="Carboidrato (g)"
            value={text(item.carbs)}
            onChange={(carbs) => onChange({ ...value, items: replace(items, index, { ...item, carbs }) })}
          />
          <Field
            label="Gordura (g)"
            value={text(item.fat)}
            onChange={(fat) => onChange({ ...value, items: replace(items, index, { ...item, fat }) })}
          />
          <Field
            label="Fonte dos valores"
            value={text(item.sourceNote)}
            onChange={(sourceNote) => onChange({ ...value, items: replace(items, index, { ...item, sourceNote }) })}
          />
        </fieldset>
      ))}
    </>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  const id = useId()
  return (
    <div className="grid gap-1">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}

function UnitField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-sm">
      <span>Unidade</span>
      <select className="h-9 w-full min-w-0 rounded-lg border border-border bg-background px-2" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Sem quantidade</option>
        <option value="g">g</option>
        <option value="ml">ml</option>
        <option value="unit">unidade</option>
      </select>
    </label>
  )
}

function text(value: unknown) {
  return value == null ? "" : String(value)
}

function arrayOf(value: unknown) {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : []
}

function replace(rows: Record<string, unknown>[], index: number, next: Record<string, unknown>) {
  return rows.map((row, rowIndex) => (rowIndex === index ? next : row))
}

function initialProposal(module: ImportModule, proposal: unknown): Record<string, unknown> {
  if (proposal && typeof proposal === "object" && !Array.isArray(proposal)) {
    return proposal as Record<string, unknown>
  }
  if (module === "diet") return { title: "", prescribedBy: "", meals: [{ name: "", items: [{ label: "", quantity: "", unit: "" }] }] }
  if (module === "workout") {
    return { name: "", notes: "", days: [{ name: "", exercises: [{ name: "", targetSets: "", targetReps: "" }] }] }
  }
  if (module === "study") return { subjectName: "", kind: "subject", notes: "", minutes: "", date: "" }
  if (module === "schedule") return { items: [{ title: "", date: "", time: "", kind: "task" }] }
  if (module === "water") return { date: "", milliliters: "" }
  return {
    date: "",
    name: "",
    items: [{ name: "", quantity: "", unit: "g", kcal: "", protein: "", carbs: "", fat: "", sourceNote: "" }],
  }
}
