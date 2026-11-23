import {useEffect, useRef, useState} from 'react';
import type {Screening} from './film-screenings';
import './film-screen.css';

type Props = {
  screening: Screening;
  english: boolean;
  cinema?: boolean;
  active?: boolean;
  onPlay?: () => void;
};

export function FilmScreen({screening, english, cinema = false, active = true, onPlay}: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<'ready' | 'playing' | 'error'>('ready');
  const lang = english ? 1 : 0;
  const retryLabel = english ? 'Retry playback' : '다시 재생';
  const playLabel = status === 'error' ? `${screening.title[lang]} · ${retryLabel}` : screening.playLabel[lang];

  useEffect(() => {
    if (!active) ref.current?.pause();
  }, [active]);

  function start() {
    const video = ref.current;
    if (!video) return;
    setStatus('playing');
    onPlay?.();

    video.hidden = false;
    if (!video.hasAttribute('src')) video.src = screening.video;
    else if (video.error) video.load();
    video.muted = false;

    // Keep the request in the user's click so browsers allow playback with sound.
    void video.play().catch(error => {
      if (error?.name !== 'AbortError') setStatus('error');
    });
    video.focus({preventScroll: true});
  }

  return <>
    <div className={cinema ? 'film-screen space-screen' : 'film-screen'}>
      <video ref={ref} hidden={status !== 'playing'} controls playsInline preload="none"
        poster={screening.poster} aria-label={screening.title[lang]}
        onPlay={onPlay} onError={() => setStatus('error')}/>
      {status !== 'playing' && <button type="button" className="film-screen-play"
        aria-label={playLabel} onClick={start}>
        <img src={screening.poster} alt="" />
        <span className="film-screen-call">
          <span className="film-screen-play-mark" aria-hidden="true">▶</span>
          <span>{status === 'error' ? retryLabel : (english ? 'Play film' : '영상 재생')}</span>
        </span>
      </button>}
    </div>
    {status === 'error' && <p className="film-screen-error" role="status">
      {english ? 'The film could not be played. Select play to retry.' : '영상을 재생하지 못했습니다. 재생 버튼을 눌러 다시 시도해 주세요.'}
    </p>}
  </>;
}
