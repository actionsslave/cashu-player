/**
 * Wallet-Route aus Entwurf 1d: Guthaben (FR-15), Aufladen (FR-17), Export
 * (FR-16), Speichermodus (FR-18) und Verlauf (FR-19).
 *
 * Das Guthaben steht hier groß auf der Seite — deshalb blendet die
 * Navigationszeile es auf dieser Route aus.
 */
import { useCallback, useEffect, useState } from 'preact/hooks';
import type { HistoryRecord } from '../db/database.js';
import { listHistory } from '../wallet/history.js';
import { readStorageMode, type StorageMode } from '../wallet/persistence.js';
import { TokenImportError } from '../wallet/mint-gateway.js';
import type { LocalWallet, TokenExport } from '../wallet/local-wallet.js';
import { QrCode } from './qr-code.js';

export interface WalletPanelProps {
  wallet: LocalWallet;
  onBalanceChange?: (balance: number) => void;
}

const STATUS_TAG: Record<HistoryRecord['status'], string> = {
  gesendet: 'tag tag-accent',
  empfangen: 'tag tag-accent',
  ausstehend: 'tag tag-neutral',
  fehlgeschlagen: 'tag tag-accent-2',
};

const KIND_LABEL: Record<HistoryRecord['kind'], string> = {
  streaming: 'Streaming',
  boost: 'Boost',
  import: 'Aufladung',
  export: 'Export',
};

export function WalletPanel({ wallet, onBalanceChange }: WalletPanelProps) {
  const [balance, setBalance] = useState(0);
  const [token, setToken] = useState('');
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [exports, setExports] = useState<TokenExport[]>([]);
  const [storageMode, setStorageMode] = useState<StorageMode | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    const [next, entries, mode] = await Promise.all([
      wallet.balance(),
      listHistory(),
      readStorageMode(),
    ]);
    setBalance(next);
    setHistory(entries);
    setStorageMode(mode);
    onBalanceChange?.(next);
  }, [wallet, onBalanceChange]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleImport() {
    setError(undefined);
    try {
      await wallet.importToken(token.trim());
      // Erst nach Erfolg leeren — US-04-AC-5 will den Token für den zweiten Versuch behalten.
      setToken('');
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof TokenImportError ? cause.message : 'Der Import ist fehlgeschlagen.',
      );
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
      // Ohne Zwischenablage-Recht bleibt der Token sichtbar und markierbar.
      setCopied(false);
    }
  }

  return (
    <>
      <section class="balance-block">
        <span class="balance-amount">{balance}</span>
        <div class="balance-unit">
          <span class="unit">Sat</span>
          <div class="balance-tags">
            {storageMode && <span class="tag tag-accent">Speicher: {storageMode}</span>}
            {exports[0] && <span class="tag tag-neutral">{exports[0].mintUrl}</span>}
          </div>
        </div>
        {/* FR-16: die ehrliche Aussage über Browser-Speicher. */}
        <p class="balance-warning">
          Löschen der Website-Daten vernichtet das Guthaben. Exportiere einen Token, bevor du den
          Browser schließt.
        </p>
      </section>

      <section class="wallet-columns">
        <div>
          <h3>Aufladen</h3>
          <p class="subline text-muted">
            Füge einen Cashu-Token eines erlaubten Mints ein, lautend auf Sat.
          </p>
          <textarea
            id="token-input"
            class="input token-input"
            aria-label="Cashu-Token einfügen"
            value={token}
            onInput={(event) => setToken((event.target as HTMLTextAreaElement).value)}
          />
          {error && <p class="wallet-error">{error}</p>}
          <button
            type="button"
            class="btn btn-primary"
            onClick={() => void handleImport()}
            disabled={token.trim() === ''}
          >
            Aufladen
          </button>
        </div>

        <div>
          <h3>Export</h3>
          <p class="subline text-muted">
            {exports.length > 0
              ? `${exports[0].amount} Sat bei ${exports[0].mintUrl} · in jeder Cashu-Wallet einlösbar.`
              : 'Das verfügbare Guthaben als Cashu-Token, in jeder Cashu-Wallet einlösbar.'}
          </p>
          {exports.length === 0 ? (
            <button type="button" class="btn btn-secondary" onClick={() => void handleExport()}>
              Guthaben exportieren
            </button>
          ) : (
            exports.map((entry) => (
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
                    <button
                      type="button"
                      class="btn btn-ghost"
                      onClick={() => void handleExport()}
                    >
                      Neu erzeugen
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section class="history-block">
        <h3>Verlauf</h3>
        <table class="table">
          <thead>
            <tr>
              <th style={{ width: '96px' }}>Betrag</th>
              <th style={{ width: '170px' }}>Wann</th>
              <th>Podcast · Episode</th>
              <th style={{ width: '120px' }}>Art</th>
              <th style={{ width: '130px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {history.map((entry) => (
              <tr key={entry.id}>
                <td class="amount">
                  {entry.direction === 'in' ? '+' : '−'}
                  {entry.amount} Sat
                </td>
                <td class="when text-muted">{new Date(entry.at).toLocaleString('de-DE')}</td>
                <td>
                  {entry.feedTitle
                    ? [entry.feedTitle, entry.episodeTitle].filter(Boolean).join(' · ')
                    : 'Token-Import'}
                </td>
                <td class="kind">{KIND_LABEL[entry.kind]}</td>
                <td>
                  <span class={STATUS_TAG[entry.status]}>{entry.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
