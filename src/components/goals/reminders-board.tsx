"use client"

import { useState, useTransition, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createReminder, deleteReminder, updateReminder } from "@/lib/actions/goals"
import { reminderKinds, reminderLabels, type ReminderKind } from "@/lib/domain/goals"
import type { GoalCard, ReminderCard } from "@/lib/data/goals"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
const fieldClass = "grid gap-1.5"
const selectClass = "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"

export function RemindersBoard({ reminders, goals }: { reminders: ReminderCard[]; goals: GoalCard[] }) {
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
        <h2 className="text-xl">Novo lembrete</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          O lembrete aparece no Meu Dia, no horário e nos dias escolhidos. O aplicativo ainda não envia notificação push; isso depende de um serviço externo que não está configurado.
        </p>
        <ReminderForm goals={goals} pending={pending} onSubmit={(value) => run(() => createReminder(value))} />
      </section>
      <section className="grid gap-4">
        <h2 className="text-xl">Seus lembretes</h2>
        {reminders.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum lembrete configurado.</p> : null}
        {reminders.map((reminder) => (
          <article key={reminder.id} className="rounded-2xl border border-border bg-card px-5 py-4">
            <h3 className="text-lg">{reminder.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {reminderLabels[reminder.kind]} · {reminder.remindAt} · {reminder.weekdays.map((day) => days[day]).join(", ")} · {reminder.enabled ? "ativo" : "desativado"}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(editing === reminder.id ? null : reminder.id)}>
                {editing === reminder.id ? "Fechar" : "Editar"}
              </Button>
              <Button type="button" variant="ghost" disabled={pending} onClick={() => run(() => deleteReminder(reminder.id))}>
                Excluir
              </Button>
            </div>
            {editing === reminder.id ? (
              <ReminderForm reminder={reminder} goals={goals} pending={pending} onSubmit={(value) => run(() => updateReminder({ ...value, id: reminder.id }))} />
            ) : null}
          </article>
        ))}
      </section>
    </div>
  )
}

function ReminderForm({
  reminder,
  goals,
  pending,
  onSubmit,
}: {
  reminder?: ReminderCard
  goals: GoalCard[]
  pending: boolean
  onSubmit: (value: Record<string, unknown>) => void
}) {
  const [kind, setKind] = useState<ReminderKind>(reminder?.kind ?? "water")

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    onSubmit({
      title: form.get("title"),
      kind,
      goalId: kind === "goal" ? form.get("goalId") : "",
      enabled: form.get("enabled") === "on",
      remindAt: form.get("remindAt"),
      weekdays: form.getAll("weekdays").map((day) => Number(day)),
    })
  }

  return (
    <form className="mt-4 grid gap-3" onSubmit={submit}>
      <div className={fieldClass}>
        <Label htmlFor={reminder ? `lembrete-${reminder.id}` : "lembrete-titulo"}>Título</Label>
        <Input id={reminder ? `lembrete-${reminder.id}` : "lembrete-titulo"} name="title" defaultValue={reminder?.title} maxLength={120} required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className={fieldClass}>
          <Label htmlFor={reminder ? `tipo-${reminder.id}` : "lembrete-tipo"}>Tipo</Label>
          <select id={reminder ? `tipo-${reminder.id}` : "lembrete-tipo"} className={selectClass} value={kind} onChange={(event) => setKind(event.target.value as ReminderKind)}>
            {reminderKinds.map((item) => (
              <option key={item} value={item}>{reminderLabels[item]}</option>
            ))}
          </select>
        </div>
        <div className={fieldClass}>
          <Label htmlFor={reminder ? `hora-${reminder.id}` : "lembrete-hora"}>Horário</Label>
          <Input id={reminder ? `hora-${reminder.id}` : "lembrete-hora"} name="remindAt" type="time" defaultValue={reminder?.remindAt ?? "08:00"} required />
        </div>
      </div>
      {kind === "goal" ? (
        <div className={fieldClass}>
          <Label htmlFor={reminder ? `meta-${reminder.id}` : "lembrete-meta"}>Meta</Label>
          {goals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Crie uma meta antes de ligar o lembrete a ela.</p>
          ) : (
            <select id={reminder ? `meta-${reminder.id}` : "lembrete-meta"} name="goalId" className={selectClass} defaultValue={reminder?.goalId ?? goals[0]?.id}>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>{goal.title}</option>
              ))}
            </select>
          )}
        </div>
      ) : null}
      <fieldset>
        <legend className="text-sm text-foreground">Dias</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {days.map((label, index) => (
            <label key={label} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="weekdays" value={index} defaultChecked={reminder ? reminder.weekdays.includes(index) : true} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="enabled" defaultChecked={reminder?.enabled ?? true} />
        Ativo
      </label>
      <div>
        <Button type="submit" disabled={pending || (kind === "goal" && goals.length === 0)}>
          {reminder ? "Salvar lembrete" : "Criar lembrete"}
        </Button>
      </div>
    </form>
  )
}
