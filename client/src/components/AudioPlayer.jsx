import { useState, useRef, useEffect } from 'react';

export default function AudioPlayer({ src, title = '2-minute audio summary' }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onMeta = () => setDuration(audio.duration);
    const onTime = () => {
      setCurrentTime(audio.currentTime);
      setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
    };
    const onEnd = () => setPlaying(false);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
    };
  }, [src]);

  const toggle = () => {
    const audio = audioRef.current;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play(); setPlaying(true); }
  };

  const seek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = ratio * duration;
  };

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ background: '#1A1A1A', borderRadius: 8, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#DDD', fontSize: 13, fontWeight: 500 }}> {title}</span>
        <span style={{ color: '#888', fontSize: 12 }}>{fmt(currentTime)} / {fmt(duration)}</span>
      </div>
      <div onClick={seek} style={{ height: 4, background: '#444', borderRadius: 2, cursor: 'pointer' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: '#CC0000', borderRadius: 2, transition: 'width 0.1s linear' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={toggle} style={{ width: 40, height: 40, borderRadius: '50%', background: '#CC0000', border: 'none', color: 'white', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {playing ? '⏸' : ''}
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#CCC', fontSize: 13 }}>Editor · Audio Commentary</div>
          <div style={{ color: '#666', fontSize: 11 }}>Click to listen · 2-minute briefing</div>
        </div>
        <button onClick={() => { audioRef.current.currentTime = 0; setProgress(0); setPlaying(false); }} style={{ background: 'none', border: 'none', color: '#666', fontSize: 12, cursor: 'pointer' }}>
          ↺
        </button>
      </div>
    </div>
  );
}