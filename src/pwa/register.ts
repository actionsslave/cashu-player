/**
 * FR-31: Service Worker registrieren. Nur über HTTPS, weil Service Worker und
 * navigator.storage.persist() das verlangen (NFR-04).
 */
export type RegistrationResult =
  | 'registriert'
  | 'nicht-unterstuetzt'
  | 'kein-sicherer-kontext'
  | 'fehlgeschlagen';

export async function registerServiceWorker(): Promise<RegistrationResult> {
  if (!navigator.serviceWorker) return 'nicht-unterstuetzt';
  if (!window.isSecureContext) return 'kein-sicherer-kontext';

  try {
    await navigator.serviceWorker.register('/sw.js', { type: 'module', scope: '/' });
    return 'registriert';
  } catch {
    // NFR-03: ein fehlender Service Worker darf die App nicht aufhalten.
    return 'fehlgeschlagen';
  }
}
