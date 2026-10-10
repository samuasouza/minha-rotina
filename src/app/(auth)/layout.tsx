export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="font-heading text-4xl text-foreground">Minha Rotina</p>
          <p className="mt-2 text-sm text-muted-foreground">Um lugar só para o seu dia</p>
        </div>
        <div className="rounded-3xl border border-border bg-card px-6 py-6">{children}</div>
      </div>
    </div>
  )
}
