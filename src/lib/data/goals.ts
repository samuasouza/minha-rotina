import "server-only"

import { emptyFacts, type ActivityFacts } from "@/lib/domain/activity"
import { addIsoDays, todayInTimeZone } from "@/lib/domain/dates"
import {
  goalProgress,
  periodWindow,
  reminderIsDue,
  reportBounds,
  type GoalCategory,
  type GoalDefinition,
  type GoalMeasure,
  type GoalPeriod,
  type GoalStatus,
  type ReminderKind,
} from "@/lib/domain/goals"
import { weekPulse, type PulseLine } from "@/lib/domain/reports"
import { loadActivityFacts } from "@/lib/data/facts"
import { requireReadyAccount } from "@/lib/data/account"
import { isSchemaMissing, logOperationFailure } from "@/lib/errors"

export type GoalCard = GoalDefinition & {
  title: string
  category: GoalCategory
  unit: string
  amount: number | null
  ratio: number | null
  samples: number
  revisions: { recordedAt: string; title: string; target: number; unit: string; status: GoalStatus }[]
}

export type ReminderCard = {
  id: string
  title: string
  kind: ReminderKind
  goalId: string | null
  enabled: boolean
  remindAt: string
  weekdays: number[]
  due: boolean
}

export type GoalCenter = {
  status: "ready"
  today: string
  section: "metas" | "relatorios" | "lembretes"
  preset: "7" | "30" | "90" | "custom"
  goals: GoalCard[]
  reminders: ReminderCard[]
  facts: ActivityFacts
  bounds: { from: string; to: string; previousFrom: string; previousTo: string } | null
}

type CenterState = { status: "unconfigured" } | { status: "unauthenticated" } | { status: "schema_missing" } | { status: "error" } | GoalCenter

const statusRank: Record<GoalStatus, number> = { active: 0, paused: 1, completed: 2, archived: 3 }

export async function loadGoalCenter(input: {
  section?: string
  preset?: string
  from?: string
  to?: string
}): Promise<CenterState> {
  const account = await requireReadyAccount()
  if (account.status !== "ready") return account.status === "schema_missing" || account.status === "error" ? account : account

  const today = todayInTimeZone(account.profile.timezone)
  const section = input.section === "relatorios" || input.section === "lembretes" ? input.section : "metas"
  const preset = input.preset === "30" || input.preset === "90" || input.preset === "custom" ? input.preset : "7"
  const bounds = section === "relatorios" ? reportBounds(preset, today, input.from, input.to) : null

  const goalsQuery = await account.auth.supabase.from("personal_goals").select("id, title, category, measure, target_value, unit, period, custom_days, starts_on, ends_on, status").order("created_at")
  const revisionsQuery = await account.auth.supabase.from("personal_goal_revisions").select("goal_id, title, target_value, unit, status, recorded_at").order("recorded_at", { ascending: false }).limit(1000)
  const remindersQuery = await account.auth.supabase.from("reminders").select("id, title, kind, goal_id, enabled, remind_at, weekdays, snoozed_until").order("remind_at")
  const failure = goalsQuery.error ?? revisionsQuery.error ?? remindersQuery.error
  if (failure) {
    if (isSchemaMissing(failure)) return { status: "schema_missing" }
    logOperationFailure("goals_center_failed", failure)
    return { status: "error" }
  }

  const definitions = (goalsQuery.data ?? []).map(toDefinition)
  const from = section === "relatorios" && bounds ? bounds.previousFrom : coverageStart(definitions, today)
  const to = section === "relatorios" && bounds ? bounds.to : today
  const factsResult = section === "lembretes" ? { status: "ready" as const, facts: emptyFacts() } : await loadActivityFacts(account.auth.supabase, from, to, account.profile.timezone)
  if (factsResult.status !== "ready") return factsResult

  const revisions = new Map<string, GoalCard["revisions"]>()
  for (const revision of revisionsQuery.data ?? []) {
    const list = revisions.get(revision.goal_id) ?? []
    list.push({
      recordedAt: revision.recorded_at,
      title: revision.title,
      target: Number(revision.target_value),
      unit: revision.unit,
      status: revision.status,
    })
    revisions.set(revision.goal_id, list)
  }

  const now = new Date()
  const goals = (goalsQuery.data ?? [])
    .map((row) => {
      const definition = toDefinition(row)
      const progress = goalProgress(definition, factsResult.facts, today)
      return {
        ...definition,
        title: row.title,
        category: row.category,
        unit: row.unit,
        amount: progress.amount,
        ratio: progress.ratio,
        samples: progress.samples,
        revisions: revisions.get(row.id) ?? [],
      }
    })
    .sort((left, right) => statusRank[left.status] - statusRank[right.status] || left.title.localeCompare(right.title, "pt-BR"))

  return {
    status: "ready",
    today,
    section,
    preset,
    goals,
    reminders: (remindersQuery.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      kind: row.kind,
      goalId: row.goal_id,
      enabled: row.enabled,
      remindAt: row.remind_at.slice(0, 5),
      weekdays: row.weekdays,
      due: reminderIsDue({
        enabled: row.enabled,
        weekdays: row.weekdays,
        remindAt: row.remind_at,
        snoozedUntil: row.snoozed_until,
        now,
        timeZone: account.profile.timezone,
      }),
    })),
    facts: factsResult.facts,
    bounds,
  }
}

export async function loadDaySignals(anchor: string, today: string, timeZone: string): Promise<{ lines: PulseLine[]; reminders: ReminderCard[] }> {
  const account = await requireReadyAccount()
  if (account.status !== "ready") return { lines: [], reminders: [] }

  const goalsQuery = await account.auth.supabase.from("personal_goals").select("id, title, category, measure, target_value, unit, period, custom_days, starts_on, ends_on, status")
  if (goalsQuery.error) {
    if (!isSchemaMissing(goalsQuery.error)) logOperationFailure("week_pulse_failed", goalsQuery.error)
    return { lines: [], reminders: [] }
  }

  const definitions = (goalsQuery.data ?? []).map(toDefinition)
  const titles = new Map((goalsQuery.data ?? []).map((goal) => [goal.id, goal.title]))
  const factsResult = await loadActivityFacts(account.auth.supabase, coverageStart(definitions, anchor), anchor, timeZone)
  if (factsResult.status !== "ready") return { lines: [], reminders: [] }

  let reminders: ReminderCard[] = []
  if (anchor === today) {
    const reminderQuery = await account.auth.supabase.from("reminders").select("id, title, kind, goal_id, enabled, remind_at, weekdays, snoozed_until").eq("enabled", true)
    if (reminderQuery.error) {
      if (!isSchemaMissing(reminderQuery.error)) logOperationFailure("reminders_due_failed", reminderQuery.error)
    } else {
      const now = new Date()
      reminders = (reminderQuery.data ?? [])
        .filter((row) => reminderIsDue({
          enabled: row.enabled,
          weekdays: row.weekdays,
          remindAt: row.remind_at,
          snoozedUntil: row.snoozed_until,
          now,
          timeZone,
        }))
        .map((row) => ({
          id: row.id,
          title: row.title,
          kind: row.kind,
          goalId: row.goal_id,
          enabled: row.enabled,
          remindAt: row.remind_at.slice(0, 5),
          weekdays: row.weekdays,
          due: true,
        }))
    }
  }

  return { lines: weekPulse(factsResult.facts, definitions, titles, anchor), reminders }
}

function coverageStart(goals: GoalDefinition[], anchor: string) {
  let from = anchor
  for (const goal of goals) {
    const window = periodWindow({
      period: goal.period,
      anchor,
      startsOn: goal.startsOn,
      endsOn: goal.endsOn,
      customDays: goal.customDays,
    })
    if (window && window.from < from) from = window.from
    if (goal.measure === "body_weight" && goal.startsOn < from) from = goal.startsOn
  }
  return addIsoDays(from, 0)
}

function toDefinition(row: {
  id: string
  measure: GoalMeasure
  target_value: number
  period: GoalPeriod
  custom_days: number | null
  starts_on: string
  ends_on: string | null
  status: GoalStatus
}): GoalDefinition {
  return {
    id: row.id,
    measure: row.measure,
    target: Number(row.target_value),
    period: row.period,
    customDays: row.custom_days === null ? null : Number(row.custom_days),
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    status: row.status,
  }
}
