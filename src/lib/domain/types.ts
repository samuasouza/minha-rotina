export type TaskStatus = "pending" | "completed" | "skipped" | "rescheduled"
export type TaskPriority = "low" | "normal" | "high"
export type CompletionPolicy = "checklist" | "module_record"
export type LinkedModule =
  | "none"
  | "devotional"
  | "workout"
  | "study"
  | "nutrition"
  | "cardio"
  | "body"
  | "wellbeing"
  | "agenda"
export type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "rescheduled"

export type TaskView = {
  id: string
  routineId: string | null
  title: string
  notes: string | null
  priority: TaskPriority
  status: TaskStatus
  isOptional: boolean
  scheduledOn: string
  timeOfDay: string | null
  skippedReason: string | null
  rescheduledTo: string | null
  completionPolicy: CompletionPolicy
  linkedModule: LinkedModule
}

export type AppointmentView = {
  id: string
  title: string
  notes: string | null
  location: string | null
  scheduledOn: string
  startsAt: string | null
  endsAt: string | null
  status: AppointmentStatus
  rescheduledTo: string | null
}

export type ProfileView = {
  id: string
  displayName: string
  fullName: string | null
  timezone: string
  email: string | null
}

export type ActionResult = {
  ok: boolean
  message: string
}
