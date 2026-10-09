"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Menu } from "lucide-react"
import { primaryModules, secondaryModules } from "@/lib/navigation"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

export function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden"
        aria-label="Módulos principais"
      >
        <ul className="grid grid-cols-5">
          {primaryModules.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-1 px-1 py-2 text-[11px]",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {item.shortLabel}
                </Link>
              </li>
            )
          })}
          <li>
            <button
              type="button"
              className="flex w-full flex-col items-center gap-1 px-1 py-2 text-[11px] text-muted-foreground"
              onClick={() => setOpen(true)}
            >
              <Menu className="size-4" aria-hidden="true" />
              Mais
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Mais módulos</SheetTitle>
          </SheetHeader>
          <ul className="grid gap-1 px-4 pb-6">
            {secondaryModules.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-2 py-3 text-sm hover:bg-muted"
                  >
                    <Icon className="size-4 text-sage" aria-hidden="true" />
                    <span>
                      <span className="block text-foreground">{item.label}</span>
                      <span className="block text-xs text-muted-foreground">{item.phase}</span>
                    </span>
                  </Link>
                </li>
              )
            })}
            <li>
              <Link
                href="/configuracoes"
                onClick={() => setOpen(false)}
                className="mt-2 flex h-10 items-center justify-center rounded-xl border border-border text-sm"
              >
                Configurações
              </Link>
            </li>
          </ul>
        </SheetContent>
      </Sheet>
    </>
  )
}
