"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Link from "next/link"
import { deleteTask, rescheduleTask, skipTask, stopRoutine, toggleTask } from "@/lib/actions/organization"
import { addIsoDays } from "@/lib/domain/dates"
import { canCompleteFromChecklist } from "@/lib/domain/progress"
import type { TaskView } from "@/lib/domain/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export function TaskList({ tasks, date }: { tasks: TaskView[]; date: string }) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [skipTarget, setSkipTarget] = useState<TaskView | null>(null)
  const [moveTarget, setMoveTarget] = useState<TaskView | null>(null)
  const [, startTransition] = useTransition()

  function run(taskId: string, action: () => Promise<{ ok: boolean; message: string }>, close?: () => void) {
    setPendingId(taskId)
    startTransition(async () => {
      const result = await action()
      setPendingId(null)
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      close?.()
      router.refresh()
    })
  }

  const active = tasks.filter((task) => task.status === "pending" || task.status === "completed")
  const skipped = tasks.filter((task) => task.status === "skipped")
  const moved = tasks.filter((task) => task.status === "rescheduled")

  if (tasks.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm leading-6 text-muted-foreground">
        Nada planejado para este dia. Uma atividade nova aparece aqui na hora.
      </p>
    )
  }

  return (
    <div className="grid gap-5">
      <ul className="grid gap-2">
        {active.map((task) => (
          <li key={task.id} className="rounded-2xl border border-border bg-card px-3 py-3">
            <div className="flex items-start gap-3">
              <button
                type="button"
                aria-pressed={task.status === "completed"}
                aria-label={task.status === "completed" ? `Reabrir ${task.title}` : `Concluir ${task.title}`}
                disabled={pendingId === task.id || !canCompleteFromChecklist(task.completionPolicy)}
                className={cn(
                  "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border",
                  task.status === "completed"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-rose bg-card",
                )}
                onClick={() => run(task.id, () => toggleTask({ taskId: task.id }))}
              >
                {task.status === "completed" ? "✓" : null}
              </button>
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm", task.status === "completed" && "text-muted-foreground line-through")}>
                  {task.title}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[
                    task.timeOfDay,
                    task.isOptional ? "opcional" : null,
                    task.routineId ? "recorrente" : null,
                    task.completionPolicy === "module_record" ? "conclui no módulo" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Sem horário"}
                </p>
                <ModuleLink module={task.linkedModule} />
              </div>
            </div>
            {task.status === "pending" ? (
              <div className="mt-3 flex flex-wrap gap-2 pl-[3.25rem]">
                <Button variant="ghost" size="sm" onClick={() => setSkipTarget(task)}>
                  Ignorar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setMoveTarget(task)}>
                  Reagendar
                </Button>
                {task.routineId ? (
                  <Button variant="ghost" size="sm" onClick={() => run(task.id, () => stopRoutine({ taskId: task.id }))}>
                    Encerrar repetição
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => run(task.id, () => deleteTask({ taskId: task.id }))}>
                    Excluir
                  </Button>
                )}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      <QuietGroup title="Ignoradas" tasks={skipped} />
      <QuietGroup title="Reagendadas" tasks={moved} />
      <SkipDialog
        key={skipTarget?.id ?? "skip"}
        task={skipTarget}
        pending={pendingId === skipTarget?.id}
        onClose={() => setSkipTarget(null)}
        onConfirm={(reason) => {
          if (!skipTarget) return
          run(skipTarget.id, () => skipTask({ taskId: skipTarget.id, reason }), () => setSkipTarget(null))
        }}
      />
      <MoveDialog
        key={moveTarget?.id ?? "move"}
        task={moveTarget}
        date={date}
        pending={pendingId === moveTarget?.id}
        onClose={() => setMoveTarget(null)}
        onConfirm={(targetDate) => {
          if (!moveTarget) return
          run(
            moveTarget.id,
            () => rescheduleTask({ id: moveTarget.id, targetDate }),
            () => setMoveTarget(null),
          )
        }}
      />
    </div>
  )
}

function QuietGroup({ title, tasks }: { title: string; tasks: TaskView[] }) {
  if (tasks.length === 0) {
    return null
  }

  return (
    <section>
      <h3 className="mb-2 text-sm text-muted-foreground">{title}</h3>
      <ul className="grid gap-2">
        {tasks.map((task) => (
          <li key={task.id} className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
            <span>{task.title}</span>
            {task.skippedReason ? <span className="mt-1 block text-xs">{task.skippedReason}</span> : null}
            {task.rescheduledTo ? <span className="mt-1 block text-xs">Para {task.rescheduledTo.split("-").reverse().join("/")}</span> : null}
          </li>
        ))}
      </ul>
    </section>
  )
}

function SkipDialog({
  task,
  pending,
  onClose,
  onConfirm,
}: {
  task: TaskView | null
  pending: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState("")

  return (
    <Dialog open={Boolean(task)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ignorar atividade</DialogTitle>
          <DialogDescription>
            Um motivo curto registra a escolha. Atividades ignoradas saem do percentual do dia.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label htmlFor="skip-reason">Motivo</Label>
          <Input
            id="skip-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button
            className="h-10"
            disabled={pending}
            onClick={() => {
              onConfirm(reason)
              setReason("")
            }}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MoveDialog({
  task,
  date,
  pending,
  onClose,
  onConfirm,
}: {
  task: TaskView | null
  date: string
  pending: boolean
  onClose: () => void
  onConfirm: (targetDate: string) => void
}) {
  const [targetDate, setTargetDate] = useState(addIsoDays(date, 1))

  return (
    <Dialog open={Boolean(task)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reagendar</DialogTitle>
          <DialogDescription>A atividade deixa este dia e passa a valer na data escolhida.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label htmlFor="move-date">Nova data</Label>
          <Input id="move-date" type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
        </div>
        <DialogFooter>
          <Button className="h-10" disabled={pending} onClick={() => onConfirm(targetDate)}>
            Reagendar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ModuleLink({ module }: { module: TaskView["linkedModule"] }) {
  const href =
    module === "devotional" ? "/devocional" : module === "workout" ? "/treinos" : module === "study" ? "/estudos" : null
  if (!href) return null
  return (
    <Link href={href} className="mt-1 inline-block text-xs underline-offset-4 hover:underline">
      Abrir registro
    </Link>
  )
}
