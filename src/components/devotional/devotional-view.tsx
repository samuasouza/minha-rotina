"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  addDevotionalGoal,
  addGratitude,
  addPrayer,
  addReadingItem,
  addReadingLog,
  addReadingPlan,
  answerPrayer,
  deleteDevotionalGoal,
  deleteGratitude,
  deletePrayer,
  deleteReadingLog,
  deleteReadingPlan,
  saveDevotional,
  toggleDevotionalGoal,
} from "@/lib/actions/devotional"
import { addIsoDays, formatLongDate } from "@/lib/domain/dates"
import type { DevotionalState } from "@/lib/data/records"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type Ready = Extract<DevotionalState, { status: "ready" }>

export function DevotionalView({ data }: { data: Ready }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const entry = data.entry

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
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{formatLongDate(data.date)}</p>
          <h1 className="mt-1 text-4xl">Devocional</h1>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link className="inline-flex min-h-10 items-center underline-offset-4 hover:underline" href={`/devocional?data=${addIsoDays(data.date, -1)}`}>
            Anterior
          </Link>
          {data.date !== data.today ? (
            <Link className="inline-flex min-h-10 items-center underline-offset-4 hover:underline" href="/devocional">
              Hoje
            </Link>
          ) : null}
          <Link className="inline-flex min-h-10 items-center underline-offset-4 hover:underline" href={`/devocional?data=${addIsoDays(data.date, 1)}`}>
            Próximo
          </Link>
        </div>
      </header>

      <Section title="Leitura do dia">
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            run(() =>
              saveDevotional({
                entryDate: data.date,
                passageLabel: String(form.get("passageLabel") ?? ""),
                passageUrl: String(form.get("passageUrl") ?? ""),
                reflection: String(form.get("reflection") ?? ""),
                completed: form.get("completed") === "on",
              }),
            )
          }}
        >
          <Field label="Passagem" id="passageLabel">
            <Input id="passageLabel" name="passageLabel" defaultValue={entry?.passage_label ?? ""} placeholder="Salmo 23" />
          </Field>
          <Field label="Link externo" id="passageUrl">
            <Input id="passageUrl" name="passageUrl" defaultValue={entry?.passage_url ?? ""} placeholder="https://" />
          </Field>
          <Field label="Reflexão" id="reflection">
            <Textarea id="reflection" name="reflection" defaultValue={entry?.reflection ?? ""} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="completed" defaultChecked={Boolean(entry?.completed_at)} />
            Marcar o devocional como feito neste dia
          </label>
          <Button className="h-10 w-fit" disabled={pending} type="submit">
            Salvar
          </Button>
        </form>
      </Section>

      <Section title="Gratidão">
        <ul className="grid gap-2">
          {data.gratitude.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
              <span>{item.body}</span>
              <TextButton disabled={pending} onClick={() => run(() => deleteGratitude({ id: item.id }))}>
                Excluir
              </TextButton>
            </li>
          ))}
        </ul>
        <MiniForm
          pending={pending}
          label="Nova gratidão"
          onSubmit={(value) => run(() => addGratitude({ entryDate: data.date, body: value }))}
        />
      </Section>

      <Section title="Pedidos de oração">
        <ul className="grid gap-3">
          {data.prayers.map((prayer) => (
            <li key={prayer.id} className="rounded-xl border border-border px-3 py-3 text-sm">
              <p className="font-medium">{prayer.title}</p>
              {prayer.details ? <p className="mt-1 text-muted-foreground">{prayer.details}</p> : null}
              {prayer.status === "answered" ? (
                <p className="mt-2">Resposta: {prayer.answer}</p>
              ) : (
                <AnswerForm pending={pending} prayerId={prayer.id} date={data.date} onRun={run} />
              )}
              <TextButton disabled={pending} onClick={() => run(() => deletePrayer({ id: prayer.id }))}>
                Excluir
              </TextButton>
            </li>
          ))}
        </ul>
        <form
          className="mt-3 grid gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            run(() =>
              addPrayer({
                title: String(form.get("title") ?? ""),
                details: String(form.get("details") ?? ""),
                askedOn: data.date,
              }),
            )
            event.currentTarget.reset()
          }}
        >
          <Input name="title" placeholder="Pedido" />
          <Input name="details" placeholder="Detalhes, se quiser" />
          <Button className="h-10 w-fit" disabled={pending} type="submit">
            Registrar pedido
          </Button>
        </form>
      </Section>

      <Section title="Planos de leitura">
        {data.plans.map((plan) => (
          <div key={plan.id} className="mb-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg">{plan.title}</h3>
              <TextButton disabled={pending} onClick={() => run(() => deleteReadingPlan({ id: plan.id }))}>
                Excluir plano
              </TextButton>
            </div>
            <ul className="mt-2 grid gap-1 text-sm">
              {plan.items.map((item) => (
                <li key={item.id}>
                  Dia {item.day_number}: {item.passage_label}
                  {item.passage_url ? (
                    <a className="ml-2 underline-offset-4 hover:underline" href={item.passage_url} rel="noreferrer" target="_blank">
                      abrir
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
            <form
              className="mt-2 grid gap-2 sm:grid-cols-[5rem_1fr_1fr_auto]"
              onSubmit={(event) => {
                event.preventDefault()
                const form = new FormData(event.currentTarget)
                run(() =>
                  addReadingItem({
                    planId: plan.id,
                    dayNumber: String(form.get("dayNumber") ?? ""),
                    passageLabel: String(form.get("passageLabel") ?? ""),
                    passageUrl: String(form.get("passageUrl") ?? ""),
                  }),
                )
              }}
            >
              <Input name="dayNumber" inputMode="numeric" placeholder="Dia" />
              <Input name="passageLabel" placeholder="Passagem" />
              <Input name="passageUrl" placeholder="https://" />
              <Button className="h-10" disabled={pending} type="submit">
                Adicionar
              </Button>
            </form>
          </div>
        ))}
        <MiniForm pending={pending} label="Novo plano" onSubmit={(value) => run(() => addReadingPlan({ title: value, startsOn: data.date }))} />
      </Section>

      <Section title="Leituras livres">
        <ul className="grid gap-2 text-sm">
          {data.logs.map((log) => (
            <li key={log.id} className="flex justify-between gap-3">
              <span>
                {log.read_on}: {log.passage_label}
              </span>
              <TextButton disabled={pending} onClick={() => run(() => deleteReadingLog({ id: log.id }))}>
                Excluir
              </TextButton>
            </li>
          ))}
        </ul>
        <form
          className="mt-3 grid gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            run(() =>
              addReadingLog({
                readOn: data.date,
                passageLabel: String(form.get("passageLabel") ?? ""),
                passageUrl: String(form.get("passageUrl") ?? ""),
              }),
            )
            event.currentTarget.reset()
          }}
        >
          <Input name="passageLabel" placeholder="Passagem lida" />
          <Input name="passageUrl" placeholder="https://" />
          <Button className="h-10 w-fit" disabled={pending} type="submit">
            Registrar leitura
          </Button>
        </form>
      </Section>

      <Section title="Metas da semana">
        <ul className="grid gap-2">
          {data.goals.map((goal) => (
            <li key={goal.id} className="flex items-center justify-between gap-3 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={goal.is_done}
                  onChange={(event) => run(() => toggleDevotionalGoal({ id: goal.id, done: event.target.checked }))}
                />
                {goal.title}
              </label>
              <TextButton disabled={pending} onClick={() => run(() => deleteDevotionalGoal({ id: goal.id }))}>
                Excluir
              </TextButton>
            </li>
          ))}
        </ul>
        <MiniForm
          pending={pending}
          label="Nova meta"
          onSubmit={(value) => run(() => addDevotionalGoal({ weekStartsOn: data.week, title: value }))}
        />
      </Section>
    </div>
  )
}

function AnswerForm({
  prayerId,
  date,
  pending,
  onRun,
}: {
  prayerId: string
  date: string
  pending: boolean
  onRun: (action: () => Promise<{ ok: boolean; message: string }>) => void
}) {
  const [open, setOpen] = useState(false)
  if (!open) {
    return (
      <TextButton onClick={() => setOpen(true)} disabled={pending}>
        Registrar resposta
      </TextButton>
    )
  }
  return (
    <form
      className="mt-2 grid gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        const form = new FormData(event.currentTarget)
        onRun(() => answerPrayer({ prayerId, answer: String(form.get("answer") ?? ""), answeredOn: date }))
      }}
    >
      <Input name="answer" placeholder="Como foi respondido" />
      <Button className="h-10 w-fit" disabled={pending} type="submit">
        Salvar resposta
      </Button>
    </form>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card px-5 py-4">
      <h2 className="mb-3 text-2xl">{title}</h2>
      {children}
    </section>
  )
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}

function MiniForm({ pending, label, onSubmit }: { pending: boolean; label: string; onSubmit: (value: string) => void }) {
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
      <Input name="value" placeholder={label} className="min-w-0 flex-1" />
      <Button className="h-10" disabled={pending} type="submit">
        Salvar
      </Button>
    </form>
  )
}

function TextButton({ children, ...props }: React.ComponentProps<"button">) {
  return (
    <button type="button" className="text-xs text-muted-foreground underline-offset-4 hover:underline" {...props}>
      {children}
    </button>
  )
}
