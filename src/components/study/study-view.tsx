"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  addStudyGoal,
  addStudyNote,
  addSubject,
  addTopic,
  discardStudySession,
  finishStudySession,
  startStudySession,
  toggleStudyGoal,
  toggleTopic,
} from "@/lib/actions/study"
import type { StudyState } from "@/lib/data/records"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type Ready = Extract<StudyState, { status: "ready" }>

export function StudyView({ data }: { data: Ready }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const running = data.sessions.find((session) => session.status === "running")

  function run(action: () => Promise<{ ok: boolean; message: string; id?: string; startedAt?: string }>) {
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      if (result.id) {
        setSessionId(result.id)
        setStartedAt(Date.now())
      }
      toast.success(result.message)
      router.refresh()
    })
  }

  const activeId = sessionId ?? running?.id ?? null
  const doneTopics = data.subjects.reduce((total, subject) => total + subject.topics.filter((topic) => topic.is_done).length, 0)
  const allTopics = data.subjects.reduce((total, subject) => total + subject.topics.length, 0)

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-4xl">Estudos</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {data.completedMinutes} min registrados nas últimas sessões
          {allTopics ? ` · ${doneTopics} de ${allTopics} conteúdos` : ""}
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card px-5 py-4">
        <h2 className="text-2xl">Matérias e cursos</h2>
        <form
          className="mt-3 grid gap-2 sm:grid-cols-[1fr_10rem_auto]"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            run(() => addSubject({ name: String(form.get("name") ?? ""), kind: String(form.get("kind") ?? "subject") }))
            event.currentTarget.reset()
          }}
        >
          <Input name="name" placeholder="Nome" />
          <select className="h-10 rounded-xl border border-input bg-card px-2 text-sm" name="kind" defaultValue="subject">
            <option value="subject">Matéria</option>
            <option value="course">Curso</option>
          </select>
          <Button className="h-10" disabled={pending} type="submit">
            Cadastrar
          </Button>
        </form>
        <div className="mt-4 grid gap-4">
          {data.subjects.map((subject) => (
            <article key={subject.id}>
              <h3 className="text-lg">{subject.name}</h3>
              <ul className="mt-2 grid gap-1 text-sm">
                {subject.topics.map((topic) => (
                  <li key={topic.id}>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={topic.is_done}
                        onChange={(event) => run(() => toggleTopic({ id: topic.id, done: event.target.checked }))}
                      />
                      {topic.title}
                    </label>
                  </li>
                ))}
              </ul>
              <form
                className="mt-2 flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault()
                  const form = new FormData(event.currentTarget)
                  run(() =>
                    addTopic({
                      subjectId: subject.id,
                      title: String(form.get("title") ?? ""),
                      position: String(subject.topics.length),
                    }),
                  )
                  event.currentTarget.reset()
                }}
              >
                <Input name="title" placeholder="Conteúdo" />
                <Button className="h-10" disabled={pending} type="submit">
                  Incluir
                </Button>
              </form>
              <Button
                className="mt-2 h-10"
                disabled={pending || Boolean(activeId)}
                type="button"
                onClick={() => run(() => startStudySession({ subjectId: subject.id }))}
              >
                Iniciar cronômetro
              </Button>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card px-5 py-4">
        <h2 className="text-2xl">Sessão</h2>
        {activeId ? (
          <form
            className="mt-3 grid gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              const form = new FormData(event.currentTarget)
              const elapsed = startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0
              run(async () => {
                const result = await finishStudySession({
                  sessionId: activeId,
                  sessionDate: data.date,
                  durationSeconds: elapsed,
                  notes: String(form.get("notes") ?? ""),
                })
                if (result.ok) setSessionId(null)
                return result
              })
            }}
          >
            <p className="text-sm text-muted-foreground">O tempo conta desde o início desta sessão neste aparelho.</p>
            <Textarea name="notes" placeholder="Anotação da sessão" />
            <div className="flex gap-2">
              <Button className="h-10" disabled={pending} type="submit">
                Encerrar e salvar
              </Button>
              <Button variant="ghost" disabled={pending} type="button" onClick={() => run(() => discardStudySession({ id: activeId }))}>
                Descartar
              </Button>
            </div>
          </form>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Escolha uma matéria para começar.</p>
        )}
        <ul className="mt-4 grid gap-2 text-sm">
          {data.sessions
            .filter((session) => session.status === "completed")
            .map((session) => (
              <li key={session.id}>
                {Math.round((session.duration_seconds ?? 0) / 60)} min
                {session.notes ? ` · ${session.notes}` : ""}
              </li>
            ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card px-5 py-4">
        <h2 className="text-2xl">Metas da semana</h2>
        <ul className="mt-3 grid gap-2 text-sm">
          {data.goals.map((goal) => (
            <li key={goal.id}>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={goal.is_done}
                  onChange={(event) => run(() => toggleStudyGoal({ id: goal.id, done: event.target.checked }))}
                />
                {goal.title}
                {goal.target_minutes ? ` · ${goal.target_minutes} min` : ""}
              </label>
            </li>
          ))}
        </ul>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            run(() =>
              addStudyGoal({
                weekStartsOn: data.week,
                title: String(form.get("title") ?? ""),
                targetMinutes: String(form.get("minutes") ?? "") || undefined,
              }),
            )
            event.currentTarget.reset()
          }}
        >
          <Input name="title" placeholder="Meta" />
          <Input name="minutes" placeholder="Minutos" inputMode="numeric" className="max-w-28" />
          <Button className="h-10" disabled={pending} type="submit">
            Salvar
          </Button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card px-5 py-4">
        <h2 className="text-2xl">Anotações</h2>
        <form
          className="mt-3 grid gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            run(() => addStudyNote({ subjectId: String(form.get("subjectId") ?? ""), body: String(form.get("body") ?? "") }))
            event.currentTarget.reset()
          }}
        >
          <select className="h-10 rounded-xl border border-input bg-card px-2 text-sm" name="subjectId">
            {data.subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
          <Textarea name="body" placeholder="Anotação" />
          <Button className="h-10 w-fit" disabled={pending || data.subjects.length === 0} type="submit">
            Salvar anotação
          </Button>
        </form>
        <ul className="mt-4 grid gap-2 text-sm">
          {data.notes.map((note) => (
            <li key={note.id}>{note.body}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}
