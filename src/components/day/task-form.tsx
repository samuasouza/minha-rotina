"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { createTask } from "@/lib/actions/organization"
import { weekdayOfIsoDate } from "@/lib/domain/dates"
import { taskFormSchema, type TaskFormValues } from "@/lib/validation/schemas"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { cn } from "@/lib/utils"

const weekdays = [
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
]

export function TaskForm({ date, disabled = false }: { date: string; disabled?: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      notes: "",
      timeOfDay: "",
      isOptional: false,
      repeat: false,
      daysOfWeek: [],
      scheduledOn: date,
    },
  })
  const isOptional = useWatch({ control: form.control, name: "isOptional" })
  const repeat = useWatch({ control: form.control, name: "repeat" })
  const days = useWatch({ control: form.control, name: "daysOfWeek" }) ?? []

  function onSubmit(values: TaskFormValues) {
    startTransition(async () => {
      const result = await createTask({ ...values, scheduledOn: date })
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      setOpen(false)
      form.reset({
        title: "",
        notes: "",
        timeOfDay: "",
        isOptional: false,
        repeat: false,
        daysOfWeek: [],
        scheduledOn: date,
      })
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        disabled={disabled}
        render={<Button variant="outline" className="h-10" disabled={disabled} />}
      >
        Nova atividade
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova atividade</DialogTitle>
          <DialogDescription>O horário é opcional. Atividades opcionais não reduzem o progresso do dia.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-1.5">
            <Label htmlFor="task-title">Atividade</Label>
            <Input id="task-title" {...form.register("title")} />
            {form.formState.errors.title ? (
              <p className="text-xs text-destructive" role="alert">{form.formState.errors.title.message}</p>
            ) : null}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="task-time">Horário</Label>
            <Input id="task-time" type="time" {...form.register("timeOfDay")} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="task-notes">Observação</Label>
            <Textarea id="task-notes" rows={3} {...form.register("notes")} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={isOptional}
              onCheckedChange={(checked) => form.setValue("isOptional", checked === true)}
            />
            Esta atividade é opcional
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={repeat}
              onCheckedChange={(checked) => {
                const enabled = checked === true
                form.setValue("repeat", enabled)
                if (enabled && days.length === 0) {
                  form.setValue("daysOfWeek", [weekdayOfIsoDate(date)])
                }
              }}
            />
            Repetir em dias da semana
          </label>
          {repeat ? (
            <div className="flex flex-wrap gap-2">
              {weekdays.map((day) => {
                const selected = days.includes(day.value)
                return (
                  <button
                    key={day.value}
                    type="button"
                    aria-pressed={selected}
                    className={cn(
                      "min-h-10 min-w-10 rounded-full px-3 text-sm",
                      selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                    onClick={() => {
                      form.setValue(
                        "daysOfWeek",
                        selected ? days.filter((value) => value !== day.value) : [...days, day.value],
                        { shouldValidate: true },
                      )
                    }}
                  >
                    {day.label}
                  </button>
                )
              })}
              {form.formState.errors.daysOfWeek ? (
                <p className="w-full text-xs text-destructive" role="alert">
                  {form.formState.errors.daysOfWeek.message}
                </p>
              ) : null}
            </div>
          ) : null}
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
