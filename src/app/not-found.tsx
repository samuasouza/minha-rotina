import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="text-sm text-muted-foreground">Página não encontrada</p>
      <h1 className="mt-2 text-4xl">Esse caminho não existe</h1>
      <Link href="/" className="mt-6 text-sm underline-offset-4 hover:underline">
        Voltar ao início
      </Link>
    </div>
  )
}
