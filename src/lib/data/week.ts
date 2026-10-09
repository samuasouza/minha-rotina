import "server-only"

import { addIsoDays, resolveRequestedDate, startOfWeek } from "@/lib/domain/dates"
import type { AppointmentView, ProfileView } from "@/lib/domain/types"
import { isSchemaMissing, logOperationFailure } from "@/lib/errors"
import { mapAppointment, requireReadyAccount } from "@/lib/data/account"

export type WeekData = {
  status: "ready"
  anchor: string
  today: string
  days: string[]
  profile: ProfileView
  appointments: AppointmentView[]
}

export type WeekState =
  | { status: "unconfigured" }
  | { status: "unauthenticated" }
  | { status: "schema_missing" }
  | { status: "error" }
  | WeekData

export async function loadWeek(requestedDate?: string): Promise<WeekState> {
  const account = await requireReadyAccount()
  if (account.status !== "ready") {
    return account
  }

  const anchor = resolveRequestedDate(requestedDate, account.profile.timezone)
  const today = resolveRequestedDate(undefined, account.profile.timezone)
  const start = startOfWeek(anchor)
  const days = Array.from({ length: 7 }, (_, index) => addIsoDays(start, index))
  const end = days[6]

  const appointments = await account.auth.supabase
    .from("appointments")
    .select("id, title, notes, location, scheduled_on, starts_at, ends_at, status, rescheduled_to")
    .gte("scheduled_on", start)
    .lte("scheduled_on", end)
    .order("scheduled_on", { ascending: true })
    .order("starts_at", { ascending: true, nullsFirst: false })

  if (appointments.error) {
    if (isSchemaMissing(appointments.error)) {
      return { status: "schema_missing" }
    }
    logOperationFailure("week_read_failed", appointments.error)
    return { status: "error" }
  }

  return {
    status: "ready",
    anchor,
    today,
    days,
    profile: account.profile,
    appointments: (appointments.data ?? []).map(mapAppointment),
  }
}
