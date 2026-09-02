/**
 * Der Rahmen, den jeder Screen des Entwurfs teilt: Mastkopf-Linie,
 * Navigationszeile, Haarlinie. Aus dem Handoff, Abschnitt „Layout frame".
 */
import type { ComponentChildren } from 'preact';

export type Route = 'listen' | 'wallet' | 'settings';

const ROUTES: { id: Route; label: string }[] = [
  { id: 'listen', label: 'Hören' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'settings', label: 'Einstellungen' },
];

export interface ChromeProps {
  route: Route;
  onRoute: (route: Route) => void;
  /** Im Wallet steht das Guthaben nicht in der Zeile — dort ist es die Seite. */
  balance?: number;
  /** 3b: unter der Untergrenze wird die Zahl magenta und fett. */
  lowBalance?: boolean;
  children?: ComponentChildren;
}

export function Chrome({ route, onRoute, balance, lowBalance, children }: ChromeProps) {
  return (
    <>
      <div class="masthead-rule" />
      <nav class="nav" aria-label="Hauptnavigation">
        <span class="nav-brand">Cashu Player</span>
        <div class="nav-routes">
          {ROUTES.map((entry) => (
            <button
              type="button"
              key={entry.id}
              class="route"
              aria-current={entry.id === route ? 'page' : undefined}
              onClick={() => onRoute(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>
        {balance !== undefined && (
          <span class={lowBalance ? 'nav-balance low' : 'nav-balance'}>{balance} Sat</span>
        )}
        {children}
      </nav>
      <div class="nav-hairline" />
    </>
  );
}
