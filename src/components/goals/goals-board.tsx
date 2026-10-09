"use client"

import { useState, useTransition, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createGoal, saveCheckin, updateGoal } from "@/lib/actions/goals"
import {
  categoryLabels,
  defaultUnits,
  formatQuantity,
  goalCategories,
  goalMeasures,
  goalPeriods,
  goalStatuses,
  measureLabels,
  percentLabel,
  periodLabels,
  statusLabels,
  type GoalMeasure,
  type GoalPeriod,
} from "@/lib/domain/goals"
import type { GoalCard } from "@/lib/data/goals"
import { formatShortDate } from "@/lib/domain/dates"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const fieldClass = "grid gap-1.5"
const selectClass = "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"

export function GoalsBoard({ goals, today }: { goals: GoalCard[]; today: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [editing, setEditing] = useState<string | null>(null)

  function run(action: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      setEditing(null)
      router.refresh()
    })
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-border bg-card px-5 py-4">
        <h2 className="text-xl">Nova meta</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Quando a medição vem de um módulo, o progresso usa os registros que você já fez. A opção manual é a única que pede um lançamento à parte.
        </p>
        <GoalForm today={today} pending={pending} onSubmit={(value) => run(() => createGoal(value))} />
      </section>

      <section className="grid gap-4" aria-labelledby="lista-metas">
        <h2 id="lista-metas" className="text-xl">
          Suas metas
        </h2>
        {goals.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma meta pessoal ainda.</p> : null}
        {goals.map((goal) => (
          <article key={goal.id} className="rounded-2xl border border-border bg-card px-5 py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h3 className="text-lg">{goal.title}</h3>
              <p className="text-sm text-muted-foreground">{statusLabels[goal.status]} · {periodLabels[goal.period]}</p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {categoryLabels[goal.category]} · {measureLabels[goal.measure]}
              {goal.measure === "manual" ? " · lançamento manual" : " · calculada pelos registros"}
            </p>
            <p className="mt-3 text-sm leading-6 text-foreground">{progressText(goal)}</p>
            {goal.revisions.length > 0 ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-foreground">Histórico</summary>
                <ul className="mt-2 grid gap-1">
                  {goal.revisions.map((revision) => (
                    <li key={revision.recordedAt} className="text-sm text-muted-foreground">
                      Antes, em {formatShortDate(revision.recordedAt.slice(0, 10))}: {revision.title}, {formatQuantity(revision.target)} {revision.unit}, {statusLabels[revision.status]}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(editing === goal.id ? null : goal.id)}>
                {editing === goal.id ? "Fechar" : "Editar"}
              </Button>
            </div>
            {editing === goal.id ? (
              <GoalForm goal={goal} today={today} pending={pending} onSubmit={(value) => run(() => updateGoal({ ...value, id: goal.id }))} />
            ) : null}
            {goal.measure === "manual" && goal.status === "active" ? (
              <CheckinForm goalId={goal.id} today={today} pending={pending} onSubmit={(value) => run(() => saveCheckin(value))} />
            ) : null}
          </article>
        ))}
      </section>
    </div>
  )
}

function progressText(goal: GoalCard) {
  if (goal.amount === null) {
    return "Ainda sem registro neste período. A ausência de registro não significa que a atividade não aconteceu."
  }
  if (goal.measure === "body_weight" && goal.ratio === null) {
    return `${formatQuantity(goal.amount)} ${goal.unit}. Ainda não há um peso de referência anterior ao início da meta.`
  }
  const percent = percentLabel(goal.ratio)
  const source = goal.measure === "manual" ? "Lançamento manual." : "Calculado pelos registros."
  return `${formatQuantity(goal.amount)} de ${formatQuantity(goal.target)} ${goal.unit}${percent ? ` · ${percent}` : ""}. ${source}`
}

function GoalForm({
  goal,
  today,
  pending,
  onSubmit,
}: {
  goal?: GoalCard
  today: string
  pending: boolean
  onSubmit: (value: Record<string, unknown>) => void
}) {
  const [measure, setMeasure] = useState<GoalMeasure>(goal?.measure ?? "manual")
  const [period, setPeriod] = useState<GoalPeriod>(goal?.period ?? "weekly")
  const [unit, setUnit] = useState(goal?.unit ?? defaultUnits.manual)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    onSubmit({
      title: form.get("title"),
      category: form.get("category"),
      measure: goal?.measure ?? measure,
      targetValue: form.get("targetValue"),
      unit,
      period,
      customDays: period === "custom" ? form.get("customDays") : "",
      startsOn: form.get("startsOn"),
      endsOn: form.get("endsOn") ?? "",
      status: form.get("status") ?? "active",
    })
  }

  return (
    <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={submit}>
      <div className={`${fieldClass} sm:col-span-2`}>
        <Label htmlFor={goal ? `titulo-${goal.id}` : "titulo-meta"}>Título</Label>
        <Input id={goal ? `titulo-${goal.id}` : "titulo-meta"} name="title" defaultValue={goal?.title} maxLength={120} required />
      </div>
      <div className={fieldClass}>
        <Label htmlFor={goal ? `categoria-${goal.id}` : "categoria-meta"}>Categoria</Label>
        <select id={goal ? `categoria-${goal.id}` : "categoria-meta"} name="category" className={selectClass} defaultValue={goal?.category ?? "habit"}>
          {goalCategories.map((category) => (
            <option key={category} value={category}>{categoryLabels[category]}</option>
          ))}
        </select>
      </div>
      <div className={fieldClass}>
        <Label htmlFor={goal ? `medicao-${goal.id}` : "medicao-meta"}>Medição</Label>
        {goal ? (
          <p className="text-sm leading-6 text-muted-foreground">{measureLabels[goal.measure]}. A medição permanece a mesma para o histórico continuar comparável.</p>
        ) : (
          <select
            id="medicao-meta"
            className={selectClass}
            value={measure}
            onChange={(event) => {
              const next = event.target.value as GoalMeasure
              setMeasure(next)
              setUnit(defaultUnits[next])
            }}
          >
            {goalMeasures.map((item) => (
              <option key={item} value={item}>{measureLabels[item]}</option>
            ))}
          </select>
        )}
      </div>
      <div className={fieldClass}>
        <Label htmlFor={goal ? `alvo-${goal.id}` : "alvo-meta"}>Valor-alvo</Label>
        <Input id={goal ? `alvo-${goal.id}` : "alvo-meta"} name="targetValue" type="number" min="0.01" step="0.01" defaultValue={goal?.target ?? ""} required />
      </div>
      <div className={fieldClass}>
        <Label htmlFor={goal ? `unidade-${goal.id}` : "unidade-meta"}>Unidade</Label>
        <Input id={goal ? `unidade-${goal.id}` : "unidade-meta"} value={unit} onChange={(event) => setUnit(event.target.value)} maxLength={20} required />
      </div>
      <div className={fieldClass}>
        <Label htmlFor={goal ? `periodo-${goal.id}` : "periodo-meta"}>Período</Label>
        <select id={goal ? `periodo-${goal.id}` : "periodo-meta"} className={selectClass} value={period} onChange={(event) => setPeriod(event.target.value as GoalPeriod)}>
          {goalPeriods.map((item) => (
            <option key={item} value={item}>{periodLabels[item]}</option>
          ))}
        </select>
      </div>
      {period === "custom" ? (
        <div className={fieldClass}>
          <Label htmlFor={goal ? `dias-${goal.id}` : "dias-meta"}>Duração em dias</Label>
          <Input id={goal ? `dias-${goal.id}` : "dias-meta"} name="customDays" type="number" min={1} max={366} defaultValue={goal?.customDays ?? 7} required />
        </div>
      ) : null}
      <div className={fieldClass}>
        <Label htmlFor={goal ? `inicio-${goal.id}` : "inicio-meta"}>Início</Label>
        <Input id={goal ? `inicio-${goal.id}` : "inicio-meta"} name="startsOn" type="date" defaultValue={goal?.startsOn ?? today} required />
      </div>
      <div className={fieldClass}>
        <Label htmlFor={goal ? `fim-${goal.id}` : "fim-meta"}>Término, se houver</Label>
        <Input id={goal ? `fim-${goal.id}` : "fim-meta"} name="endsOn" type="date" defaultValue={goal?.endsOn ?? ""} />
      </div>
      {goal ? (
        <div className={fieldClass}>
          <Label htmlFor={`status-${goal.id}`}>Status</Label>
          <select id={`status-${goal.id}`} name="status" className={selectClass} defaultValue={goal.status}>
            {goalStatuses.map((status) => (
              <option key={status} value={status}>{statusLabels[status]}</option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>{goal ? "Salvar alterações" : "Criar meta"}</Button>
      </div>
    </form>
  )
}

function CheckinForm({
  goalId,
  today,
  pending,
  onSubmit,
}: {
  goalId: string
  today: string
  pending: boolean
  onSubmit: (value: Record<string, unknown>) => void
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    onSubmit({
      goalId,
      recordedOn: form.get("recordedOn"),
      amount: form.get("amount"),
      note: form.get("note") ?? "",
    })
  }

  return (
    <form className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-[10rem_8rem_1fr_auto]" onSubmit={submit}>
      <div className={fieldClass}>
        <Label htmlFor={`checkin-data-${goalId}`}>Data do lançamento</Label>
        <Input id={`checkin-data-${goalId}`} name="recordedOn" type="date" defaultValue={today} required />
      </div>
      <div className={fieldClass}>
        <Label htmlFor={`checkin-valor-${goalId}`}>Quantidade</Label>
        <Input id={`checkin-valor-${goalId}`} name="amount" type="number" min="0.01" step="0.01" required />
      </div>
      <div className={fieldClass}>
        <Label htmlFor={`checkin-nota-${goalId}`}>Nota</Label>
        <Input id={`checkin-nota-${goalId}`} name="note" maxLength={280} />
      </div>
      <div className="self-end">
        <Button type="submit" variant="secondary" disabled={pending}>Lançar</Button>
      </div>
    </form>
  )
}
