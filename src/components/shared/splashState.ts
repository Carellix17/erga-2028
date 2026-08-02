// 🎬 P14 — Il cronometro del sipario d'apertura.
// Vive qui nel modulo: sopravvive ai remount (Landing → ProtectedRoute → Index
// sono tre montaggi diversi), muore al refresh — cioè a ogni vera apertura
// dell'app, esattamente come dev'essere.
export let splashStartedAt: number | null = null;

export function stampSplashStart(): void {
  if (splashStartedAt === null) splashStartedAt = Date.now();
}

export function splashElapsedMs(): number {
  return splashStartedAt === null ? 0 : Date.now() - splashStartedAt;
}
