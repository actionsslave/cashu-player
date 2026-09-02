/**
 * Nutzap senden und die Bestätigung, Entwurf 4b. Deutsche Endfassung.
 *
 * Zur Aufteilung: Der Entwurf zeigt mehrere Empfänger mit Rollen und je einem
 * Status. Diese App zahlt an genau einen Empfänger — den npub des Podcasts, so
 * legt es OQ-05 für den MVP fest, und Splits über mehrere Empfänger stehen in
 * Kapitel 3.1 ausdrücklich nicht im Scope. Die Tabelle zeigt deshalb die
 * Empfänger, die die App wirklich bezahlen kann. Die Rechnung dahinter ist
 * trotzdem die des Entwurfs: Der Knopf trägt die Summe der zahlbaren Anteile,
 * nicht den gewählten Chip-Betrag.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { BOOST_MESSAGE_MAX_LENGTH, BOOST_PRESETS_SATS } from '../config/build-config.js';
import { formatTimecode } from '../payments/nutzap.js';
import { Icon } from './icons.js';

export interface SplitRow {
  name: string;
  role?: string;
  amount: number;
  hasNutzapAddress: boolean;
}

/** Der Betrag, der tatsächlich rausgeht: nur die zahlbaren Anteile. */
export function payableTotal(split: SplitRow[]): number {
  return split.reduce((sum, row) => (row.hasNutzapAddress ? sum + row.amount : sum), 0);
}

export interface NutzapDialogProps {
  balance: number;
  positionSeconds: number;
  podcastTitle?: string;
  episodeTitle?: string;
  /** Empfänger des Feeds; leer heißt: nur der Podcast selbst. */
  recipients?: { name: string; role?: string; hasNutzapAddress: boolean; share: number }[];
  onSend: (amount: number, content: string) => Promise<void>;
  onCancel: () => void;
}

const zahl = (n: number) => n.toLocaleString('de-DE');

export function NutzapDialog({
  balance,
  positionSeconds,
  podcastTitle,
  episodeTitle,
  recipients,
  onSend,
  onCancel,
}: NutzapDialogProps) {
  const [amount, setAmount] = useState(BOOST_PRESETS_SATS[0]);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<number | undefined>(undefined);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Die Zeitmarke wird beim Öffnen eingefroren, sonst liefe sie beim Tippen mit.
  const [frozenSeconds] = useState(positionSeconds);
  const timecode = formatTimecode(frozenSeconds);

  const split = useMemo<SplitRow[]>(() => {
    const liste = recipients?.length
      ? recipients
      : [{ name: podcastTitle ?? 'Podcast', role: undefined, hasNutzapAddress: true, share: 1 }];
    return liste.map((r) => ({
      name: r.name,
      role: r.role,
      hasNutzapAddress: r.hasNutzapAddress,
      amount: Math.floor(amount * r.share),
    }));
  }, [recipients, podcastTitle, amount]);

  const zahlbar = payableTotal(split);
  const rest = split.reduce((sum, row) => (row.hasNutzapAddress ? sum : sum + row.amount), 0);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancelRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const kopf = [podcastTitle, episodeTitle].filter(Boolean).join(' · ');
  const content =
    comment.trim() === ''
      ? [episodeTitle, timecode].filter(Boolean).join(' · ')
      : `${[episodeTitle, timecode].filter(Boolean).join(' · ')} — ${comment.trim()}`;

  async function handleSend() {
    setSending(true);
    try {
      await onSend(zahlbar, content);
      setSent(zahlbar);
    } finally {
      setSending(false);
    }
  }

  // ── Bestätigung ────────────────────────────────────────────────────
  if (sent !== undefined) {
    return (
      <div class="dialog-backdrop">
        <div class="dialog nutzap-dialog" role="dialog" aria-label="Nutzap gesendet">
          <span class="kicker">Gesendet</span>
          <h3>{zahl(sent)} Sat unterwegs</h3>
          <p class="explainer">
            Die Token sind auf die Schlüssel der Empfänger gelockt und liegen beim Mint, bis sie
            eingelöst werden. Die Zahlung ist ihre eigene Quittung — es gibt nichts zu bestätigen.
          </p>
          <div class="sent-details">
            <span class="faint">Empfänger</span>
            <span>{podcastTitle ?? '—'}</span>
            <span class="faint">In deiner Wallet geblieben</span>
            <span>{zahl(rest)} Sat</span>
          </div>
          <div class="dialog-actions">
            <button type="button" class="btn btn-secondary" onClick={onCancel}>
              Fertig
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div class="dialog-backdrop">
      <div
        class="dialog nutzap-dialog"
        role="dialog"
        aria-label="Nutzap senden"
        tabIndex={-1}
        ref={dialogRef}
      >
        <span class="kicker">{kopf}</span>
        <h3>Nutzap senden</h3>
        <p class="explainer">
          Der Betrag geht als Cashu-Token an die Empfänger dieser Folge, gelockt auf ihre
          Schlüssel. Der Kommentar wird öffentlich auf nostr veröffentlicht.
        </p>

        <div class="field">
          <label>Betrag</label>
          <div class="chip-row">
            {BOOST_PRESETS_SATS.map((preset) => (
              <button
                type="button"
                key={preset}
                class={preset === amount ? 'tag tag-filled' : 'tag tag-outline'}
                disabled={preset > balance}
                onClick={() => setAmount(preset)}
              >
                {zahl(preset)}
              </button>
            ))}
            <span class="trailing">Sat · frei wählbar</span>
          </div>
        </div>

        <div class="field">
          <label for="boost-amount">Eigener Betrag in Sat</label>
          <input
            id="boost-amount"
            class="input"
            name="boost-amount"
            type="number"
            min={1}
            value={amount}
            onInput={(event) => setAmount(Number((event.target as HTMLInputElement).value))}
          />
        </div>

        <div class="field">
          <label for="boost-message">Kommentar</label>
          <textarea
            id="boost-message"
            class="input"
            placeholder="Kommentar (öffentlich)"
            maxLength={BOOST_MESSAGE_MAX_LENGTH}
            value={comment}
            onInput={(event) =>
              setComment(
                (event.target as HTMLTextAreaElement).value.slice(0, BOOST_MESSAGE_MAX_LENGTH),
              )
            }
          />
          <div class="boost-footer text-muted">
            <span>Noch {BOOST_MESSAGE_MAX_LENGTH - comment.length} Zeichen</span>
            <span>Wird gesendet als: „{content}"</span>
          </div>
        </div>

        <div>
          <span class="kicker kicker-neutral">Aufteilung</span>
          {split.map((row) => (
            <div class="split-row" key={row.name}>
              <span class="name">
                {row.name}
                {row.role && <span class="role"> · {row.role}</span>}
              </span>
              <span class="amount">{zahl(row.amount)}</span>
              <span class={row.hasNutzapAddress ? 'status-ok' : 'status-bad'}>
                {row.hasNutzapAddress ? 'Nutzap möglich' : 'Keine Adresse'}
              </span>
            </div>
          ))}
          {rest > 0 && (
            <p class="nutzap-note">
              {zahl(rest)} Sat bleiben in der Wallet: Für diesen Anteil gibt es keine
              Nutzap-Adresse.
            </p>
          )}
        </div>

        <div class="dialog-actions">
          <button
            type="button"
            class="btn btn-primary"
            onClick={() => void handleSend()}
            disabled={zahlbar <= 0 || zahlbar > balance || sending}
          >
            <Icon name="lightning" size={15} /> {zahl(zahlbar)} Sat senden
          </button>
          <button type="button" class="btn btn-secondary" onClick={onCancel} disabled={sending}>
            Abbrechen
          </button>
          <span class="trailing">Verbleibend: {zahl(Math.max(0, balance - zahlbar))} Sat</span>
        </div>
      </div>
    </div>
  );
}
