"use client"

import { useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { requestPasswordReset, signIn, signUp, updatePassword } from "@/lib/actions/organization"
import { signInSchema, signUpSchema } from "@/lib/validation/schemas"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Mode = "entrar" | "cadastro"

export function AuthForm({ mode }: { mode: Mode }) {
  if (mode === "cadastro") {
    return <SignUpForm />
  }
  return <SignInForm />
}

export function PasswordResetForm() {
  const [pending, startTransition] = useTransition()
  const [notice, setNotice] = useState<string | null>(null)
  const form = useForm({
    resolver: zodResolver(signInSchema.pick({ email: true })),
    defaultValues: { email: "" },
  })

  return (
    <CredentialForm
      pending={pending}
      notice={notice}
      submitLabel="Enviar link"
      onSubmit={form.handleSubmit((values) => {
        setNotice(null)
        startTransition(async () => {
          const result = await requestPasswordReset(values)
          if (!result.ok) {
            toast.error(result.message)
            return
          }
          setNotice(result.message)
        })
      })}
    >
      <Field label="E-mail" id="reset-email" error={form.formState.errors.email?.message}>
        <Input id="reset-email" type="email" autoComplete="email" {...form.register("email")} />
      </Field>
    </CredentialForm>
  )
}

export function NewPasswordForm() {
  const [pending, startTransition] = useTransition()
  const form = useForm({
    resolver: zodResolver(signInSchema.pick({ password: true })),
    defaultValues: { password: "" },
  })

  return (
    <CredentialForm
      pending={pending}
      submitLabel="Salvar senha"
      onSubmit={form.handleSubmit((values) => {
        startTransition(async () => {
          const result = await updatePassword(values)
          if (!result.ok) toast.error(result.message)
        })
      })}
    >
      <Field label="Nova senha" id="new-password" error={form.formState.errors.password?.message}>
        <Input id="new-password" type="password" autoComplete="new-password" {...form.register("password")} />
      </Field>
    </CredentialForm>
  )
}

function SignInForm() {
  const [pending, startTransition] = useTransition()
  const form = useForm({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  })

  return (
    <CredentialForm
      pending={pending}
      submitLabel="Entrar"
      onSubmit={form.handleSubmit((values) => {
        startTransition(async () => {
          const result = await signIn(values)
          if (!result.ok) {
            toast.error(result.message)
          }
        })
      })}
    >
      <Field label="E-mail" id="email" error={form.formState.errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
      </Field>
      <Field label="Senha" id="password" error={form.formState.errors.password?.message}>
        <Input id="password" type="password" autoComplete="current-password" {...form.register("password")} />
      </Field>
    </CredentialForm>
  )
}

function SignUpForm() {
  const [pending, startTransition] = useTransition()
  const [notice, setNotice] = useState<string | null>(null)
  const form = useForm({
    resolver: zodResolver(signUpSchema),
    defaultValues: { displayName: "", email: "", password: "", confirmPassword: "" },
  })

  return (
    <CredentialForm
      pending={pending}
      notice={notice}
      submitLabel="Criar minha conta"
      onSubmit={form.handleSubmit((values) => {
        setNotice(null)
        startTransition(async () => {
          const result = await signUp(values)
          if (!result.ok) {
            toast.error(result.message)
            return
          }
          if (result.message) {
            setNotice(result.message)
          }
        })
      })}
    >
      <Field label="Nome" id="display-name" error={form.formState.errors.displayName?.message}>
        <Input id="display-name" autoComplete="name" {...form.register("displayName")} />
      </Field>
      <Field label="E-mail" id="signup-email" error={form.formState.errors.email?.message}>
        <Input id="signup-email" type="email" autoComplete="email" {...form.register("email")} />
      </Field>
      <Field label="Senha" id="signup-password" error={form.formState.errors.password?.message}>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          {...form.register("password")}
        />
      </Field>
      <Field
        label="Confirmar senha"
        id="signup-confirm"
        error={form.formState.errors.confirmPassword?.message}
      >
        <Input
          id="signup-confirm"
          type="password"
          autoComplete="new-password"
          {...form.register("confirmPassword")}
        />
      </Field>
    </CredentialForm>
  )
}

function CredentialForm({
  children,
  pending,
  notice,
  submitLabel,
  onSubmit,
}: {
  children: React.ReactNode
  pending: boolean
  notice?: string | null
  submitLabel: string
  onSubmit: React.FormEventHandler<HTMLFormElement>
}) {
  return (
    <form className="grid gap-4" onSubmit={onSubmit} noValidate>
      {children}
      {notice ? (
        <p className="rounded-xl bg-accent px-3 py-2 text-sm text-accent-foreground" role="status">
          {notice}
        </p>
      ) : null}
      <Button type="submit" className="h-10" disabled={pending}>
        {pending ? "Aguarde..." : submitLabel}
      </Button>
    </form>
  )
}

function Field({
  label,
  id,
  error,
  children,
}: {
  label: string
  id: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
