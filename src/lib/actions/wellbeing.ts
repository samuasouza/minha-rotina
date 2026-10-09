"use server"

import { blankToNull } from "@/lib/validation/schemas"
import { amountOrNull, wellbeingSchema } from "@/lib/validation/health"
import { failure, invalid, readyAccount, refreshRecords } from "@/lib/actions/ready"

export async function saveWellbeing(input: unknown) {
  const parsed = wellbeingSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ready = await readyAccount()
  if (!ready.ok) return ready
  const value = parsed.data
  const savedEntry = await ready.auth.supabase.from("wellbeing_entries").upsert(
    {
      user_id: ready.auth.userId,
      entry_date: value.entryDate,
      sleep_hours: amountOrNull(value.sleepHours),
      sleep_quality: amountOrNull(value.sleepQuality),
      energy: amountOrNull(value.energy),
      mood: amountOrNull(value.mood),
      menstruation: value.menstruation === "yes" ? true : value.menstruation === "no" ? false : null,
      notes: blankToNull(value.notes),
    },
    { onConflict: "user_id,entry_date" },
  )
  if (savedEntry.error) return failure(savedEntry.error)
  refreshRecords()
  return { ok: true as const, message: "Registro guardado. Os campos em branco continuam sem significado." }
}
