export function ModuleContext({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null
  return (
    <aside className="rounded-2xl border border-border bg-card px-5 py-4" aria-label="Contexto da anamnese">
      <h2 className="text-lg">A partir do seu perfil</h2>
      <ul className="mt-2 grid gap-1 text-sm leading-6 text-muted-foreground">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </aside>
  )
}
