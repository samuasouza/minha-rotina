import Link from "next/link"

export default function Home() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <Link href="/meu-dia" className="font-heading text-3xl">
        Minha Rotina
      </Link>
    </main>
  )
}
