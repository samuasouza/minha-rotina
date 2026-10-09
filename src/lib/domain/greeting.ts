export function greetingForHour(hour: number, name: string): string {
  const safeName = name.trim() || "você"
  if (hour < 12) {
    return `Bom dia, ${safeName}`
  }
  if (hour < 18) {
    return `Boa tarde, ${safeName}`
  }
  return `Boa noite, ${safeName}`
}
