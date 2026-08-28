/**
 * Player (FR-12, FR-13, FR-14). Gibt gehörte Zeit als ListeningTick nach oben —
 * daran hängt Paket E die Streaming-Zahlungen.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { EpisodeRecord } from '../db/database.js';
import type { ListeningTick } from '../contracts/index.js';
import { ListeningTicker } from '../player/listening-ticker.js';
import { PositionPersister, loadPosition } from '../player/position-store.js';
import { setMediaSessionHandlers, updateMediaSession } from '../player/media-session.js';
import { formatDuration } from './feed-view.js';

const SKIP_FORWARD_SECONDS = 30;
const SKIP_BACKWARD_SECONDS = 15;

export interface PlayerProps {
  episode?: EpisodeRecord;
  podcastTitle?: string;
  artworkUrl?: string;
  onTick?: (tick: ListeningTick) => void;
}

export function Player({ episode, podcastTitle = '', artworkUrl, onTick }: PlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);

  const episodeId = episode?.id;
  const duration = episode?.durationSeconds ?? 0;

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
    setPosition(audio.currentTime);
  }

  function scrubTo(seconds: number): void {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = seconds;
    setPosition(seconds);
  }

  if (!episode) {
    return (
      <section class="player">
        <p class="meta">Keine Episode ausgewählt.</p>
      </section>
    );
  }

  return (
    <section class="player">
      <h3>{episode.title}</h3>
      <audio
        ref={audioRef}
        src={episode.enclosureUrl}
        preload="metadata"
        onTimeUpdate={(event) => setPosition((event.currentTarget as HTMLAudioElement).currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <div class="controls">
        <button type="button" onClick={() => skip(-SKIP_BACKWARD_SECONDS)}>
          −15 s
        </button>
        {playing ? (
          <button type="button" onClick={() => halt()}>
            Pause
          </button>
        ) : (
          <button type="button" onClick={() => void start()}>
            Abspielen
          </button>
        )}
        <button type="button" onClick={() => skip(SKIP_FORWARD_SECONDS)}>
          +30 s
        </button>
        <span class="meta">
          {formatDuration(Math.floor(position))}
          {duration > 0 ? ` / ${formatDuration(duration)}` : ''}
        </span>
      </div>
      <input
        type="range"
        class="progress"
        min={0}
        max={duration}
        step={1}
        value={position}
        aria-label="Fortschritt"
        onInput={(event) => scrubTo(Number((event.target as HTMLInputElement).value))}
      />
    </section>
  );
}
