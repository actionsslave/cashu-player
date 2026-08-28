/**
 * Zahlungen in der Player-Ansicht: Satz bestätigen (FR-26, US-05-AC-6),
 * Erklärung der Dauerfreigabe (FR-04), Sitzungszähler und Rückmeldung (FR-30),
 * Boost (FR-28) und der Grund, wenn nichts geht (FR-23).
 */
import { useState } from 'preact/hooks';
import { STREAMING_RATE_MAX, STREAMING_RATE_MIN } from '../config/build-config.js';
import type { PaymentCapability } from '../payments/capability.js';
import type { StreamingState } from '../payments/streaming.js';
import { BoostDialog } from './boost-dialog.js';

export interface PaymentsPanelProps {
  capability: PaymentCapability;
  streaming: StreamingState;
  rate: number;
  rateConfirmed: boolean;
  balance: number;
  positionSeconds: number;
  onConfirmRate: (rate: number) => Promise<void>;
  onBoost: (amount: number, content: string) => Promise<void>;
}

export function PaymentsPanel({
  capability,
  streaming,
  rate,
  rateConfirmed,
  balance,
  positionSeconds,
  onConfirmRate,
  onBoost,
}: PaymentsPanelProps) {
  const [draftRate, setDraftRate] = useState(rate);
  const [boosting, setBoosting] = useState(false);
  const [feedback, setFeedback] = useState<string | undefined>(undefined);

  async function handleBoost(amount: number, content: string) {
    setFeedback(undefined);
    try {
      await onBoost(amount, content);
      setBoosting(false);
      setFeedback(`Boost über ${amount} Sat gesendet.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Der Boost ist fehlgeschlagen.');
    }
  }

  // NR-06: ohne Bestätigung des Satzes wird nichts gesendet. Gefragt wird erst,
  // wenn Zahlungen überhaupt möglich sind — sonst wäre die Frage sinnlos.
  const askForRate = capability.canStream && !rateConfirmed;

  return (
    <section class="payments">
      {capability.reason && <p class="locked">{capability.reason}</p>}

      {askForRate && (
        <div class="dialog" role="dialog" aria-label="Streaming-Satz bestätigen">
          <p>
            Beim Hören wird laufend gezahlt. Bitte den Satz bestätigen — er gilt für alle Podcasts.
          </p>
          <label for="rate">Sat pro Minute</label>
          <input
            id="rate"
            name="rate"
            type="number"
            min={STREAMING_RATE_MIN}
            max={STREAMING_RATE_MAX}
            value={draftRate}
            onInput={(event) => setDraftRate(Number((event.target as HTMLInputElement).value))}
          />
          <p class="meta">
            0 schaltet Streaming ab. Die Freigabe in der nostr-Extension muss
            <strong> dauerhaft</strong> erteilt werden, sonst erscheint pro Minute ein
            Extension-Fenster.
          </p>
          <button type="button" onClick={() => void onConfirmRate(draftRate)}>
            Satz bestätigen
          </button>
        </div>
      )}

      <p class="streaming-counter">
        Diese Sitzung: <strong>{streaming.sentSats} Sat</strong> gesendet
        {streaming.stopped && ' · angehalten'}
      </p>
      {streaming.reason && <p class="error">{streaming.reason}</p>}

      <button type="button" onClick={() => setBoosting(true)} disabled={!capability.canBoost}>
        Boost
      </button>
      {feedback && <p class="feedback">{feedback}</p>}

      {boosting && (
        <BoostDialog
          balance={balance}
          positionSeconds={positionSeconds}
          onSend={handleBoost}
          onCancel={() => setBoosting(false)}
        />
      )}
    </section>
  );
}
