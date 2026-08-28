/**
 * FR-28: Boost mit Betrag und Nachricht. Vier Vorgaben oder freier Betrag,
 * Nachricht bis 280 Zeichen, Hörposition als hh:mm:ss angehängt.
 */
import { useState } from 'preact/hooks';
import { BOOST_MESSAGE_MAX_LENGTH, BOOST_PRESETS_SATS } from '../config/build-config.js';
import { formatTimecode } from '../payments/nutzap.js';

export interface BoostDialogProps {
  balance: number;
  positionSeconds: number;
  onSend: (amount: number, content: string) => Promise<void>;
  onCancel: () => void;
}

export function BoostDialog({ balance, positionSeconds, onSend, onCancel }: BoostDialogProps) {
  const [amount, setAmount] = useState(BOOST_PRESETS_SATS[0]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const timecode = formatTimecode(positionSeconds);
  const remaining = BOOST_MESSAGE_MAX_LENGTH - message.length;
  const affordable = amount > 0 && amount <= balance;

  async function handleSend() {
    setSending(true);
    // FR-28: die Nachricht wird zum content, die Hörposition wird angehängt.
    const content = message.trim() === '' ? timecode : `${message.trim()} ${timecode}`;
    try {
      await onSend(amount, content);
    } finally {
      setSending(false);
    }
  }

  return (
    <div class="dialog boost" role="dialog" aria-label="Boost senden">
      <p class="meta">
        Verfügbar: {balance} Sat · Position {timecode}
      </p>

      <div class="presets">
        {BOOST_PRESETS_SATS.map((preset) => (
          <button
            type="button"
            key={preset}
            class={preset === amount ? 'selected' : undefined}
            onClick={() => setAmount(preset)}
          >
            {preset} Sat
          </button>
        ))}
      </div>

      <label for="boost-amount">Eigener Betrag in Sat</label>
      <input
        id="boost-amount"
        name="boost-amount"
        type="number"
        min={1}
        value={amount}
        onInput={(event) => setAmount(Number((event.target as HTMLInputElement).value))}
      />

      <label for="boost-message">Nachricht</label>
      <textarea
        id="boost-message"
        maxLength={BOOST_MESSAGE_MAX_LENGTH}
        value={message}
        onInput={(event) =>
          setMessage((event.target as HTMLTextAreaElement).value.slice(0, BOOST_MESSAGE_MAX_LENGTH))
        }
      />
      <p class="meta">Noch {remaining} Zeichen</p>

      <button type="button" onClick={() => void handleSend()} disabled={!affordable || sending}>
        Boost senden
      </button>
      <button type="button" onClick={onCancel} disabled={sending}>
        Abbrechen
      </button>
    </div>
  );
}
