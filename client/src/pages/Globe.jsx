import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';

const COUNTRY_CENTERS = {
  'United States': [37.09, -95.71], 'China': [35.86, 104.19],
  'United Kingdom': [55.37, -3.43], 'Germany': [51.16, 10.45],
  'France': [46.22, 2.21], 'Japan': [36.20, 138.25],
  'India': [20.59, 78.96], 'Russia': [61.52, 105.31],
  'Brazil': [-14.23, -51.92], 'Canada': [56.13, -106.34],
  'Australia': [-25.27, 133.77], 'South Korea': [35.90, 127.76],
  'Ukraine': [48.37, 31.16], 'Israel': [31.04, 34.85],
  'Iran': [32.42, 53.68], 'Saudi Arabia': [23.88, 45.07],
  'Turkey': [38.96, 35.24], 'Argentina': [-38.41, -63.61],
  'South Africa': [-30.55, 22.93], 'Nigeria': [9.08, 8.67],
  'Mexico': [23.63, -102.55], 'Indonesia': [-0.78, 113.92],
  'Pakistan': [30.37, 69.34], 'Poland': [51.91, 19.14],
  'Italy': [41.87, 12.56], 'Spain': [40.46, -3.74],
  'Egypt': [26.82, 30.80], 'Taiwan': [23.69, 120.96],
  'Singapore': [1.35, 103.81], 'Thailand': [15.87, 100.99],
  'Vietnam': [14.05, 108.27], 'Netherlands': [52.13, 5.29],
};

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

export default function Globe() {
  const containerRef = useRef(null);
  const globeRef = useRef(null);
  const selectedRef = useRef(null); // use ref to avoid stale closure
  const allPostsRef = useRef([]);
  const [countryCounts, setCountryCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Panel state managed separately from globe
  const [panel, setPanel] = useState(null); // { country, posts }

  useEffect(() => {
    api.get('/posts/meta/countries').then(setCountryCounts).catch(() => {});
    api.get('/posts?limit=200').then(d => {
      allPostsRef.current = d.posts || [];
    }).catch(() => {});
  }, []);

  function buildPoints(counts) {
    return Object.entries(counts)
      .filter(([name]) => COUNTRY_CENTERS[name])
      .map(([country, count]) => ({
        country, count,
        lat: COUNTRY_CENTERS[country][0],
        lng: COUNTRY_CENTERS[country][1],
      }));
  }

  function showCountry(name) {
    if (!name) return;
    const posts = allPostsRef.current;
    const matching = posts.filter(p =>
      (p.country_tags || []).some(t =>
        t.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(t.toLowerCase())
      )
    ).sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
    // Use a DOM-level trick to force React to update
    setPanel({ country: name, posts: matching });
  }

  // Store showCountry in ref so globe callbacks always use latest
  const showCountryRef = useRef(showCountry);
  useEffect(() => { showCountryRef.current = showCountry; });

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        await loadScript('https://cdn.jsdelivr.net/npm/three@0.133.1/build/three.min.js');
        await loadScript('https://cdn.jsdelivr.net/npm/globe.gl@2.24.2/dist/globe.gl.min.js');
        if (cancelled || !containerRef.current) return;
        const res = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
        const topo = await res.json();
        if (cancelled || !containerRef.current) return;
        await loadScript('https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js');
        if (cancelled || !containerRef.current) return;
        const countries = window.topojson.feature(topo, topo.objects.countries);
        const GlobeGL = window.Globe || window.GlobeGL;
        if (!GlobeGL) throw new Error('Globe library not found');
        const globe = GlobeGL()(containerRef.current)
          .width(containerRef.current.clientWidth)
          .height(containerRef.current.clientHeight)
          .backgroundColor('#0A0F1E')
          .globeImageUrl('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg')
          .polygonsData(countries.features)
          .polygonCapColor(() => 'rgba(255,255,255,0.04)')
          .polygonSideColor(() => 'rgba(255,255,255,0.02)')
          .polygonStrokeColor(() => 'rgba(255,255,255,0.12)')
          .polygonLabel(({ properties: p }) => `<div style="background:rgba(0,0,0,0.8);color:#fff;padding:5px 10px;border-radius:4px;font-size:12px">${p?.NAME || p?.name || ''}</div>`)
          .onPolygonClick(({ properties: p }) => {
            const name = p?.NAME || p?.name;
            if (name) showCountryRef.current(name);
          })
          .pointsData(buildPoints(countryCounts))
          .pointLat('lat').pointLng('lng')
          .pointAltitude(0.02)
          .pointColor(() => '#FF3333')
          .pointRadius(1.5)
          .pointResolution(12)
          .pointLabel(d => `<div style="background:rgba(0,0,0,0.85);color:#fff;padding:6px 12px;border-radius:6px;font-size:13px"><b>${d.country}</b><br/>${d.count} article${d.count !== 1 ? 's' : ''}</div>`)
          .onPointClick(d => { if (d?.country) showCountryRef.current(d.country); });
        globeRef.current = globe;
        window.addEventListener('resize', () => {
          if (containerRef.current) globe.width(containerRef.current.clientWidth).height(containerRef.current.clientHeight);
        });
        setLoading(false);
      } catch (err) {
        if (!cancelled) { setError(err.message); setLoading(false); }
      }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (globeRef.current) globeRef.current.pointsData(buildPoints(countryCounts));
  }, [countryCounts]);

  // Side panel rendered via portal directly into document.body
  const sidePanel = panel ? createPortal(
    <div style={{
      position: 'fixed', top: 63, right: 0, width: 380,
      height: 'calc(100vh - 63px)', background: '#111827',
      borderLeft: '1px solid rgba(255,255,255,0.15)',
      display: 'flex', flexDirection: 'column',
      zIndex: 99999, boxShadow: '-4px 0 20px rgba(0,0,0,0.5)',
    }}>
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: '#CC0000', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>Coverage</div>
          <div style={{ color: 'white', fontSize: 22, fontFamily: 'var(--serif)', fontWeight: 600 }}>{panel.country}</div>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 5 }}>
            {panel.posts.length} article{panel.posts.length !== 1 ? 's' : ''}
          </div>
        </div>
        <button onClick={() => setPanel(null)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: 'white', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
        {panel.posts.length === 0
          ? <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', paddingTop: 48 }}>No articles about {panel.country} yet.</div>
          : panel.posts.map((post, i) => (
            <Link key={post.id} to={`/post/${post.id}`}
              onClick={() => setPanel(null)}
              style={{ display: 'block', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, padding: '13px 15px', textDecoration: 'none', marginBottom: 10 }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.09)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#CC0000', color: 'white', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
                  {post.published_at ? new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                </span>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.92)', fontSize: 14, fontFamily: 'var(--serif)', lineHeight: 1.45, marginBottom: post.summary ? 7 : 0 }}>{post.title}</div>
              {post.summary && <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 12, lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.summary}</div>}
            </Link>
          ))
        }
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 63px)', background: '#0A0F1E', overflow: 'hidden' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, color: 'white', flexDirection: 'column', gap: 14 }}>
            <div className="spinner" style={{ width: 32, height: 32, borderColor: 'rgba(255,255,255,0.15)', borderTopColor: '#CC0000' }} />
            <span style={{ fontSize: 14, opacity: 0.7 }}>Loading globe…</span>
          </div>
        )}
        {error && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, color: 'white', flexDirection: 'column', gap: 14, padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 14, opacity: 0.75, maxWidth: 420, lineHeight: 1.7 }}>{error}</div>
            <button onClick={() => window.location.reload()} style={{ padding: '8px 20px', background: '#CC0000', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Retry</button>
          </div>
        )}
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        {!loading && !error && (
          <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.4)', fontSize: 12, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
            Drag to rotate · Scroll to zoom · Click a red dot to see articles
          </div>
        )}
        {/* Country list */}
        <div style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(0,0,0,0.65)', borderRadius: 8, padding: '12px 16px', color: 'white', minWidth: 200, maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Coverage</div>
          {Object.entries(countryCounts).length === 0
            ? <div style={{ fontSize: 11, opacity: 0.4 }}>No articles yet</div>
            : Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).map(([country, count]) => (
              <div key={country} onClick={() => showCountry(country)}
                style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', gap: 16, opacity: 0.75, marginBottom: 5, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                onMouseLeave={e => e.currentTarget.style.opacity = 0.75}
              >
                <span>{country}</span>
                <span style={{ color: '#CC0000', fontWeight: 600 }}>{count}</span>
              </div>
            ))
          }
        </div>
      </div>
      {sidePanel}
    </>
  );
}