/**
 * Player aus den Entwürfen 2a (persistenter Streifen) und 3a (Vollbild).
 *
 * Beide Ansichten sind zwei Darstellungen desselben Zustands: Das
 * `<audio>`-Element hängt an dieser Komponente und bleibt beim Umschalten
 * montiert — der Handoff verlangt ausdrücklich, dass die Wiedergabe dabei nicht
 * neu startet.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { EpisodeRecord } from '../db/database.js';
import type { ListeningTick } from '../contracts/index.js';
import { ListeningTicker } from '../player/listening-ticker.js';
import { PositionPersister, loadPosition } from '../player/position-store.js';
import { setMediaSessionHandlers, updateMediaSession } from '../player/media-session.js';
import { PLAYBACK_RATES, PLAYBACK_RATE_DEFAULT } from '../config/build-config.js';
import { plainText } from './library-view.js';
import { Icon } from './icons.js';

const SKIP_FORWARD_SECONDS = 30;
const SKIP_BACKWARD_SECONDS = 15;

function formatRate(rate: number): string {
  return `${String(rate).replace('.', ',')}×`;
}

/** hh:mm:ss für die Zeitzeilen. */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

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
  /** Vollbild (3a) statt Streifen (2a). */
  expanded?: boolean;
  onToggleExpand?: () => void;
  /** „streamt 47 Sat/min" — nur bei Feeds mit auflösbarem Empfänger. */
  streamingNote?: string;
  /** Sitzungssumme für die Wertzeile im Vollbild. */
  sentSats?: number;
  canBoost?: boolean;
  onBoost?: () => void;
  onTick?: (tick: ListeningTick) => void;
  onPositionChange?: (seconds: number) => void;
}

export function Player({
  episode,
  podcastTitle = '',
  artworkUrl,
  expanded = false,
  onToggleExpand,
  streamingNote,
  sentSats,
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
  }, [episodeId, episode, onTick]);

  // FR-12: Die Geschwindigkeit gilt über einen Episodenwechsel hinweg weiter.
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = rate;
  }, [rate, episodeId]);

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
  }, [episode, podcastTitle, artworkUrl, playing]);

  async function start(): Promise<void> {
    const audio = audioRef.current;
    if (!audio) return;
    setPlaying(true);
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

  function seekToFraction(event: MouseEvent): void {
    const audio = audioRef.current;
    if (!audio || duration <= 0) return;
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    if (box.width === 0) return;
    const fraction = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    audio.currentTime = fraction * duration;
    reportPosition(audio.currentTime);
  }

  if (!episode) return null;

  const played = duration > 0 ? Math.min(1, position / duration) : 0;

  const audio = (
    <audio
      ref={audioRef}
      src={episode.enclosureUrl}
      preload="metadata"
      onTimeUpdate={(event) => reportPosition((event.currentTarget as HTMLAudioElement).currentTime)}
      onPlay={() => setPlaying(true)}
      onPause={() => setPlaying(false)}
    />
  );

  const bar = (
    <div
      class="bar progress-track"
      role="slider"
      tabIndex={0}
      aria-label="Fortschritt"
      aria-valuemin={0}
      aria-valuemax={Math.floor(duration)}
      aria-valuenow={Math.floor(position)}
      onClick={seekToFraction}
    >
      <div class="fill progress-fill" style={{ width: `${played * 100}%` }} />
      <span class="knob" style={{ left: `${played * 100}%` }} />
    </div>
  );

  const rateSelect = (
    <select
      name="playback-rate"
      class="speed"
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
  );

  const playPause = (size: number) =>
    playing ? (
      <button type="button" class="btn btn-ghost btn-icon" aria-label="Pause" onClick={() => halt()}>
        <Icon name="pause-circle" size={size} />
      </button>
    ) : (
      <button
        type="button"
        class="btn btn-ghost btn-icon"
        aria-label="Abspielen"
        onClick={() => void start()}
      >
        <Icon name="play" size={size} />
      </button>
    );

  if (!expanded) {
    return (
      <div class="player-strip">
        {audio}
        <button
          type="button"
          class="btn btn-ghost btn-icon"
          title="Vollbild öffnen"
          aria-label="Vollbild öffnen"
          onClick={onToggleExpand}
        >
          <Icon name="caret-up" size={20} />
        </button>

        <div class="now">
          <span class="initial">{(podcastTitle || episode.title).charAt(0)}</span>
          <span class="titles">
            <span class="kicker kicker-neutral">{podcastTitle}</span>
            <button type="button" class="ep" onClick={onToggleExpand}>
              {episode.title}
            </button>
          </span>
        </div>

        <div class="transport">
          <button
            type="button"
            class="btn btn-ghost btn-icon"
            aria-label="−15 s"
            onClick={() => skip(-SKIP_BACKWARD_SECONDS)}
          >
            <Icon name="skip-back" size={22} />
          </button>
          {playPause(34)}
          <button
            type="button"
            class="btn btn-ghost btn-icon"
            aria-label="+30 s"
            onClick={() => skip(SKIP_FORWARD_SECONDS)}
          >
            <Icon name="skip-forward" size={22} />
          </button>
        </div>

        <div class="progress">
          <span class="time">{formatClock(position)}</span>
          {bar}
          <span class="time">
            {duration > 0 ? `${formatClock(duration - position)} übrig` : ''}
          </span>
        </div>

        {/* Wertzeile nur bei Feeds mit auflösbarem Empfänger. */}
        {streamingNote && (
          <div class="value">
            <span class="rate">{streamingNote}</span>
            <button type="button" class="btn btn-primary" disabled={!canBoost} onClick={onBoost}>
              <Icon name="lightning" size={16} /> Boost
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div class="player-full">
      {audio}
      <div class="body">
        {artworkUrl ? (
          <img class="cover halftone" src={artworkUrl} alt="" />
        ) : (
          <span class="cover art-placeholder">Cover</span>
        )}
        <span class="kicker">{podcastTitle}</span>
        <h2>{episode.title}</h2>

        <div class="scrubber">
          <span class="time">{formatClock(position)}</span>
          {bar}
          <span class="time">{duration > 0 ? formatClock(duration - position) : ''}</span>
        </div>

        <div class="transport">
          {rateSelect}
          <button
            type="button"
            class="btn btn-ghost btn-icon"
            aria-label="Anfang"
            onClick={() => skip(-position)}
          >
            <Icon name="skip-back" size={24} />
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-icon"
            aria-label="−15 s"
            onClick={() => skip(-SKIP_BACKWARD_SECONDS)}
          >
            <Icon name="arrow-counter-clockwise" size={21} />
          </button>
          {playPause(58)}
          <button
            type="button"
            class="btn btn-ghost btn-icon"
            aria-label="+30 s"
            onClick={() => skip(SKIP_FORWARD_SECONDS)}
          >
            <Icon name="arrow-clockwise" size={21} />
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-icon"
            aria-label="Ende"
            onClick={() => skip(duration - position)}
          >
            <Icon name="skip-forward" size={24} />
          </button>
        </div>

        {streamingNote && (
          <div class="value-row">
            <span>
              {streamingNote}
              {sentSats !== undefined ? ` · ${sentSats} Sat gesendet` : ''}
            </span>
            <button type="button" class="btn btn-primary" disabled={!canBoost} onClick={onBoost}>
              <Icon name="lightning" size={16} /> Boost
            </button>
          </div>
        )}

        {episode.description && (
          <div class="notes">
            <div>
              <span class="kicker kicker-neutral">Beschreibung</span>
              <p class="body-text">{plainText(episode.description)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
