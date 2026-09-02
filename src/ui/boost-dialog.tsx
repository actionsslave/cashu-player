/**
 * Boost-Dialog aus Entwurf 1e (FR-28, US-06).
 *
 * Vier Vorgaben oder freier Betrag, Nachricht bis 280 Zeichen. Die Hörposition
 * wird angehängt, nicht getippt — deshalb zeigt der Fuß, was tatsächlich rausgeht.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { BOOST_MESSAGE_MAX_LENGTH, BOOST_PRESETS_SATS } from '../config/build-config.js';
import { formatTimecode } from '../payments/nutzap.js';

export interface BoostDialogProps {
  balance: number;
  positionSeconds: number;
  podcastTitle?: string;
  episodeTitle?: string;
  onSend: (amount: number, content: string) => Promise<void>;
  onCancel: () => void;
}

export function BoostDialog({
  balance,
  positionSeconds,
  podcastTitle,
  episodeTitle,
  onSend,
  onCancel,
}: BoostDialogProps) {
  const [amount, setAmount] = useState(BOOST_PRESETS_SATS[0]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const timecode = formatTimecode(positionSeconds);
  const remaining = BOOST_MESSAGE_MAX_LENGTH - message.length;
  const affordable = amount > 0 && amount <= balance;
  // FR-28: die Zeitmarke wird angehängt, der Nutzer tippt sie nicht.
  const content = message.trim() === '' ? timecode : `${message.trim()} ${timecode}`;

  // Escape schließt; der Fokus wandert beim Öffnen in den Dialog.
  useEffect(() => {
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  async function handleSend() {
    setSending(true);
    try {
      await onSend(amount, content);
    } finally {
      setSending(false);
    }
  }

  const kontext = [podcastTitle, episodeTitle, timecode].filter(Boolean).join(' · ');

  return (
    <div class="dialog-backdrop">
      <div class="dialog boost" role="dialog" aria-label="Boost senden" tabIndex={-1} ref={dialogRef}>
        <div>
          <p class="dialog-title">Diese Folge boosten</p>
          <p class="text-muted tabular" style={{ fontSize: '13px' }}>
            {kontext}
          </p>
        </div>

        <div class="field">
          <label>Betrag</label>
          <div class="boost-presets">
            {BOOST_PRESETS_SATS.map((preset) => (
              <button
                type="button"
                key={preset}
                class={preset === amount ? 'btn btn-magenta' : 'btn btn-secondary'}
                disabled={preset > balance}
                onClick={() => setAmount(preset)}
              >
                {preset.toLocaleString('de-DE')}
              </button>
            ))}
          </div>
          <p class="boost-caption text-muted">
            {balance} Sat verfügbar — größere Vorgaben bleiben gesperrt, bis du auflädst.
          </p>
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
          <label for="boost-message">Nachricht</label>
          <textarea
            id="boost-message"
            class="input"
            style={{ minHeight: '74px' }}
            maxLength={BOOST_MESSAGE_MAX_LENGTH}
            value={message}
            onInput={(event) =>
              setMessage(
                (event.target as HTMLTextAreaElement).value.slice(0, BOOST_MESSAGE_MAX_LENGTH),
              )
            }
          />
          <div class="boost-footer text-muted">
            <span>Noch {remaining} Zeichen</span>
            <span>Wird gesendet als: „{content}"</span>
          </div>
        </div>

        <div class="dialog-actions">
          <button type="button" class="btn btn-secondary" onClick={onCancel} disabled={sending}>
            Abbrechen
          </button>
          <button
            type="button"
            class="btn btn-magenta"
            onClick={() => void handleSend()}
            disabled={!affordable || sending}
          >
            {amount} Sat senden
          </button>
        </div>
      </div>
    </div>
  );
}
