"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { updateProfile } from "@/lib/actions/organization"
import type { ProfileView } from "@/lib/domain/types"
import { profileFormSchema, timezones, type ProfileFormValues } from "@/lib/validation/schemas"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const timezoneLabels: Record<(typeof timezones)[number], string> = {
  "America/Sao_Paulo": "Brasília",
  "America/Manaus": "Manaus",
  "America/Rio_Branco": "Rio Branco",
  "America/Noronha": "Fernando de Noronha",
  "America/Fortaleza": "Fortaleza",
  "America/Belem": "Belém",
  "America/Cuiaba": "Cuiabá",
  UTC: "UTC",
}

export function ProfileForm({ profile }: { profile: ProfileView }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: profile.displayName,
      fullName: profile.fullName ?? "",
      timezone: profile.timezone as ProfileFormValues["timezone"],
    },
  })

  function onSubmit(values: ProfileFormValues) {
    startTransition(async () => {
      const result = await updateProfile(values)
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      router.refresh()
    })
  }

  return (
    <form className="grid max-w-lg gap-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-1.5">
        <Label htmlFor="display-name">Como podemos te chamar</Label>
        <Input id="display-name" {...form.register("displayName")} />
        {form.formState.errors.displayName ? (
          <p className="text-xs text-destructive" role="alert">{form.formState.errors.displayName.message}</p>
        ) : null}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="full-name">Nome completo</Label>
        <Input id="full-name" {...form.register("fullName")} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="timezone">Fuso horário</Label>
        <select
          id="timezone"
          className="h-10 rounded-lg border border-input bg-card px-3 text-sm"
          {...form.register("timezone")}
        >
          {timezones.map((zone) => (
            <option key={zone} value={zone}>
              {timezoneLabels[zone]}
            </option>
          ))}
        </select>
      </div>
      <p className="text-sm text-muted-foreground">E-mail da conta: {profile.email ?? "não informado"}</p>
      <Button type="submit" className="h-10 w-fit" disabled={pending}>
        {pending ? "Salvando..." : "Salvar perfil"}
      </Button>
    </form>
  )
}
