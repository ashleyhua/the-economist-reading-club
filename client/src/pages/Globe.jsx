import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';

const ALL_COUNTRIES = {
  'Afghanistan': [33.93, 67.71], 'Albania': [41.15, 20.17], 'Algeria': [28.03, 1.65],
  'Andorra': [42.54, 1.60], 'Angola': [-11.20, 17.87], 'Antigua and Barbuda': [17.06, -61.80],
  'Argentina': [-38.41, -63.61], 'Armenia': [40.07, 45.04], 'Australia': [-25.27, 133.77],
  'Austria': [47.51, 14.55], 'Azerbaijan': [40.14, 47.57], 'Bahamas': [25.03, -77.39],
  'Bahrain': [26.00, 50.55], 'Bangladesh': [23.68, 90.35], 'Barbados': [13.19, -59.54],
  'Belarus': [53.71, 27.95], 'Belgium': [50.50, 4.46], 'Belize': [17.19, -88.49],
  'Benin': [9.30, 2.31], 'Bhutan': [27.51, 90.43], 'Bolivia': [-16.29, -63.58],
  'Bosnia and Herzegovina': [43.91, 17.67], 'Botswana': [-22.32, 24.68], 'Brazil': [-14.23, -51.92],
  'Brunei': [4.53, 114.72], 'Bulgaria': [42.73, 25.48], 'Burkina Faso': [12.36, -1.53],
  'Burundi': [-3.37, 29.91], 'Cambodia': [12.56, 104.99], 'Cameroon': [3.86, 11.51],
  'Canada': [56.13, -106.34], 'Cape Verde': [16.00, -24.01], 'Central African Republic': [6.61, 20.93],
  'Chad': [15.45, 18.73], 'Chile': [-35.67, -71.54], 'China': [35.86, 104.19],
  'Colombia': [4.57, -74.29], 'Comoros': [-11.64, 43.33], 'Congo': [-0.22, 15.82],
  'Costa Rica': [9.74, -83.75], 'Croatia': [45.10, 15.20], 'Cuba': [21.52, -77.78],
  'Cyprus': [35.12, 33.42], 'Czech Republic': [49.81, 15.47], 'Denmark': [56.26, 9.50],
  'Democratic Republic of Congo': [-4.03, 21.75], 'Djibouti': [11.82, 42.59],
  'Dominica': [15.41, -61.37], 'Dominican Republic': [18.73, -70.16], 'Ecuador': [-1.83, -78.18],
  'Egypt': [26.82, 30.80], 'El Salvador': [13.79, -88.89], 'Equatorial Guinea': [1.65, 10.26],
  'Eritrea': [15.17, 39.78], 'Estonia': [58.59, 25.01], 'Eswatini': [-26.52, 31.46],
  'Ethiopia': [9.14, 40.48], 'Fiji': [-17.71, 178.06], 'Finland': [61.92, 25.74],
  'France': [46.22, 2.21], 'Gabon': [-0.80, 11.60], 'Gambia': [13.44, -15.31],
  'Georgia': [42.31, 43.35], 'Germany': [51.16, 10.45], 'Ghana': [7.94, -1.02],
  'Greece': [39.07, 21.82], 'Grenada': [12.11, -61.67], 'Guatemala': [15.78, -90.23],
  'Guinea': [9.94, -11.60], 'Guinea-Bissau': [11.80, -15.18], 'Guyana': [4.86, -58.93],
  'Haiti': [18.97, -72.28], 'Honduras': [15.20, -86.24], 'Hungary': [47.16, 19.50],
  'Iceland': [64.96, -19.02], 'India': [20.59, 78.96], 'Indonesia': [-0.78, 113.92],
  'Iran': [32.42, 53.68], 'Iraq': [33.22, 43.67], 'Ireland': [53.41, -8.24],
  'Israel': [31.04, 34.85], 'Italy': [41.87, 12.56], 'Ivory Coast': [7.54, -5.55],
  'Jamaica': [18.10, -77.29], 'Japan': [36.20, 138.25], 'Jordan': [30.58, 36.23],
  'Kazakhstan': [48.01, 66.92], 'Kenya': [0.02, 37.90], 'Kiribati': [1.87, -157.36],
  'Kuwait': [29.33, 47.58], 'Kyrgyzstan': [41.20, 74.76], 'Laos': [19.85, 102.49],
  'Latvia': [56.87, 24.60], 'Lebanon': [33.85, 35.86], 'Lesotho': [-29.60, 28.23],
  'Liberia': [6.43, -9.43], 'Libya': [26.33, 17.22], 'Liechtenstein': [47.14, 9.52],
  'Lithuania': [55.17, 23.88], 'Luxembourg': [49.81, 6.13], 'Madagascar': [-18.76, 46.87],
  'Malawi': [-13.25, 34.30], 'Malaysia': [4.21, 108.96], 'Maldives': [3.20, 73.22],
  'Mali': [17.57, -3.99], 'Malta': [35.93, 14.37], 'Marshall Islands': [7.13, 171.18],
  'Mauritania': [21.00, -10.94], 'Mauritius': [-20.34, 57.55], 'Mexico': [23.63, -102.55],
  'Micronesia': [7.42, 150.55], 'Moldova': [47.41, 28.36], 'Monaco': [43.73, 7.40],
  'Mongolia': [46.86, 103.84], 'Montenegro': [42.70, 19.37], 'Morocco': [31.79, -7.09],
  'Mozambique': [-18.66, 35.52], 'Myanmar': [21.91, 95.95], 'Namibia': [-22.95, 18.49],
  'Nauru': [-0.52, 166.93], 'Nepal': [28.39, 84.12], 'Netherlands': [52.13, 5.29],
  'New Zealand': [-40.90, 174.88], 'Nicaragua': [12.86, -85.20], 'Niger': [17.60, 8.08],
  'Nigeria': [9.08, 8.67], 'North Korea': [40.34, 127.51], 'North Macedonia': [41.60, 21.74],
  'Norway': [60.47, 8.47], 'Oman': [21.51, 55.92], 'Pakistan': [30.37, 69.34],
  'Palau': [7.51, 134.58], 'Palestine': [31.95, 35.23], 'Panama': [8.53, -80.78],
  'Papua New Guinea': [-6.31, 143.95], 'Paraguay': [-23.44, -58.44], 'Peru': [-9.18, -75.01],
  'Philippines': [12.87, 121.77], 'Poland': [51.91, 19.14], 'Portugal': [39.39, -8.22],
  'Qatar': [25.35, 51.18], 'Romania': [45.94, 24.96], 'Russia': [61.52, 105.31],
  'Rwanda': [-1.94, 29.87], 'Saint Kitts and Nevis': [17.35, -62.78],
  'Saint Lucia': [13.90, -60.97], 'Saint Vincent and the Grenadines': [13.25, -61.19],
  'Samoa': [-13.76, -172.10], 'San Marino': [43.94, 12.45], 'Sao Tome and Principe': [0.19, 6.61],
  'Saudi Arabia': [23.88, 45.07], 'Senegal': [14.49, -14.45], 'Serbia': [44.01, 21.00],
  'Seychelles': [-4.67, 55.49], 'Sierra Leone': [8.46, -11.78], 'Singapore': [1.35, 103.81],
  'Slovakia': [48.66, 19.70], 'Slovenia': [46.15, 14.99], 'Solomon Islands': [-9.64, 160.15],
  'Somalia': [5.15, 46.19], 'South Africa': [-30.55, 22.93], 'South Korea': [35.90, 127.76],
  'South Sudan': [6.87, 31.30], 'Spain': [40.46, -3.74], 'Sri Lanka': [7.87, 80.77],
  'Sudan': [12.86, 30.21], 'Suriname': [3.92, -56.02], 'Sweden': [60.12, 18.64],
  'Switzerland': [46.81, 8.22], 'Syria': [34.80, 38.99], 'Taiwan': [23.69, 120.96],
  'Tajikistan': [38.86, 71.27], 'Tanzania': [-6.36, 34.89], 'Thailand': [15.87, 100.99],
  'Timor-Leste': [-8.87, 125.73], 'Togo': [8.61, 0.82], 'Tonga': [-21.17, -175.20],
  'Trinidad and Tobago': [10.69, -61.22], 'Tunisia': [33.88, 9.53], 'Turkey': [38.96, 35.24],
  'Turkmenistan': [38.97, 59.55], 'Tuvalu': [-7.10, 177.64], 'Uganda': [1.37, 32.29],
  'Ukraine': [48.37, 31.16], 'United Arab Emirates': [23.42, 53.84], 'United Kingdom': [55.37, -3.43],
  'United States': [37.09, -95.71], 'Uruguay': [-32.52, -55.76], 'Uzbekistan': [41.37, 64.58],
  'Vanuatu': [-15.37, 166.96], 'Venezuela': [6.42, -66.58], 'Vietnam': [14.05, 108.27],
  'Yemen': [15.55, 48.51], 'Zambia': [-13.13, 27.84], 'Zimbabwe': [-19.01, 29.15],
};

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

const STATUS_COLOR = { ally: '#4CAF50', neutral: '#9E9E9E', tense: '#FF9800', hostile: '#F44336' };
const STATUS_LABEL = { ally: '盟友', neutral: '中立', tense: '紧张', hostile: '对立' };

function ProfileContent({ profile }) {
  const [section, setSection] = useState('overview');
  const sectionBtn = (id, label) => (
    <button onClick={() => setSection(id)} style={{
      padding: '5px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11,
      background: section === id ? '#CC0000' : 'rgba(255,255,255,0.08)',
      color: 'white', transition: 'background 0.15s',
    }}>{label}</button>
  );
  return (
    <div style={{ color: 'white' }}>
      <div style={{ background: 'rgba(204,0,0,0.12)', border: '1px solid rgba(204,0,0,0.3)', borderRadius: 8, padding: '12px 14px', marginBottom: 14, fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,0.85)' }}>
        {profile.snapshot}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {sectionBtn('overview', '当前议题')}
        {sectionBtn('political', '政治')}
        {sectionBtn('economic', '经济')}
        {sectionBtn('historical', '历史')}
        {sectionBtn('concepts', '概念')}
      </div>
      {section === 'overview' && profile.current_issues?.map((issue, i) => (
        <div key={i} style={{ marginBottom: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '11px 13px' }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 5, color: '#FFD700' }}>{i + 1}. {issue.title}</div>
          <div style={{ fontSize: 12, lineHeight: 1.7, color: 'rgba(255,255,255,0.75)' }}>{issue.description}</div>
        </div>
      ))}
      {section === 'political' && profile.political && (
        <div>
          <div style={{ marginBottom: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '11px 13px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>政治体制</div>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,0.8)' }}>{profile.political.system}</div>
          </div>
          {profile.political.key_actors?.length > 0 && (
            <div style={{ marginBottom: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '11px 13px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>主要政治力量</div>
              {profile.political.key_actors.map((a, i) => <div key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 3 }}>• {a}</div>)}
            </div>
          )}
          {profile.political.foreign_relations?.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '11px 13px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>对外关系</div>
              {profile.political.foreign_relations.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                  <span style={{ flexShrink: 0, fontSize: 10, background: STATUS_COLOR[r.status] || '#9E9E9E', color: 'white', padding: '2px 5px', borderRadius: 3, fontWeight: 600, marginTop: 2 }}>
                    {STATUS_LABEL[r.status] || r.status}
                  </span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: 2 }}>{r.country}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{r.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {section === 'economic' && profile.economic && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            {[['GDP', profile.economic.gdp], ['通胀率', profile.economic.inflation], ['主要出口', profile.economic.key_export]].map(([label, val]) => val && (
              <div key={label} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '9px 11px' }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{val}</div>
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '11px 13px', fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,0.8)' }}>
            {profile.economic.story}
          </div>
        </div>
      )}
      {section === 'historical' && profile.historical?.map((h, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
          <div style={{ flexShrink: 0, width: 44, height: 44, borderRadius: '50%', background: 'rgba(204,0,0,0.2)', border: '1px solid rgba(204,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#CC0000', textAlign: 'center', lineHeight: 1.2 }}>
            {h.year}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'white', marginBottom: 3 }}>{h.event}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{h.significance}</div>
          </div>
        </div>
      ))}
      {section === 'concepts' && profile.concepts?.map((c, i) => (
        <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '11px 13px', marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 5 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{c.term_zh}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>{c.term_en}</span>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>{c.explanation}</div>
        </div>
      ))}
    </div>
  );
}

function CountryPanel({ country, posts, onClose }) {
  const [tab, setTab] = useState('articles');
  const [profile, setProfile] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [profileError, setProfileError] = useState('');

  useEffect(() => { setTab('articles'); setProfile(null); setProfileError(''); }, [country]);

  async function loadProfile() {
    setTab('profile');
    if (profile) return;
    setGenerating(true);
    try {
      const data = await api.get(`/countries/${encodeURIComponent(country)}`);
      if (data.profile) { setProfile(data.profile); }
      else {
        const gen = await api.post(`/countries/generate/${encodeURIComponent(country)}`, {});
        setProfile(gen.profile);
      }
    } catch (err) { setProfileError(err.message); }
    finally { setGenerating(false); }
  }

  const tabBtn = (id, label) => (
    <button onClick={id === 'profile' ? loadProfile : () => setTab(id)} style={{
      flex: 1, padding: '10px 0', background: 'none', border: 'none',
      borderBottom: tab === id ? '2px solid #CC0000' : '2px solid transparent',
      color: tab === id ? 'white' : 'rgba(255,255,255,0.4)',
      cursor: 'pointer', fontSize: 13, fontWeight: tab === id ? 600 : 400,
    }}>{label}</button>
  );

  return createPortal(
    <div style={{ position: 'fixed', top: 'auto', bottom: 0, left: 0, right: 0, width: '100%', maxHeight: '70vh', background: '#111827', borderTop: '1px solid rgba(255,255,255,0.12)', display: 'flex', flexDirection: 'column', zIndex: 99999, boxShadow: '0 -4px 24px rgba(0,0,0,0.5)', borderRadius: '12px 12px 0 0' }}>
      <style>{'.globe-panel-desktop { top: 63px !important; bottom: auto !important; left: auto !important; right: 0 !important; width: 400px !important; max-height: calc(100vh - 63px) !important; border-radius: 0 !important; border-top: none !important; border-left: 1px solid rgba(255,255,255,0.12) !important; }'}</style>
      <div style={{ padding: '18px 20px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ color: '#CC0000', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>Globe</div>
            <div style={{ color: 'white', fontSize: 22, fontFamily: 'var(--serif)', fontWeight: 600 }}>{country}</div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 3 }}>{posts.length} article{posts.length !== 1 ? 's' : ''}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: 'white', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
        <div style={{ display: 'flex' }}>
          {tabBtn('articles', 'Articles')}
          {tabBtn('profile', 'Country Profile')}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
        {tab === 'articles' && (
          posts.length === 0
            ? <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', paddingTop: 60 }}>No articles about {country} yet.</div>
            : posts.map((post, i) => (
              <Link key={post.id} to={`/post/${post.id}`} onClick={onClose}
                style={{ display: 'block', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, padding: '13px 15px', textDecoration: 'none', marginBottom: 10 }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.09)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#CC0000', color: 'white', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{post.published_at ? new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</span>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.92)', fontSize: 14, fontFamily: 'var(--serif)', lineHeight: 1.45, marginBottom: post.summary ? 6 : 0 }}>{post.title}</div>
                {post.summary && <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 12, lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.summary}</div>}
              </Link>
            ))
        )}
        {tab === 'profile' && (
          generating
            ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, paddingTop: 60, color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                <div className="spinner" style={{ width: 28, height: 28, borderColor: 'rgba(255,255,255,0.15)', borderTopColor: '#CC0000' }} />
                Generating profile for {country}…
              </div>
            : profileError
              ? <div style={{ color: '#ff6666', fontSize: 13, padding: 16 }}>{profileError}</div>
              : profile
                ? <ProfileContent profile={profile} />
                : null
        )}
      </div>
    </div>,
    document.body
  );
}

export default function Globe() {
  const containerRef = useRef(null);
  const globeRef = useRef(null);
  const showCountryRef = useRef(null);
  const allPostsRef = useRef([]);
  const [countryCounts, setCountryCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [panel, setPanel] = useState(null);

  useEffect(() => {
    api.get('/posts/meta/countries').then(setCountryCounts).catch(() => {});
    api.get('/posts?limit=200').then(d => { allPostsRef.current = d.posts || []; }).catch(() => {});
  }, []);

  function showCountry(name) {
    if (!name) return;
    const posts = allPostsRef.current.filter(p =>
      (p.country_tags || []).some(t =>
        t.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(t.toLowerCase())
      )
    ).sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
    setTimeout(() => setPanel({ country: name, posts }), 0);
  }

  useEffect(() => { showCountryRef.current = showCountry; });

  function buildPoints() {
    return Object.entries(ALL_COUNTRIES).map(([country, [lat, lng]]) => ({
      country, lat, lng,
      hasArticles: !!(countryCounts[country] && countryCounts[country] > 0),
      count: countryCounts[country] || 0,
    }));
  }

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
          .onPolygonClick(({ properties: p }) => { const n = p?.NAME || p?.name; if (n) showCountryRef.current(n); })
          .pointsData(buildPoints())
          .pointLat('lat').pointLng('lng')
          .pointAltitude(d => d.hasArticles ? 0.02 : 0.006)
          .pointColor(d => d.hasArticles ? '#FF3333' : 'rgba(255,255,255,0.3)')
          .pointRadius(d => d.hasArticles ? 0.6 + Math.min(d.count * 0.15, 0.8) : 0.3)
          .pointResolution(8)
          .pointLabel(d => `<div style="background:rgba(0,0,0,0.85);color:#fff;padding:6px 12px;border-radius:6px;font-size:13px"><b>${d.country}</b>${d.count > 0 ? `<br/>${d.count} article${d.count !== 1 ? 's' : ''}` : '<br/><span style="opacity:0.5;font-size:11px">Click for country profile</span>'}</div>`)
          .onPointClick(d => { if (d?.country) showCountryRef.current(d.country); });
        globeRef.current = globe;
        window.addEventListener('resize', () => {
          if (containerRef.current) globe.width(containerRef.current.clientWidth).height(containerRef.current.clientHeight);
        });
        setLoading(false);
        // Update points now in case countryCounts loaded before globe finished initializing
        if (Object.keys(allPostsRef.current).length > 0 || true) {
          setTimeout(() => {
            if (globeRef.current) {
              globeRef.current.pointsData(buildPoints());
            }
          }, 500);
        }
      } catch (err) {
        if (!cancelled) { setError(err.message); setLoading(false); }
      }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!globeRef.current) return;
    globeRef.current.pointsData(buildPoints());
  }, [countryCounts]);

  return (
    <>
      <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 63px)', background: '#0A0F1E', overflow: 'hidden' }}>
        {loading && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, color: 'white', flexDirection: 'column', gap: 14 }}>
          <div className="spinner" style={{ width: 32, height: 32, borderColor: 'rgba(255,255,255,0.15)', borderTopColor: '#CC0000' }} />
          <span style={{ fontSize: 14, opacity: 0.7 }}>Loading globe…</span>
        </div>}
        {error && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, color: 'white', flexDirection: 'column', gap: 14, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 14, opacity: 0.75 }}>{error}</div>
          <button onClick={() => window.location.reload()} style={{ padding: '8px 20px', background: '#CC0000', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Retry</button>
        </div>}
        <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: 300 }} />
        {!loading && !error && <>
          <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.4)', fontSize: 12, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
            Drag to rotate · Scroll to zoom · Click any dot for details
          </div>
          <div style={{ position: 'absolute', bottom: 50, right: 20, display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#FF3333' }} />
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>Has articles</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }} />
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>Profile available</span>
            </div>
          </div>
          <div style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(0,0,0,0.65)', borderRadius: 8, padding: '12px 16px', color: 'white', minWidth: 200, maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Articles by country</div>
            {Object.entries(countryCounts).length === 0
              ? <div style={{ fontSize: 11, opacity: 0.4 }}>No articles yet</div>
              : Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).map(([country, count]) => (
                <div key={country} onClick={() => showCountry(country)}
                  style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', gap: 16, opacity: 0.75, marginBottom: 5, cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = 0.75}
                >
                  <span>{country}</span><span style={{ color: '#CC0000', fontWeight: 600 }}>{count}</span>
                </div>
              ))}
          </div>
        </>}
      </div>
      {panel && <CountryPanel country={panel.country} posts={panel.posts} onClose={() => setPanel(null)} />}
    </>
  );
}