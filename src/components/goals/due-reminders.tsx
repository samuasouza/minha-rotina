"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { snoozeReminder } from "@/lib/actions/goals"
import { reminderLabels, type ReminderKind } from "@/lib/domain/goals"
import { Button } from "@/components/ui/button"

export function DueReminders({ reminders }: { reminders: { id: string; title: string; kind: ReminderKind; remindAt: string }[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  if (reminders.length === 0) return null

  function snooze(id: string, mode: "later" | "tomorrow") {
    startTransition(async () => {
      const result = await snoozeReminder({ id, mode })
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      router.refresh()
    })
  }

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card px-5 py-4" aria-labelledby="lembretes-dia">
      <h2 id="lembretes-dia" className="text-xl">
        Lembretes
      </h2>
      <ul className="mt-3 grid gap-3">
        {reminders.map((reminder) => (
          <li key={reminder.id} className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm leading-6">
              <span className="text-foreground">{reminder.title}</span>
              <span className="text-muted-foreground"> · {reminderLabels[reminder.kind]} · {reminder.remindAt}</span>
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" disabled={pending} onClick={() => snooze(reminder.id, "later")}>
                Adiar 2 horas
              </Button>
              <Button type="button" variant="ghost" disabled={pending} onClick={() => snooze(reminder.id, "tomorrow")}>
                Até amanhã
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
