"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import {
  createAppointment,
  deleteAppointment,
  rescheduleAppointment,
  setAppointmentStatus,
} from "@/lib/actions/organization"
import { addIsoDays } from "@/lib/domain/dates"
import type { AppointmentView } from "@/lib/domain/types"
import { appointmentFormSchema, type AppointmentFormValues } from "@/lib/validation/schemas"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function AppointmentForm({ date, disabled = false }: { date: string; disabled?: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      title: "",
      notes: "",
      location: "",
      scheduledOn: date,
      startsAt: "",
      endsAt: "",
    },
  })

  function onSubmit(values: AppointmentFormValues) {
    startTransition(async () => {
      const result = await createAppointment({ ...values, scheduledOn: date })
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      setOpen(false)
      form.reset()
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        disabled={disabled}
        render={<Button variant="outline" className="h-10" disabled={disabled} />}
      >
        Novo compromisso
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo compromisso</DialogTitle>
          <DialogDescription>O horário pode ficar em branco quando o dia for livre.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-1.5">
            <Label htmlFor="appointment-title">Compromisso</Label>
            <Input id="appointment-title" {...form.register("title")} />
            {form.formState.errors.title ? (
              <p className="text-xs text-destructive" role="alert">{form.formState.errors.title.message}</p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="appointment-start">Início</Label>
              <Input id="appointment-start" type="time" {...form.register("startsAt")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="appointment-end">Fim</Label>
              <Input id="appointment-end" type="time" {...form.register("endsAt")} />
              {form.formState.errors.endsAt ? (
                <p className="text-xs text-destructive" role="alert">{form.formState.errors.endsAt.message}</p>
              ) : null}
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="appointment-location">Local</Label>
            <Input id="appointment-location" {...form.register("location")} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="appointment-notes">Observação</Label>
            <Textarea id="appointment-notes" rows={3} {...form.register("notes")} />
          </div>
          <DialogFooter>
            <Button type="submit" className="h-10" disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function AppointmentList({ appointments, date }: { appointments: AppointmentView[]; date: string }) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [moveTarget, setMoveTarget] = useState<AppointmentView | null>(null)
  const [, startTransition] = useTransition()
  const visible = appointments.filter((item) => item.status !== "rescheduled")

  function run(id: string, action: () => Promise<{ ok: boolean; message: string }>, close?: () => void) {
    setPendingId(id)
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

  if (visible.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm leading-6 text-muted-foreground">
        Nenhum compromisso neste dia.
      </p>
    )
  }

  return (
    <>
      <ul className="grid gap-2">
        {visible.map((item) => (
          <li key={item.id} className="rounded-2xl border border-border bg-card px-3 py-3">
            <p className="text-sm text-foreground">{item.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {[item.startsAt && item.endsAt ? `${item.startsAt}–${item.endsAt}` : item.startsAt, item.location, statusLabel(item.status)]
                .filter(Boolean)
                .join(" · ") || "Sem horário"}
            </p>
            {item.status === "scheduled" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="ghost" size="sm" disabled={pendingId === item.id} onClick={() => run(item.id, () => setAppointmentStatus({ appointmentId: item.id, status: "completed" }))}>
                  Concluir
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setMoveTarget(item)}>
                  Reagendar
                </Button>
                <Button variant="ghost" size="sm" disabled={pendingId === item.id} onClick={() => run(item.id, () => setAppointmentStatus({ appointmentId: item.id, status: "cancelled" }))}>
                  Cancelar
                </Button>
                <Button variant="ghost" size="sm" disabled={pendingId === item.id} onClick={() => run(item.id, () => deleteAppointment({ appointmentId: item.id }))}>
                  Excluir
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      <MoveAppointmentDialog
        key={moveTarget?.id ?? "move-appointment"}
        appointment={moveTarget}
        date={date}
        pending={pendingId === moveTarget?.id}
        onClose={() => setMoveTarget(null)}
        onConfirm={(targetDate) => {
          if (!moveTarget) return
          run(moveTarget.id, () => rescheduleAppointment({ id: moveTarget.id, targetDate }), () => setMoveTarget(null))
        }}
      />
    </>
  )
}

function statusLabel(status: AppointmentView["status"]) {
  if (status === "completed") return "concluído"
  if (status === "cancelled") return "cancelado"
  return null
}

function MoveAppointmentDialog({
  appointment,
  date,
  pending,
  onClose,
  onConfirm,
}: {
  appointment: AppointmentView | null
  date: string
  pending: boolean
  onClose: () => void
  onConfirm: (targetDate: string) => void
}) {
  const [targetDate, setTargetDate] = useState(addIsoDays(date, 1))

  return (
    <Dialog open={Boolean(appointment)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reagendar compromisso</DialogTitle>
          <DialogDescription>O compromisso original fica no histórico e uma nova data é criada.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label htmlFor="appointment-move">Nova data</Label>
          <Input id="appointment-move" type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
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
