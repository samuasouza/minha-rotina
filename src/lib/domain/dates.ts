export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

export function weekdayOfIsoDate(isoDate: string): number {
  const [year, month, day] = isoDate.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

export function addIsoDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function todayInTimeZone(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

export function hourInTimeZone(timeZone: string, now = new Date()): number {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hourCycle: "h23",
  }).format(now)
  return Number(hour)
}

export function formatLongDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day, 12))
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date)

  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

export function formatShortDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day, 12))
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(date)
}

export function formatWeekday(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day, 12))
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    timeZone: "UTC",
  }).format(date)
  return formatted.replace(".", "")
}

export function startOfWeek(isoDate: string): string {
  const weekday = weekdayOfIsoDate(isoDate)
  const delta = weekday === 0 ? -6 : 1 - weekday
  return addIsoDays(isoDate, delta)
}

export function resolveRequestedDate(requested: string | undefined, timeZone: string, now = new Date()): string {
  if (requested && isIsoDate(requested)) {
    return requested
  }
  return todayInTimeZone(timeZone, now)
}

export function formatClock(value: string | null): string | null {
  if (!value) {
    return null
  }
  return value.slice(0, 5)
}

export function startOfMonth(isoDate: string): string {
  return `${isoDate.slice(0, 7)}-01`
}

export function endOfMonth(isoDate: string): string {
  const [year, month] = isoDate.split("-").map(Number)
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return `${isoDate.slice(0, 7)}-${String(last).padStart(2, "0")}`
}

export function inclusiveDayCount(from: string, to: string): number {
  const [fromYear, fromMonth, fromDay] = from.split("-").map(Number)
  const [toYear, toMonth, toDay] = to.split("-").map(Number)
  const start = Date.UTC(fromYear, fromMonth - 1, fromDay)
  const end = Date.UTC(toYear, toMonth - 1, toDay)
  return Math.round((end - start) / 86400000) + 1
}

export function clockInTimeZone(timeZone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now)
  let hour = parts.find((part) => part.type === "hour")?.value ?? "00"
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00"
  if (hour === "24") hour = "00"
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`
}

export function zonedLocalToUtc(isoDate: string, time: string, timeZone: string): Date {
  const [hour, minute] = time.slice(0, 5).split(":").map(Number)
  let utc = new Date(`${isoDate}T${time.slice(0, 5)}:00Z`)

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const localDate = todayInTimeZone(timeZone, utc)
    const [localHour, localMinute] = clockInTimeZone(timeZone, utc).split(":").map(Number)
    const desired = Date.parse(`${isoDate}T00:00:00Z`) + (hour * 60 + minute) * 60 * 1000
    const actual = Date.parse(`${localDate}T00:00:00Z`) + (localHour * 60 + localMinute) * 60 * 1000
    const delta = desired - actual
    if (delta === 0) break
    utc = new Date(utc.getTime() + delta)
  }

  return utc
}
