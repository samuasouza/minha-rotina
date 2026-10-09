import { isIsoDate, weekdayOfIsoDate } from "@/lib/domain/dates"

export type RoutineWindow = {
  daysOfWeek: number[]
  startsOn: string
  endsOn: string | null
  isActive: boolean
}

export function occursOnDate(routine: RoutineWindow, isoDate: string): boolean {
  if (!routine.isActive || !isIsoDate(isoDate) || !isIsoDate(routine.startsOn)) {
    return false
  }

  if (isoDate < routine.startsOn) {
    return false
  }

  if (routine.endsOn && isoDate > routine.endsOn) {
    return false
  }

  return routine.daysOfWeek.includes(weekdayOfIsoDate(isoDate))
}
