import Link from "next/link"
import { getModule } from "@/lib/navigation"

export function ModulePlaceholder({ href }: { href: string }) {
  const item = getModule(href)
  if (!item) {
    return null
  }

  const Icon = item.icon

  return (
    <section className="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <p className="mt-6 text-xs tracking-[0.16em] text-sage uppercase">{item.phase}</p>
      <h1 className="mt-2 text-4xl text-foreground">{item.label}</h1>
      <p className="mt-4 text-base leading-7 text-muted-foreground">{item.description}</p>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        Este módulo ainda não registra dados. Quando estiver disponível, cada registro será seu e
        poderá se refletir no checklist do dia.
      </p>
      <Link
        href="/meu-dia"
        className="mt-8 inline-flex h-10 w-fit items-center rounded-xl bg-primary px-4 text-sm text-primary-foreground"
      >
        Voltar para Meu Dia
      </Link>
    </section>
  )
}
