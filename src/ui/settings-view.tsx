/**
 * Einstellungen.
 *
 * Der Handoff nennt die Route in jeder Navigationszeile, entwirft den Screen
 * aber nicht. Sie trägt deshalb genau das, was Anforderungen verlangen und was
 * in 1a und 1d keinen Platz mehr hat: den Streaming-Satz (FR-26) und das
 * Ergebnis der Speicheranfrage (FR-18). Der Rahmen ist der der übrigen Screens.
 */
import { useState } from 'preact/hooks';
import { STREAMING_RATE_MAX, STREAMING_RATE_MIN } from '../config/build-config.js';
import type { StorageMode } from '../wallet/persistence.js';

export interface SettingsViewProps {
  rate: number;
  rateConfirmed: boolean;
  storageMode?: StorageMode;
  onConfirmRate: (rate: number) => Promise<void>;
}

export function SettingsView({
  rate,
  rateConfirmed,
  storageMode,
  onConfirmRate,
}: SettingsViewProps) {
  const [draft, setDraft] = useState(rate);

  return (
    <section class="settings">
      <h1>Einstellungen</h1>
      <p class="subline text-muted">
        Der Satz gilt für alle Podcasts. 0 schaltet Streaming ab.
      </p>

      <div class="field">
        <label for="rate">Sat pro Minute</label>
        <input
          id="rate"
          class="input"
          name="rate"
          type="number"
          min={STREAMING_RATE_MIN}
          max={STREAMING_RATE_MAX}
          value={draft}
          onInput={(event) => setDraft(Number((event.target as HTMLInputElement).value))}
        />
      </div>
      <button type="button" class="btn btn-primary" onClick={() => void onConfirmRate(draft)}>
        {rateConfirmed ? 'Satz ändern' : 'Satz bestätigen'}
      </button>
      <p class="subline text-muted" style={{ marginTop: '20px' }}>
        Die Freigabe in der nostr-Extension muss <strong>dauerhaft</strong> erteilt werden, sonst
        erscheint pro Minute ein Extension-Fenster.
      </p>

      <p class="subline text-muted">
        Browser-Speicher: {storageMode ?? 'noch nicht angefordert'}
      </p>
    </section>
  );
}
