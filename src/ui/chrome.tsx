/**
 * Der Rahmen, den jeder Screen des Handoffs teilt: Mastkopf-Linie, Kopfzeile,
 * Datumsleiste, Haarlinie. Aus „The frame every screen shares".
 *
 * Die Kopfzeile ist ein Slot: Die Bibliothek setzt Wortmarke und Umschalter
 * hinein, die Show-Seite einen Zurück-Knopf, die Suche das Eingabefeld.
 */
import type { ComponentChildren } from 'preact';

export type Route = 'listen' | 'wallet' | 'settings';

export const ROUTES: { id: Route; label: string }[] = [
  { id: 'listen', label: 'Hören' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'settings', label: 'Einstellungen' },
];

export interface FrameProps {
  /** Die Kopfzeile über der Mastkopf-Linie. */
  head: ComponentChildren;
  /** Drei Angaben in der Datumsleiste: Kontext, Anzahl, Zustand. */
  dateline?: ComponentChildren;
  children?: ComponentChildren;
}

export function Frame({ head, dateline, children }: FrameProps) {
  return (
    <>
      <div class="head">
        {head}
        <div class="masthead-rule" />
        {dateline && <div class="dateline">{dateline}</div>}
        <div class="nav-hairline" />
      </div>
      <div class="content">{children}</div>
    </>
  );
}

/** Routenlinks, wie 4a sie zeigt: aktiv in Akzentfarbe und halbfett. */
export function RouteLinks({ route, onRoute }: { route: Route; onRoute: (r: Route) => void }) {
  return (
    <div class="nav-routes">
      {ROUTES.map((entry) => (
        <button
          type="button"
          key={entry.id}
          class={entry.id === route ? 'route active' : 'route'}
          aria-current={entry.id === route ? 'page' : undefined}
          onClick={() => onRoute(entry.id)}
        >
          {entry.label}
        </button>
      ))}
    </div>
  );
}
