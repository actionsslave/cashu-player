/**
 * Wallet-Ansicht: Guthaben (FR-15), Sicherung (FR-16), Aufladen (FR-17),
 * Speichermodus (FR-18) und Verlauf (FR-19).
 */
import { useCallback, useEffect, useState } from 'preact/hooks';
import type { HistoryRecord } from '../db/database.js';
import { listHistory } from '../wallet/history.js';
import { readStorageMode, type StorageMode } from '../wallet/persistence.js';
import { TokenImportError } from '../wallet/mint-gateway.js';
import type { LocalWallet, TokenExport } from '../wallet/local-wallet.js';

export interface WalletPanelProps {
  wallet: LocalWallet;
  onBalanceChange?: (balance: number) => void;
}

export function WalletPanel({ wallet, onBalanceChange }: WalletPanelProps) {
  const [balance, setBalance] = useState(0);
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [exports, setExports] = useState<TokenExport[]>([]);
  const [storageMode, setStorageMode] = useState<StorageMode | undefined>(undefined);
  const [history, setHistory] = useState<HistoryRecord[]>([]);

  const refresh = useCallback(async () => {
    const [next, entries, mode] = await Promise.all([
      wallet.balance(),
      listHistory(20),
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
  }

  return (
    <section class="wallet">
      <h2>Wallet</h2>
      <p class="balance">
        <strong>{balance} Sat</strong>
        {storageMode && <span class="storage-mode"> · Speicher: {storageMode}</span>}
      </p>

      {/* FR-16: die ehrliche Aussage über Browser-Speicher, vor der ersten Aufladung. */}
      <p class="warning">
        Achtung: Löschen der Website-Daten vernichtet das Guthaben. Exportiere es regelmäßig.
      </p>

      <label for="token-input">Cashu-Token einfügen</label>
      <textarea
        id="token-input"
        value={token}
        onInput={(event) => setToken((event.target as HTMLTextAreaElement).value)}
      />
      <button type="button" onClick={() => void handleImport()} disabled={token.trim() === ''}>
        Aufladen
      </button>
      {error && <p class="error">{error}</p>}

      <button type="button" onClick={() => void handleExport()}>
        Guthaben exportieren
      </button>
      {exports.map((entry) => (
        <div class="export" key={entry.mintUrl}>
          <p>
            {entry.amount} Sat bei {entry.mintUrl}
          </p>
          <p class="export-token">{entry.token}</p>
          {/* TODO FR-16: QR-Code fehlt noch — dafür wird eine QR-Bibliothek gebraucht,
              die Kapitel 5 nicht nennt. Entscheidung steht aus. */}
        </div>
      ))}

      <h3>Verlauf</h3>
      <ul class="history">
        {history.map((entry) => (
          <li key={entry.id}>
            {entry.direction === 'in' ? '+' : '−'}
            {entry.amount} Sat · {new Date(entry.at).toLocaleString('de-DE')} · {entry.status}
            {entry.feedTitle && ` · ${entry.feedTitle}`}
            {entry.episodeTitle && ` · ${entry.episodeTitle}`}
          </li>
        ))}
      </ul>
    </section>
  );
}
