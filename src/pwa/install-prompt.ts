/**
 * FR-32: `beforeinstallprompt` abfangen und für eine eigene Schaltfläche
 * bereithalten. Chromium feuert das Ereignis nur, wenn Manifest, Icons,
 * HTTPS und ein Service Worker mit Fetch-Handler vorliegen (Kapitel 5.5).
 */
export interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice?: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Läuft die App bereits als installiertes Fenster? Dann kein Angebot (US-08-AC-3). */
export function isStandalone(): boolean {
  if (typeof window.matchMedia !== 'function') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  // iOS Safari meldet den Zustand über ein eigenes Feld.
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/**
 * Meldet das abgefangene Ereignis, sobald es kommt, und `undefined`, sobald die
 * App installiert ist. Gibt eine Abmeldefunktion zurück.
 */
export function watchInstallPrompt(
  handler: (event: InstallPromptEvent | undefined) => void,
): () => void {
  const onBeforeInstall = (event: Event) => {
    // Ohne preventDefault zeigt Chromium sein eigenes Banner statt unserer Schaltfläche.
    event.preventDefault();
    handler(event as InstallPromptEvent);
  };
  const onInstalled = () => handler(undefined);

  window.addEventListener('beforeinstallprompt', onBeforeInstall);
  window.addEventListener('appinstalled', onInstalled);

  return () => {
    window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    window.removeEventListener('appinstalled', onInstalled);
  };
}
