import "server-only"

import { resolveRequestedDate, startOfWeek } from "@/lib/domain/dates"
import { isSchemaMissing, logOperationFailure } from "@/lib/errors"
import { requireReadyAccount } from "@/lib/data/account"

type Gate = { status: "unconfigured" } | { status: "unauthenticated" } | { status: "schema_missing" } | { status: "error" }

async function gate(requestedDate?: string) {
  const account = await requireReadyAccount()
  if (account.status !== "ready") {
    return { account, date: "", today: "", week: "" }
  }
  const date = resolveRequestedDate(requestedDate, account.profile.timezone)
  const today = resolveRequestedDate(undefined, account.profile.timezone)
  return { account, date, today, week: startOfWeek(date) }
}

function failed(error: { code?: string; message?: string }) {
  if (isSchemaMissing(error)) return { status: "schema_missing" as const }
  logOperationFailure("module_read_failed", error)
  return { status: "error" as const }
}

export async function loadDevotional(requestedDate?: string) {
  const { account, date, today, week } = await gate(requestedDate)
  if (account.status !== "ready") return account

  const [entry, gratitude, prayers, plans, logs, goals] = await Promise.all([
    account.auth.supabase
      .from("devotional_entries")
      .select("id, passage_label, passage_url, reflection, completed_at")
      .eq("entry_date", date)
      .maybeSingle(),
    account.auth.supabase.from("gratitude_entries").select("id, body").eq("entry_date", date).order("created_at"),
    account.auth.supabase
      .from("prayer_requests")
      .select("id, title, details, asked_on, status, answer, answered_on")
      .order("asked_on", { ascending: false })
      .limit(30),
    account.auth.supabase.from("reading_plans").select("id, title, is_active").eq("is_active", true).order("starts_on"),
    account.auth.supabase
      .from("reading_logs")
      .select("id, read_on, passage_label, passage_url, kind")
      .order("read_on", { ascending: false })
      .limit(12),
    account.auth.supabase.from("devotional_week_goals").select("id, title, is_done").eq("week_starts_on", week),
  ])

  const error = [entry.error, gratitude.error, prayers.error, plans.error, logs.error, goals.error].find(Boolean)
  if (error) return failed(error)

  const planIds = (plans.data ?? []).map((plan) => plan.id)
  const items = planIds.length
    ? await account.auth.supabase
        .from("reading_plan_items")
        .select("id, plan_id, day_number, passage_label, passage_url")
        .in("plan_id", planIds)
        .order("day_number")
    : { data: [], error: null }
  if (items.error) return failed(items.error)

  return {
    status: "ready" as const,
    date,
    today,
    week,
    entry: entry.data,
    gratitude: gratitude.data ?? [],
    prayers: prayers.data ?? [],
    plans: (plans.data ?? []).map((plan) => ({
      ...plan,
      items: (items.data ?? []).filter((item) => item.plan_id === plan.id),
    })),
    logs: logs.data ?? [],
    goals: goals.data ?? [],
  }
}

export async function loadTraining() {
  const { account } = await gate()
  if (account.status !== "ready") return account

  const [sheets, exercises, sessions, sets, suggestions] = await Promise.all([
    account.auth.supabase.from("workout_sheets").select("id, name, is_active").eq("is_active", true).order("name"),
    account.auth.supabase.from("exercises").select("id, name").eq("is_active", true).order("name"),
    account.auth.supabase
      .from("workout_sessions")
      .select("id, performed_on, status, day_id, sheet_id, notes")
      .order("performed_on", { ascending: false })
      .limit(8),
    account.auth.supabase
      .from("workout_sets")
      .select("id, session_id, exercise_id, set_number, reps, load_kg, completed")
      .order("set_number"),
    account.auth.supabase
      .from("load_suggestions")
      .select("id, exercise_id, suggested_load_kg, status, note")
      .order("created_at", { ascending: false })
      .limit(12),
  ])
  const error = [sheets.error, exercises.error, sessions.error, sets.error, suggestions.error].find(Boolean)
  if (error) return failed(error)

  const sheetIds = (sheets.data ?? []).map((sheet) => sheet.id)
  const days = sheetIds.length
    ? await account.auth.supabase
        .from("workout_days")
        .select("id, sheet_id, name, position")
        .in("sheet_id", sheetIds)
        .order("position")
    : { data: [], error: null }
  if (days.error) return failed(days.error)
  const dayIds = (days.data ?? []).map((day) => day.id)
  const prescriptions = dayIds.length
    ? await account.auth.supabase
        .from("workout_exercises")
        .select("id, day_id, exercise_id, position, target_sets, target_reps")
        .in("day_id", dayIds)
        .order("position")
    : { data: [], error: null }
  if (prescriptions.error) return failed(prescriptions.error)

  const names = new Map((exercises.data ?? []).map((exercise) => [exercise.id, exercise.name]))
  return {
    status: "ready" as const,
    exercises: exercises.data ?? [],
    suggestions: (suggestions.data ?? []).map((item) => ({
      ...item,
      exerciseName: names.get(item.exercise_id) ?? "Exercício",
      suggested_load_kg: Number(item.suggested_load_kg),
    })),
    sheets: (sheets.data ?? []).map((sheet) => ({
      ...sheet,
      days: (days.data ?? [])
        .filter((day) => day.sheet_id === sheet.id)
        .map((day) => ({
          ...day,
          exercises: (prescriptions.data ?? [])
            .filter((item) => item.day_id === day.id)
            .map((item) => ({ ...item, name: names.get(item.exercise_id) ?? "Exercício" })),
        })),
    })),
    sessions: (sessions.data ?? []).map((session) => ({
      ...session,
      sets: (sets.data ?? [])
        .filter((set) => set.session_id === session.id)
        .map((set) => ({
          ...set,
          name: names.get(set.exercise_id) ?? "Exercício",
          load_kg: Number(set.load_kg),
        })),
    })),
  }
}

export async function loadStudies(requestedDate?: string) {
  const { account, date, week } = await gate(requestedDate)
  if (account.status !== "ready") return account

  const [subjects, goals, sessions, notes] = await Promise.all([
    account.auth.supabase.from("study_subjects").select("id, name, kind, is_active").eq("is_active", true).order("name"),
    account.auth.supabase
      .from("study_week_goals")
      .select("id, title, target_minutes, is_done, subject_id")
      .eq("week_starts_on", week),
    account.auth.supabase
      .from("study_sessions")
      .select("id, subject_id, started_at, ended_at, duration_seconds, status, notes")
      .order("started_at", { ascending: false })
      .limit(12),
    account.auth.supabase.from("study_notes").select("id, subject_id, body, created_at").order("created_at", { ascending: false }).limit(12),
  ])
  const error = [subjects.error, goals.error, sessions.error, notes.error].find(Boolean)
  if (error) return failed(error)

  const subjectIds = (subjects.data ?? []).map((subject) => subject.id)
  const topics = subjectIds.length
    ? await account.auth.supabase
        .from("study_topics")
        .select("id, subject_id, title, position, is_done")
        .in("subject_id", subjectIds)
        .order("position")
    : { data: [], error: null }
  if (topics.error) return failed(topics.error)

  const completedMinutes = (sessions.data ?? [])
    .filter((session) => session.status === "completed")
    .reduce((total, session) => total + Math.round((session.duration_seconds ?? 0) / 60), 0)

  return {
    status: "ready" as const,
    date,
    week,
    completedMinutes,
    subjects: (subjects.data ?? []).map((subject) => ({
      ...subject,
      topics: (topics.data ?? []).filter((topic) => topic.subject_id === subject.id),
    })),
    goals: goals.data ?? [],
    sessions: sessions.data ?? [],
    notes: notes.data ?? [],
  }
}

export type DevotionalState = Awaited<ReturnType<typeof loadDevotional>>
export type TrainingState = Awaited<ReturnType<typeof loadTraining>>
export type StudyState = Awaited<ReturnType<typeof loadStudies>>
export type { Gate }
