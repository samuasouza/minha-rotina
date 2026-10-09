import type { LucideIcon } from "lucide-react"
import {
  BookOpen,
  CalendarDays,
  CircleUser,
  Dumbbell,
  FileUp,
  GraduationCap,
  HeartPulse,
  Moon,
  PersonStanding,
  Settings,
  SunMedium,
  Target,
  Utensils,
} from "lucide-react"

export type AppModule = {
  href: string
  label: string
  shortLabel: string
  description: string
  phase: string
  available: boolean
  primary: boolean
  icon: LucideIcon
}

export const modules: AppModule[] = [
  {
    href: "/meu-dia",
    label: "Meu Dia",
    shortLabel: "Hoje",
    description: "Checklist, agenda e o ritmo deste dia.",
    phase: "Fase 1",
    available: true,
    primary: true,
    icon: SunMedium,
  },
  {
    href: "/devocional",
    label: "Devocional",
    shortLabel: "Devocional",
    description: "Leituras, orações, gratidão e planos de leitura.",
    phase: "Fase 2",
    available: true,
    primary: true,
    icon: BookOpen,
  },
  {
    href: "/treinos",
    label: "Treinos",
    shortLabel: "Treinos",
    description: "Fichas, séries, cargas e evolução da musculação.",
    phase: "Fase 2",
    available: true,
    primary: true,
    icon: Dumbbell,
  },
  {
    href: "/estudos",
    label: "Estudos",
    shortLabel: "Estudos",
    description: "Matérias, sessões, metas e tempo de estudo.",
    phase: "Fase 2",
    available: true,
    primary: true,
    icon: GraduationCap,
  },
  {
    href: "/alimentacao",
    label: "Alimentação",
    shortLabel: "Alimentação",
    description: "Refeições, metas nutricionais e hidratação.",
    phase: "Fase 3",
    available: true,
    primary: false,
    icon: Utensils,
  },
  {
    href: "/cardio",
    label: "Cardio",
    shortLabel: "Cardio",
    description: "Esteira, duração, inclinação e gasto estimado.",
    phase: "Fase 3",
    available: true,
    primary: false,
    icon: HeartPulse,
  },
  {
    href: "/meu-corpo",
    label: "Meu Corpo",
    shortLabel: "Corpo",
    description: "Peso, medidas e fotos de evolução, sempre privados.",
    phase: "Fase 3",
    available: true,
    primary: false,
    icon: PersonStanding,
  },
  {
    href: "/bem-estar",
    label: "Bem-estar",
    shortLabel: "Bem-estar",
    description: "Sono, humor e anotações pessoais, todos opcionais.",
    phase: "Fase 3",
    available: true,
    primary: false,
    icon: Moon,
  },
  {
    href: "/agenda",
    label: "Agenda",
    shortLabel: "Agenda",
    description: "Compromissos da semana, com horário opcional.",
    phase: "Fase 1",
    available: true,
    primary: false,
    icon: CalendarDays,
  },
  {
    href: "/metas",
    label: "Minhas Metas",
    shortLabel: "Metas",
    description: "Metas pessoais, relatórios e lembretes a partir dos seus registros.",
    phase: "Fase 4",
    available: true,
    primary: false,
    icon: Target,
  },
  {
    href: "/perfil",
    label: "Meu Perfil",
    shortLabel: "Perfil",
    description: "Anamnese, objetivos, rotina e preferências.",
    phase: "Fase 3.5",
    available: true,
    primary: false,
    icon: CircleUser,
  },
  {
    href: "/importar",
    label: "Importar",
    shortLabel: "Importar",
    description: "Prévia de dietas, fichas, estudos e compromissos antes de salvar.",
    phase: "Fase 5",
    available: true,
    primary: false,
    icon: FileUp,
  },
  {
    href: "/configuracoes",
    label: "Configurações",
    shortLabel: "Ajustes",
    description: "Fuso, e-mail, exportação e saída da conta.",
    phase: "Fase 1",
    available: true,
    primary: false,
    icon: Settings,
  },
]

export const primaryModules = modules.filter((item) => item.primary)
export const secondaryModules = modules.filter((item) => !item.primary && item.href !== "/configuracoes")

export function getModule(href: string) {
  return modules.find((item) => item.href === href)
}
