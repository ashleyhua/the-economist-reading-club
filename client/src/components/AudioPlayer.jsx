import { useState, useRef, useEffect } from 'react';
import { resolveUrl } from '../utils/api';

export default function AudioPlayer({ src, title }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);
  const resolvedSrc = resolveUrl(src);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setProgress(audio.currentTime);
    const onDur = () => setDuration(audio.duration);
    const onEnd = () => setPlaying(false);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onDur);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onDur);
      audio.removeEventListener('ended', onEnd);
    };
  }, [resolvedSrc]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play(); setPlaying(true); }
  }

  function seek(e) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * duration;
  }

  function fmt(s) {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  return (
    <div style={{ background: '#F8F8F6', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <audio ref={audioRef} src={resolvedSrc} preload="metadata" />
      <button onClick={togglePlay} style={{ width: 38, height: 38, borderRadius: '50%', background: '#CC0000', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>
        {playing ? '⏸' : '▶'}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>}
        <div onClick={seek} style={{ height: 4, background: 'var(--border)', borderRadius: 2, cursor: 'pointer', position: 'relative' }}>
          <div style={{ height: '100%', background: '#CC0000', borderRadius: 2, width: duration ? `${(progress / duration) * 100}%` : '0%', transition: 'width 0.1s' }} />
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
        {fmt(progress)} / {fmt(duration)}
      </div>
    </div>
  );
}