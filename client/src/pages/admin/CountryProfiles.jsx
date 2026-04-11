import { useState, useEffect } from 'react';
import { api } from '../../utils/api';

const ALL_COUNTRY_NAMES = [
  'Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda','Argentina','Armenia',
  'Australia','Austria','Azerbaijan','Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium',
  'Belize','Benin','Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei',
  'Bulgaria','Burkina Faso','Burundi','Cambodia','Cameroon','Canada','Cape Verde',
  'Central African Republic','Chad','Chile','China','Colombia','Comoros','Congo','Costa Rica',
  'Croatia','Cuba','Cyprus','Czech Republic','Democratic Republic of Congo','Denmark','Djibouti',
  'Dominica','Dominican Republic','Ecuador','Egypt','El Salvador','Equatorial Guinea','Eritrea',
  'Estonia','Eswatini','Ethiopia','Fiji','Finland','France','Gabon','Gambia','Georgia','Germany',
  'Ghana','Greece','Grenada','Guatemala','Guinea','Guinea-Bissau','Guyana','Haiti','Honduras',
  'Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy','Ivory Coast',
  'Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kiribati','Kuwait','Kyrgyzstan','Laos','Latvia',
  'Lebanon','Lesotho','Liberia','Libya','Liechtenstein','Lithuania','Luxembourg','Madagascar',
  'Malawi','Malaysia','Maldives','Mali','Malta','Marshall Islands','Mauritania','Mauritius',
  'Mexico','Micronesia','Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique',
  'Myanmar','Namibia','Nauru','Nepal','Netherlands','New Zealand','Nicaragua','Niger','Nigeria',
  'North Korea','North Macedonia','Norway','Oman','Pakistan','Palau','Palestine','Panama',
  'Papua New Guinea','Paraguay','Peru','Philippines','Poland','Portugal','Qatar','Romania',
  'Russia','Rwanda','Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines',
  'Samoa','San Marino','Sao Tome and Principe','Saudi Arabia','Senegal','Serbia','Seychelles',
  'Sierra Leone','Singapore','Slovakia','Slovenia','Solomon Islands','Somalia','South Africa',
  'South Korea','South Sudan','Spain','Sri Lanka','Sudan','Suriname','Sweden','Switzerland',
  'Syria','Taiwan','Tajikistan','Tanzania','Thailand','Timor-Leste','Togo','Tonga',
  'Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','Tuvalu','Uganda','Ukraine',
  'United Arab Emirates','United Kingdom','United States','Uruguay','Uzbekistan','Vanuatu',
  'Venezuela','Vietnam','Yemen','Zambia','Zimbabwe',
];

export default function CountryProfiles() {
  const [generated, setGenerated] = useState({}); // country -> updated_at
  const [search, setSearch] = useState('');
  const [generating, setGenerating] = useState('');
  const [bulkProgress, setBulkProgress] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/countries/list').then(rows => {
      const map = {};
      rows.forEach(r => { map[r.country_name] = r.updated_at; });
      setGenerated(map);
    }).catch(() => {});
  }, []);

  async function generateOne(country) {
    setGenerating(country);
    try {
      await api.post(`/countries/generate/${encodeURIComponent(country)}`, {});
      setGenerated(prev => ({ ...prev, [country]: new Date().toISOString() }));
      setMsg(`Generated profile for ${country}`);
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg(`Error: ${err.message}`);
    }
    setGenerating('');
  }

  async function bulkGenerate(countries) {
    setBulkProgress({ done: 0, total: countries.length });
    for (let i = 0; i < countries.length; i++) {
      const country = countries[i];
      try {
        await api.post(`/countries/generate/${encodeURIComponent(country)}`, {});
        setGenerated(prev => ({ ...prev, [country]: new Date().toISOString() }));
      } catch (e) { /* skip failures */ }
      setBulkProgress({ done: i + 1, total: countries.length });
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 500));
    }
    setBulkProgress(null);
    setMsg(`Bulk generation complete`);
    setTimeout(() => setMsg(''), 3000);
  }

  const filtered = ALL_COUNTRY_NAMES.filter(c =>
    c.toLowerCase().includes(search.toLowerCase())
  );
  const notGenerated = filtered.filter(c => !generated[c]);
  const hasGenerated = filtered.filter(c => !!generated[c]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 22, marginBottom: 4 }}>Country Profiles</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {Object.keys(generated).length} of {ALL_COUNTRY_NAMES.length} countries have profiles
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => bulkGenerate(notGenerated)}
            disabled={!!bulkProgress || notGenerated.length === 0}
            className="btn btn-outline btn-sm"
          >
            Generate missing ({notGenerated.length})
          </button>
          <button
            onClick={() => bulkGenerate(ALL_COUNTRY_NAMES)}
            disabled={!!bulkProgress}
            className="btn btn-outline btn-sm"
          >
            Regenerate all
          </button>
        </div>
      </div>

      {bulkProgress && (
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 18px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
            <span>Generating profiles… {bulkProgress.done}/{bulkProgress.total}</span>
            <span style={{ color: 'var(--text-muted)' }}>{Math.round(bulkProgress.done / bulkProgress.total * 100)}%</span>
          </div>
          <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#CC0000', width: `${bulkProgress.done / bulkProgress.total * 100}%`, transition: 'width 0.3s' }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            This takes a while — each profile costs one API call. You can leave this page open.
          </div>
        </div>
      )}

      {msg && (
        <div style={{ background: '#F0FFF4', border: '1px solid #C6F6D5', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#276749' }}>
          {msg}
        </div>
      )}

      <input
        placeholder="Search countries…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 14, marginBottom: 16, boxSizing: 'border-box' }}
      />

      {/* Table */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 120px', padding: '10px 18px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <span>Country</span><span>Last generated</span><span></span>
        </div>
        {filtered.map((country, i) => (
          <div key={country} style={{
            display: 'grid', gridTemplateColumns: '1fr 180px 120px',
            padding: '12px 18px', borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
            alignItems: 'center',
          }}
            onMouseEnter={e => e.currentTarget.style.background = '#FAFAF7'}
            onMouseLeave={e => e.currentTarget.style.background = ''}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: generated[country] ? '#48BB78' : '#E2E8F0', flexShrink: 0 }} />
              <span style={{ fontSize: 14 }}>{country}</span>
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {generated[country] ? new Date(generated[country]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
            </span>
            <button
              onClick={() => generateOne(country)}
              disabled={!!generating || !!bulkProgress}
              style={{
                padding: '5px 12px', borderRadius: 4, border: '1px solid var(--border)',
                background: generating === country ? '#CC0000' : 'none',
                color: generating === country ? 'white' : 'var(--text-muted)',
                cursor: 'pointer', fontSize: 12,
              }}
            >
              {generating === country ? 'Generating…' : generated[country] ? 'Regenerate' : 'Generate'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}