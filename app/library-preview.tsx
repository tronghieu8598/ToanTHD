'use client';

import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent, type RefObject } from 'react';
import { Play, Square } from 'lucide-react';
import { resourceKinds, type LibraryResource } from '../lib/client/library-catalog';
import { StudioCover } from './studio-cover';

const hoverDelay = 150;

type Props = {
  item: LibraryResource;
  expanded?: boolean;
  popup?: 'dialog';
  activeClip: RefObject<(() => void) | null>;
  onOpen: (event: MouseEvent<HTMLButtonElement>) => void;
};

export function LibraryResourceCard({ item, expanded, popup, activeClip, onOpen }: Props) {
  const clip = item.upload?.deletedAt ? undefined : item.preview;
  const videoRef = useRef<HTMLVideoElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const request = useRef(0);
  const origin = useRef<'hover' | 'manual' | null>(null);
  const [playback, setPlayback] = useState<'idle' | 'loading' | 'playing' | 'failed'>('idle');

  const release = useCallback((video: HTMLVideoElement | null) => {
    window.clearTimeout(timer.current);
    request.current += 1;
    origin.current = null;
    if (video?.hasAttribute('src')) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
  }, []);

  const stop = useCallback(() => {
    release(videoRef.current);
    if (activeClip.current === stop) activeClip.current = null;
    setPlayback('idle');
  }, [activeClip, release]);

  useEffect(() => {
    const video = videoRef.current;
    return () => {
      release(video);
      if (activeClip.current === stop) activeClip.current = null;
    };
  }, [activeClip, clip?.src, release, stop]);

  function fail() {
    if (!origin.current) return;
    stop();
    setPlayback('failed');
  }

  function play(trigger: 'hover' | 'manual') {
    const video = videoRef.current;
    if (!clip || !video || origin.current) return;
    activeClip.current?.();
    activeClip.current = stop;
    origin.current = trigger;
    const playingRequest = ++request.current;
    setPlayback('loading');
    video.muted = true;
    video.src = clip.src;
    void video.play().then(() => {
      if (playingRequest === request.current) setPlayback('playing');
    }).catch(() => {
      if (playingRequest === request.current) fail();
    });
  }

  function enter(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse') return;
    timer.current = window.setTimeout(() => play('hover'), hoverDelay);
  }

  function leave() {
    window.clearTimeout(timer.current);
    if (origin.current === 'hover') stop();
  }

  const isActive = playback === 'loading' || playback === 'playing';
  const cover = !item.upload?.deletedAt && <StudioCover kind={item.kind} chapter={item.chapter} cover={item.cover} arrow />;

  return <div className="studio-resource-slot" onPointerEnter={clip ? enter : undefined} onPointerLeave={clip ? leave : undefined}
    onBlur={event => {
      if (origin.current === 'manual' && !event.currentTarget.contains(event.relatedTarget)) stop();
    }}
    onKeyDown={event => {
      if (event.key === 'Escape' && origin.current) {
        event.stopPropagation();
        stop();
      }
    }}>
    <button type="button" className="studio-resource" aria-label={`Xem ${item.title}`} aria-expanded={expanded} aria-haspopup={popup}
      onClick={event => { stop(); onOpen(event); }}>
      {clip ? <span className="studio-resource-visual">
        {cover}
        <video className="studio-demo-video" data-playing={playback === 'playing'} ref={videoRef}
          muted playsInline preload="none" aria-hidden="true" tabIndex={-1} onEnded={stop} onError={fail} />
      </span> : cover}
      <small>{resourceKinds[item.kind]}{item.upload?.visibility === 'private' ? ' · Riêng tư' : ''}</small>
      <strong>{item.title}</strong>
      {item.upload && !item.upload.deletedAt && <small>{item.upload.owned ? 'Của bạn' : item.upload.ownerName}</small>}
    </button>
    {clip && <>
      <button type="button" className="studio-demo-trigger" aria-pressed={isActive} aria-busy={playback === 'loading'}
        aria-label={`Clip xem trước · ${item.title}`}
        title={isActive ? 'Dừng clip' : 'Phát clip giới thiệu'}
        onClick={() => {
          window.clearTimeout(timer.current);
          if (origin.current) stop();
          else play('manual');
        }}>
        {isActive ? <Square size={16} aria-hidden="true" /> : <Play size={17} aria-hidden="true" />}
      </button>
      {playback === 'failed' && <span className="sr-only" role="status">Clip chưa phát được.</span>}
    </>}
  </div>;
}
