import { formatShortDate } from "@/lib/domain/dates"

export function TrendChart({ points, label }: { points: { date: string; value: number }[]; label: string }) {
  if (points.length < 2) return null
  const values = points.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const width = 320
  const height = 120
  const coordinates = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width
      const y = height - ((point.value - min) / span) * (height - 16) - 8
      return `${x},${y}`
    })
    .join(" ")

  return (
    <div className="mt-4">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="w-full text-primary">
        <polyline fill="none" stroke="currentColor" strokeWidth="2" points={coordinates} />
      </svg>
      <p className="mt-1 text-xs text-muted-foreground">
        {formatShortDate(points[0].date)} a {formatShortDate(points[points.length - 1].date)}
      </p>
    </div>
  )
}
