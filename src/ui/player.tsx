/**
 * Now-playing-Block aus Entwurf 1a (FR-12, FR-13, FR-14).
 *
 * Cover links, Titel und Bedienung in der Mitte, die Session-Spalte setzt die
 * Seite daneben. Der Boost-Knopf sitzt rechts in der Transportzeile —
 * Variante 2a, schwarze Fläche, das lauteste Element der Seite.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { EpisodeRecord } from '../db/database.js';
import type { ListeningTick } from '../contracts/index.js';
import { ListeningTicker } from '../player/listening-ticker.js';
import { PositionPersister, loadPosition } from '../player/position-store.js';
import { setMediaSessionHandlers, updateMediaSession } from '../player/media-session.js';
import { PLAYBACK_RATES, PLAYBACK_RATE_DEFAULT } from '../config/build-config.js';

const SKIP_FORWARD_SECONDS = 30;
const SKIP_BACKWARD_SECONDS = 15;

/** 0.8 wird zu "0,8×", 1 zu "1×" — ohne nachlaufende Null. */
function formatRate(rate: number): string {
  return `${String(rate).replace('.', ',')}×`;
}

/** hh:mm:ss, wie die Zeitzeile im Entwurf. */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

/** Kompakte Dauer für die Meta-Zeile: 1:12:40 beziehungsweise 12:40. */
export function formatDuration(seconds: number | undefined): string {
  if (!seconds) return '';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${minutes}:${pad(rest)}`;
}

export interface PlayerProps {
  episode?: EpisodeRecord;
  podcastTitle?: string;
  artworkUrl?: string;
  /** Text hinter der Dauer: „streamt 10 Sat/min", „streamt nicht", „nur hören". */
  streamingNote?: string;
  canBoost?: boolean;
  onBoost?: () => void;
  onTick?: (tick: ListeningTick) => void;
  onPositionChange?: (seconds: number) => void;
}

export function Player({
  episode,
  podcastTitle = '',
  artworkUrl,
  streamingNote,
  canBoost = false,
  onBoost,
  onTick,
  onPositionChange,
}: PlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [rate, setRate] = useState(PLAYBACK_RATE_DEFAULT);

  const episodeId = episode?.id;
  const duration = episode?.durationSeconds ?? 0;

  function reportPosition(seconds: number): void {
    setPosition(seconds);
    onPositionChange?.(seconds);
  }

  // Ticker, Positionsspeicher und Startposition hängen an der Episode.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !episode) return;

    let cancelled = false;
    void loadPosition(episode.id).then((saved) => {
      if (cancelled || saved === undefined) return;
      audio.currentTime = saved;
      setPosition(saved);
    });

    const ticker = new ListeningTicker({
      audio,
      feedId: episode.feedId,
      episodeId: episode.id,
    });
    const unsubscribe = onTick ? ticker.onTick(onTick) : undefined;
    const persister = new PositionPersister({ audio, episodeId: episode.id });

    return () => {
      cancelled = true;
      unsubscribe?.();
      void persister.flush().finally(() => persister.stop());
      ticker.stop();
    };
    // Bewusst nur an der Episode: ein Wechsel des Handlers soll die Wiedergabe
    // nicht neu aufsetzen.
  }, [episodeId, episode, onTick]);

  // FR-12: Die Geschwindigkeit gilt weiter, wenn die Episode wechselt — ein
  // Wechsel der Quelle setzt sie am Element sonst auf defaultPlaybackRate.
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = rate;
  }, [rate, episodeId]);

  // FR-13: Titel, Cover und Zustand an die Systemsteuerung melden.
  useEffect(() => {
    if (!episode) return;
    updateMediaSession({
      title: episode.title,
      podcastTitle,
      artworkUrl,
      playbackState: playing ? 'playing' : 'paused',
    });
    setMediaSessionHandlers({
      play: () => void start(),
      pause: () => halt(),
      seekBackward: () => skip(-SKIP_BACKWARD_SECONDS),
      seekForward: () => skip(SKIP_FORWARD_SECONDS),
    });
    // start/halt/skip greifen nur auf das Ref zu und sind stabil genug.
  }, [episode, podcastTitle, artworkUrl, playing]);

  async function start(): Promise<void> {
    const audio = audioRef.current;
    if (!audio) return;
    setPlaying(true);
    // jsdom liefert kein Promise; im Browser kann play() abgelehnt werden.
    await Promise.resolve(audio.play()).catch(() => setPlaying(false));
  }

  function halt(): void {
    audioRef.current?.pause();
    setPlaying(false);
  }

  function skip(seconds: number): void {
    const audio = audioRef.current;
    if (!audio) return;
    const next = Math.max(0, audio.currentTime + seconds);
    audio.currentTime = duration > 0 ? Math.min(next, duration) : next;
    reportPosition(audio.currentTime);
  }

  /** Die Fortschrittsleiste ist anklickbar; der Anteil ergibt die Zielzeit. */
  function seekToFraction(event: MouseEvent): void {
    const audio = audioRef.current;
    if (!audio || duration <= 0) return;
    const target = event.currentTarget as HTMLElement;
    const box = target.getBoundingClientRect();
    if (box.width === 0) return;
    const fraction = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    audio.currentTime = fraction * duration;
    reportPosition(audio.currentTime);
  }

  if (!episode) return null;

  const played = duration > 0 ? Math.min(1, position / duration) : 0;

  return (
    <div class="centre">
      <span class="kicker">Läuft gerade{podcastTitle ? ` · ${podcastTitle}` : ''}</span>
      <h1>{episode.title}</h1>
      <p class="meta text-muted">
        {formatDuration(duration)}
        {streamingNote ? ` · ${streamingNote}` : ''}
      </p>

      <audio
        ref={audioRef}
        src={episode.enclosureUrl}
        preload="metadata"
        onTimeUpdate={(event) => reportPosition((event.currentTarget as HTMLAudioElement).currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      <div
        class="progress-track"
        role="slider"
        tabIndex={0}
        aria-label="Fortschritt"
        aria-valuemin={0}
        aria-valuemax={Math.floor(duration)}
        aria-valuenow={Math.floor(position)}
        onClick={seekToFraction}
      >
        <div class="progress-fill" style={{ width: `${played * 100}%` }} />
      </div>

      <div class="time-row">
        <span>{formatClock(position)}</span>
        <span>{duration > 0 ? `−${formatClock(duration - position)}` : ''}</span>
      </div>

      <div class="transport">
        <button type="button" class="btn btn-secondary" onClick={() => skip(-SKIP_BACKWARD_SECONDS)}>
          −15 s
        </button>
        {playing ? (
          <button type="button" class="btn btn-primary" onClick={() => halt()}>
            Pause
          </button>
        ) : (
          <button type="button" class="btn btn-primary" onClick={() => void start()}>
            Abspielen
          </button>
        )}
        <button type="button" class="btn btn-secondary" onClick={() => skip(SKIP_FORWARD_SECONDS)}>
          +30 s
        </button>
        <select
          name="playback-rate"
          class="input rate"
          aria-label="Abspielgeschwindigkeit"
          value={String(rate)}
          onChange={(event) => setRate(Number((event.target as HTMLSelectElement).value))}
        >
          {PLAYBACK_RATES.map((option) => (
            <option key={option} value={String(option)}>
              {formatRate(option)}
            </option>
          ))}
        </select>
        <button
          type="button"
          class="btn btn-boost"
          disabled={!canBoost}
          onClick={() => onBoost?.()}
        >
          Boost
        </button>
      </div>
    </div>
  );
}
