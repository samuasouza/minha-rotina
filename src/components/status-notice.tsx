import { configurationMessage, schemaMessage } from "@/lib/errors"

const copy = {
  unconfigured: {
    title: "Falta conectar o banco",
    body: configurationMessage,
  },
  schema_missing: {
    title: "Falta aplicar a estrutura inicial",
    body: schemaMessage,
  },
  error: {
    title: "Não consegui carregar agora",
    body: "Os dados não foram alterados. Tente abrir a página de novo em instantes.",
  },
} as const

export function StatusNotice({ status }: { status: keyof typeof copy }) {
  const content = copy[status]

  return (
    <section className="rounded-2xl border border-border bg-card px-5 py-4" role="status">
      <h2 className="text-lg text-foreground">{content.title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{content.body}</p>
    </section>
  )
}
