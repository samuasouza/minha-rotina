export type TaskStatus = "pending" | "completed" | "skipped" | "rescheduled"
export type CompletionPolicy = "checklist" | "module_record"

export type ProgressInput = {
  status: TaskStatus
  isOptional: boolean
}

export type DayProgress = {
  requiredTotal: number
  requiredCompleted: number
  optionalTotal: number
  optionalCompleted: number
  skipped: number
  rescheduled: number
  percent: number | null
}

export function calculateDayProgress(tasks: ProgressInput[]): DayProgress {
  const required = tasks.filter(
    (task) => !task.isOptional && (task.status === "pending" || task.status === "completed"),
  )
  const requiredCompleted = required.filter((task) => task.status === "completed").length
  const optional = tasks.filter((task) => task.isOptional && task.status !== "rescheduled")
  const optionalCompleted = optional.filter((task) => task.status === "completed").length

  return {
    requiredTotal: required.length,
    requiredCompleted,
    optionalTotal: optional.length,
    optionalCompleted,
    skipped: tasks.filter((task) => task.status === "skipped").length,
    rescheduled: tasks.filter((task) => task.status === "rescheduled").length,
    percent: required.length === 0 ? null : Math.round((requiredCompleted / required.length) * 100),
  }
}

export function canCompleteFromChecklist(policy: CompletionPolicy): boolean {
  return policy === "checklist"
}

export function validateReschedule(from: string, to: string): string | null {
  if (from === to) {
    return "Escolha um dia diferente."
  }
  return null
}
