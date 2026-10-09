import { NewPasswordForm } from "@/components/auth/auth-form"

export const metadata = { title: "Definir senha" }

export default function NewPasswordPage() {
  return (
    <div>
      <h1 className="text-3xl">Definir senha</h1>
      <p className="mt-2 mb-6 text-sm leading-6 text-muted-foreground">
        Escolha uma senha de 8 a 72 caracteres para esta conta.
      </p>
      <NewPasswordForm />
    </div>
  )
}
