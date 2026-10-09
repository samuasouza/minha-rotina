import Link from "next/link"

export function OnboardingBanner() {
  return (
    <p className="mb-6 rounded-2xl border border-border bg-card px-5 py-4 text-sm leading-6">
      A anamnese está pela metade.{" "}
      <Link href="/perfil" className="underline-offset-4 hover:underline">
        Continuar quando quiser
      </Link>
      .
    </p>
  )
}
