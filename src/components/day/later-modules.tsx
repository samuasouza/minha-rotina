import Link from "next/link"
import { modules } from "@/lib/navigation"

const summary = modules.filter((item) => !item.available)

export function LaterModules() {
  if (summary.length === 0) return null

  return (
    <section className="mt-8" aria-labelledby="outros-registros">
      <div className="mb-3 flex items-end justify-between gap-4">
        <h2 id="outros-registros" className="text-2xl text-foreground">
          Outros cuidados
        </h2>
        <p className="text-xs text-muted-foreground">Ainda sem registro</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {summary.map((item) => {
          const Icon = item.icon
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex h-full gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition-colors hover:bg-muted"
              >
                <Icon className="mt-0.5 size-4 shrink-0 text-sage" aria-hidden="true" />
                <span>
                  <span className="block text-sm text-foreground">{item.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    {item.phase}. Nenhum dado é contado enquanto o módulo não existe.
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
