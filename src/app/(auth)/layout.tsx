import Link from "next/link"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/meu-dia" className="mb-8 block text-center">
          <span className="font-heading text-4xl text-foreground">Minha Rotina</span>
          <span className="mt-2 block text-sm text-muted-foreground">Um lugar só para o seu dia</span>
        </Link>
        <div className="rounded-3xl border border-border bg-card px-6 py-6">{children}</div>
      </div>
    </div>
  )
}
