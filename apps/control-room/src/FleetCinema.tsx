import {useState} from 'react';
import film from '../../../assets/intro/intro.mp4';
import poster from '../../../assets/intro/poster.jpg';

export function FleetCinema({english}: {english: boolean}) {
  const [playback, setPlayback] = useState<'ready' | 'playing' | 'error'>('ready');
  const playLabel = english ? 'Play STAM introduction' : 'STAM 소개영상 재생';

  return <div className="space-cinema">
    <div className="space-screen">
      {playback === 'playing'
        ? <video src={film} poster={poster} controls autoPlay playsInline preload="metadata"
            aria-label={english ? 'STAM fleet introduction' : 'STAM 함대 소개영상'}
            onError={() => setPlayback('error')}/>
        : <button type="button" className="space-play" aria-label={playLabel} onClick={() => setPlayback('playing')}>
            <img src={poster} alt=""/>
            <span><b aria-hidden="true">▷</b>{playLabel}</span>
          </button>}
    </div>
    <div className="space-cinema-caption">
      <p>{english ? 'STAM fleet introduction · 52 seconds' : 'STAM 함대 소개영상 · 52초'}</p>
      <a href={film} download="STAM-fleet-introduction.mp4">{english ? 'Download MP4' : 'MP4 다운로드'}</a>
    </div>
    {playback === 'error' && <p role="alert">{english
      ? 'Playback failed. Press play to retry or download the film.'
      : '영상을 재생하지 못했습니다. 재생 버튼을 다시 누르거나 MP4를 다운로드하세요.'}</p>}
  </div>;
}
