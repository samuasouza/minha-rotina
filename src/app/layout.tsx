import type { Metadata, Viewport } from "next"
import { Fraunces, Outfit } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
})

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
})

export const metadata: Metadata = {
  title: {
    default: "Minha Rotina",
    template: "%s · Minha Rotina",
  },
  description: "Organização pessoal de rotina, cuidado, estudos e hábitos.",
  applicationName: "Minha Rotina",
  appleWebApp: {
    capable: true,
    title: "Minha Rotina",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#F8F2EE",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${outfit.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full overflow-x-clip bg-background text-foreground">
        {children}
        <Toaster position="top-center" theme="light" />
      </body>
    </html>
  )
}
