const publicPaths = [
  "/entrar",
  "/cadastro",
  "/recuperar",
  "/nova-senha",
  "/auth",
  "/manifest.webmanifest",
  "/sw.js",
  "/offline.html",
]

export function isPublicPath(pathname: string) {
  return publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

export function gateDestination(pathname: string, isAuthenticated: boolean) {
  if (!isAuthenticated && !isPublicPath(pathname)) {
    return "/entrar"
  }

  if (isAuthenticated && (pathname === "/" || pathname === "/entrar" || pathname === "/cadastro" || pathname === "/recuperar")) {
    return "/meu-dia"
  }

  return null
}
