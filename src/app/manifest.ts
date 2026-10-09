import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Minha Rotina",
    short_name: "Rotina",
    description: "Organização pessoal de rotina, cuidado, estudos e hábitos.",
    start_url: "/meu-dia",
    scope: "/",
    display: "standalone",
    lang: "pt-BR",
    background_color: "#F8F2EE",
    theme_color: "#7A5753",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  }
}
