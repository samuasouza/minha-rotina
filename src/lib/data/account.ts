import "server-only"

import { getAuthContext, type AuthContext } from "@/lib/auth/session"
import { formatClock } from "@/lib/domain/dates"
import type { AppointmentView, ProfileView, TaskView } from "@/lib/domain/types"
import { isSchemaMissing, logOperationFailure } from "@/lib/errors"

type Authenticated = Extract<AuthContext, { status: "authenticated" }>

function displayNameFromEmail(email: string | null) {
  const local = email?.split("@")[0]?.trim()
  return local ? local.slice(0, 80) : "Eu"
}

function mapProfile(
  row: { id: string; display_name: string; full_name: string | null; timezone: string },
  email: string | null,
): ProfileView {
  return {
    id: row.id,
    displayName: row.display_name,
    fullName: row.full_name,
    timezone: row.timezone,
    email,
  }
}

export async function loadProfile(auth: Authenticated) {
  const existing = await auth.supabase
    .from("profiles")
    .select("id, display_name, full_name, timezone")
    .eq("id", auth.userId)
    .maybeSingle()

  if (existing.error) {
    if (isSchemaMissing(existing.error)) {
      return { status: "schema_missing" as const }
    }
    logOperationFailure("profile_read_failed", existing.error)
    return { status: "error" as const }
  }

  if (existing.data) {
    return { status: "ready" as const, profile: mapProfile(existing.data, auth.email) }
  }

  const created = await auth.supabase
    .from("profiles")
    .insert({ id: auth.userId, display_name: displayNameFromEmail(auth.email) })
    .select("id, display_name, full_name, timezone")
    .single()

  if (created.error || !created.data) {
    if (created.error && isSchemaMissing(created.error)) {
      return { status: "schema_missing" as const }
    }
    if (created.error) {
      logOperationFailure("profile_create_failed", created.error)
    }
    return { status: "error" as const }
  }

  const preferences = await auth.supabase.from("user_preferences").insert({ user_id: auth.userId })
  if (preferences.error && preferences.error.code !== "23505") {
    logOperationFailure("preferences_create_failed", preferences.error)
  }

  return { status: "ready" as const, profile: mapProfile(created.data, auth.email) }
}

export function mapTask(row: {
  id: string
  routine_id: string | null
  title: string
  notes: string | null
  priority: TaskView["priority"]
  status: TaskView["status"]
  is_optional: boolean
  scheduled_on: string
  time_of_day: string | null
  skipped_reason: string | null
  rescheduled_to: string | null
  completion_policy: TaskView["completionPolicy"]
  linked_module: string
}): TaskView {
  return {
    id: row.id,
    routineId: row.routine_id,
    title: row.title,
    notes: row.notes,
    priority: row.priority,
    status: row.status,
    isOptional: row.is_optional,
    scheduledOn: row.scheduled_on,
    timeOfDay: formatClock(row.time_of_day),
    skippedReason: row.skipped_reason,
    rescheduledTo: row.rescheduled_to,
    completionPolicy: row.completion_policy,
    linkedModule: row.linked_module as TaskView["linkedModule"],
  }
}

export function mapAppointment(row: {
  id: string
  title: string
  notes: string | null
  location: string | null
  scheduled_on: string
  starts_at: string | null
  ends_at: string | null
  status: AppointmentView["status"]
  rescheduled_to: string | null
}): AppointmentView {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    location: row.location,
    scheduledOn: row.scheduled_on,
    startsAt: formatClock(row.starts_at),
    endsAt: formatClock(row.ends_at),
    status: row.status,
    rescheduledTo: row.rescheduled_to,
  }
}

export async function requireReadyAccount() {
  const auth = await getAuthContext()
  if (auth.status !== "authenticated") {
    return auth
  }

  const profile = await loadProfile(auth)
  if (profile.status !== "ready") {
    return profile
  }

  return { status: "ready" as const, auth, profile: profile.profile }
}
