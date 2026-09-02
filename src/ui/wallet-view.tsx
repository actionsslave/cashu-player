/**
 * Wallet aus Entwurf 4a. Deutsche Endfassung, wörtlich aus dem Handoff.
 *
 * Nutzaps sind in diesem Entwurf einseitig: Der Hörer sendet, er empfängt nie.
 * Der npub ist Identität, nicht Verwahrung; das Guthaben liegt auf dem Gerät.
 */
import { useCallback, useEffect, useState } from 'preact/hooks';
import type { HistoryRecord } from '../db/database.js';
import { openDatabase } from '../db/database.js';
import { listHistory } from '../wallet/history.js';
import { readStorageMode, type StorageMode } from '../wallet/persistence.js';
import { mintOverview, type MintRow } from '../wallet/mint-overview.js';
import { TokenImportError } from '../wallet/mint-gateway.js';
import type { LocalWallet, TokenExport } from '../wallet/local-wallet.js';
import { publicMints } from '../config/build-config.js';
import { Icon } from './icons.js';
import { QrCode } from './qr-code.js';

export type HistoryFilter = 'alle' | 'aufladen' | 'nutzap' | 'export';

/** Die drei Arten, die der Entwurf kennt — und nur diese drei. */
export function transactionType(entry: HistoryRecord): 'Nutzap gesendet' | 'Token exportiert' | 'Aufgeladen' {
  if (entry.kind === 'import') return 'Aufgeladen';
  if (entry.kind === 'export') return 'Token exportiert';
  return 'Nutzap gesendet';
}

export function matchesFilter(entry: HistoryRecord, filter: HistoryFilter): boolean {
  if (filter === 'alle') return true;
  if (filter === 'aufladen') return entry.kind === 'import';
  if (filter === 'export') return entry.kind === 'export';
  return entry.kind === 'streaming' || entry.kind === 'boost';
}

const zahl = (n: number) => n.toLocaleString('de-DE');

export interface WalletViewProps {
  wallet: LocalWallet;
  onBalanceChange?: (balance: number) => void;
}

export function WalletView({ wallet, onBalanceChange }: WalletViewProps) {
  const [balance, setBalance] = useState(0);
  const [token, setToken] = useState('');
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [mints, setMints] = useState<MintRow[]>([]);
  const [exports, setExports] = useState<TokenExport[]>([]);
  const [error, setError] = useState<string | undefined>(undefined);
  const [filter, setFilter] = useState<HistoryFilter>('alle');
  const [copied, setCopied] = useState(false);
  const [storageMode, setStorageMode] = useState<StorageMode | undefined>(undefined);

  const refresh = useCallback(async () => {
    const db = await openDatabase();
    const [next, entries, proofs, mode] = await Promise.all([
      wallet.balance(),
      listHistory(),
      db.getAll('proofs'),
      readStorageMode(),
    ]);
    setStorageMode(mode);
    setBalance(next);
    setHistory(entries);
    setMints(mintOverview(proofs));
    onBalanceChange?.(next);
  }, [wallet, onBalanceChange]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleImport() {
    setError(undefined);
    try {
      await wallet.importToken(token.trim());
      // US-04-AC-5: bei Ablehnung bleibt der Token für einen zweiten Versuch stehen.
      setToken('');
      await refresh();
    } catch (cause) {
      setError(cause instanceof TokenImportError ? cause.message : 'Der Import ist fehlgeschlagen.');
    }
  }

  async function handlePaste() {
    try {
      setToken(await navigator.clipboard.readText());
    } catch {
      setError('Die Zwischenablage ist nicht lesbar. Füge den Token von Hand ein.');
    }
  }

  async function handleExport() {
    setExports(await wallet.exportTokens());
    setCopied(false);
  }

  async function handleCopy(value: string) {
    try {
      await navigator.clipboard?.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const gefiltert = history.filter((entry) => matchesFilter(entry, filter));

  return (
    <div class="wallet-page">
      <div class="balance">
        <span class="amount balance-amount">{zahl(balance)}</span>
        <span class="unit">Sat</span>
        <span class="note">verfügbar für Nutzaps</span>
        {/* FR-18: das Ergebnis von navigator.storage.persist() gehört dahin,
            wo der Nutzer nach seinem Guthaben sieht. */}
        {storageMode && <span class="tag tag-accent">Speicher: {storageMode}</span>}
      </div>
      {/*
        FR-16 verlangt diesen Hinweis ausdrücklich vor der ersten Aufladung.
        Entwurf 4a führt ihn nicht mehr — er sagt in der Datumsleiste nur „Nur
        auf diesem Gerät gespeichert", was die Folge nicht nennt. Eine Muss-
        Anforderung fällt nicht weg, weil ein Entwurf sie nicht zeigt.
      */}
      <p class="balance-warning" style={{ margin: '10px 0 0' }}>
        Löschen der Website-Daten vernichtet das Guthaben. Exportiere einen Token, bevor du den
        Browser schließt.
      </p>

      <div class="wallet-grid">
        <div>
          <h3>Aufladen</h3>
          <p class="explainer">
            Füge einen Cashu-Token ein, lautend auf Sat. Ein Token eines fremden Mints lässt sich
            einlösen, sobald du dem Mint vertraust.
          </p>
          {/*
            Welche Mints angenommen werden — ohne die Entwicklungs-Mints, damit
            niemand Testnetz-Geld schickt. Der Entwurf zeigt stattdessen die
            Mints, bei denen Guthaben liegt; beides ist gewollt und steht hier
            nebeneinander.
          */}
          <ul class="accepted-mints">
            {publicMints().map((mint) => (
              <li key={mint}>{mint.replace(/^https:\/\//, '').replace(/\/+$/, '')}</li>
            ))}
          </ul>
          <textarea
            id="token-input"
            class="input token-input"
            aria-label="Cashu-Token einfügen"
            placeholder="cashuA…"
            value={token}
            onInput={(event) => setToken((event.target as HTMLTextAreaElement).value)}
          />
          {error && <p class="wallet-error">{error}</p>}
          <div class="actions">
            <button
              type="button"
              class="btn btn-primary"
              onClick={() => void handleImport()}
              disabled={token.trim() === ''}
            >
              Aufladen
            </button>
            <button type="button" class="btn btn-ghost" onClick={() => void handlePaste()}>
              <Icon name="clipboard" size={16} /> Aus Zwischenablage
            </button>
          </div>
        </div>

        <div>
          <h3>Export</h3>
          <p class="explainer">
            Gib einen Betrag als Cashu-Token aus, einlösbar in jeder Wallet. Der Token entsteht beim
            gewählten Mint und verlässt diese Wallet endgültig.
          </p>
          <div class="export-line">
            <span class="input" aria-hidden="true">
              {zahl(balance)}
            </span>
            <span>Sat von</span>
            <span class="tag tag-outline">{mints[0] ? mints[0].url : 'kein Mint'}</span>
          </div>
          <div class="actions">
            <button type="button" class="btn btn-secondary" onClick={() => void handleExport()}>
              Token erzeugen
            </button>
          </div>
          {exports.map((entry) => (
            <div class="export-row" key={entry.mintUrl}>
              <QrCode value={entry.token} />
              <div>
                <p class="export-token">{entry.token}</p>
                <div class="export-actions">
                  <button
                    type="button"
                    class="btn btn-secondary"
                    onClick={() => void handleCopy(entry.token)}
                  >
                    {copied ? 'Kopiert' : 'Token kopieren'}
                  </button>
                  <button type="button" class="btn btn-ghost" onClick={() => void handleExport()}>
                    Neu erzeugen
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <section class="wallet-block">
        <div class="section-head">
          <h3>Mints</h3>
        </div>
        <p class="explainer">
          Dein Guthaben ist eine Forderung gegen den jeweiligen Mint. Ein Nutzap kann nur von einem
          Mint gesendet werden, den der Podcast auch akzeptiert.
        </p>
        <div class="grid-table mints-table">
          <span class="th">Mint</span>
          <span class="th">Guthaben</span>
          <span class="th">Einheit</span>
          <span class="th">Keyset</span>
          <span class="th">Status</span>
          {mints.map((mint) => (
            <>
              <span class="td" key={`${mint.url}-u`}>
                {mint.url}
              </span>
              <span class="td num">{zahl(mint.balance)}</span>
              <span class="td">{mint.unit}</span>
              <span class="td num faint">{mint.keysetId}</span>
              <span class="td status-ok">
                {publicMints().some((m) => m === mint.url) ? 'Erlaubt' : 'Nicht in der Liste'}
              </span>
            </>
          ))}
          {mints.length === 0 && (
            <span class="td faint" style={{ gridColumn: '1 / -1' }}>
              Noch kein Guthaben. Lade oben einen Token auf.
            </span>
          )}
        </div>
      </section>

      <section class="wallet-block" style={{ marginTop: '26px' }}>
        <div class="section-head">
          <h3>Verlauf</h3>
          <div class="filter-row">
            {(
              [
                ['alle', 'Alle'],
                ['aufladen', 'Aufladen'],
                ['nutzap', 'Nutzap'],
                ['export', 'Export'],
              ] as const
            ).map(([id, label]) => (
              <button
                type="button"
                key={id}
                class={filter === id ? 'tag tag-filled' : 'tag tag-outline'}
                onClick={() => setFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div class="grid-table history-table">
          <span class="th">Betrag</span>
          <span class="th">Wann</span>
          <span class="th">Art</span>
          <span class="th">Podcast · Episode</span>
          <span class="th">Mint</span>
          {gefiltert.map((entry) => (
            <>
              <span class="td num" key={`${entry.id}-a`}>
                {entry.direction === 'in' ? '+' : '−'}
                {zahl(entry.amount)} Sat
              </span>
              <span class="td faint">{new Date(entry.at).toLocaleString('de-DE')}</span>
              <span class="td">{transactionType(entry)}</span>
              <span class={entry.feedTitle ? 'td' : 'td faint'}>
                {entry.feedTitle
                  ? [entry.feedTitle, entry.episodeTitle].filter(Boolean).join(' · ')
                  : '—'}
              </span>
              <span class="td faint">{mints[0]?.url ?? '—'}</span>
            </>
          ))}
        </div>
      </section>
    </div>
  );
}
