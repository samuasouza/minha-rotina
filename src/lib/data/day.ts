import "server-only"

import { resolveRequestedDate } from "@/lib/domain/dates"
import type { AppointmentView, ProfileView, TaskView } from "@/lib/domain/types"
import { loadDayHealth, type DayHealth } from "@/lib/data/health"
import { isSchemaMissing, logOperationFailure } from "@/lib/errors"
import { mapAppointment, mapTask, requireReadyAccount } from "@/lib/data/account"

const taskColumns =
  "id, routine_id, title, notes, priority, status, is_optional, scheduled_on, time_of_day, skipped_reason, rescheduled_to, completion_policy, linked_module"

const appointmentColumns =
  "id, title, notes, location, scheduled_on, starts_at, ends_at, status, rescheduled_to"

export type DayData = {
  status: "ready"
  date: string
  today: string
  profile: ProfileView
  tasks: TaskView[]
  appointments: AppointmentView[]
  health: DayHealth | null
}

export type DayState =
  | { status: "unconfigured" }
  | { status: "unauthenticated" }
  | { status: "schema_missing" }
  | { status: "error" }
  | DayData

export async function loadDay(requestedDate?: string): Promise<DayState> {
  const account = await requireReadyAccount()
  if (account.status !== "ready") {
    return account
  }

  const date = resolveRequestedDate(requestedDate, account.profile.timezone)
  const today = resolveRequestedDate(undefined, account.profile.timezone)
  const ensured = await account.auth.supabase.rpc("ensure_routine_tasks", { target_date: date })

  if (ensured.error) {
    if (isSchemaMissing(ensured.error)) {
      return { status: "schema_missing" }
    }
    logOperationFailure("ensure_routines_failed", ensured.error)
    return { status: "error" }
  }

  const [tasks, appointments] = await Promise.all([
    account.auth.supabase
      .from("tasks")
      .select(taskColumns)
      .eq("scheduled_on", date)
      .order("time_of_day", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    account.auth.supabase
      .from("appointments")
      .select(appointmentColumns)
      .eq("scheduled_on", date)
      .order("starts_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
  ])

  if (tasks.error || appointments.error) {
    const error = tasks.error ?? appointments.error
    if (error && isSchemaMissing(error)) {
      return { status: "schema_missing" }
    }
    if (error) {
      logOperationFailure("day_read_failed", error)
    }
    return { status: "error" }
  }

  return {
    status: "ready",
    date,
    today,
    profile: account.profile,
    tasks: (tasks.data ?? []).map(mapTask),
    appointments: (appointments.data ?? []).map(mapAppointment),
    health: await loadDayHealth(account.auth.supabase, date),
  }
}
