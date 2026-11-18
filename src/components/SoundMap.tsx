import React, { useState, useMemo } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { getCode, getNames } from 'country-list';
import { Search, Play, X, MapPin } from 'lucide-react';

interface SoundMapProps {
  t: (key: any) => string;
  onPlaySong: (list: any[], startIndex: number) => void;
  theme: string;
  onCountrySelect: (alpha2: string, countryName: string) => void;
  trendingSongs?: any[];
  isTrendingLoading?: boolean;
}

const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

// Manual mappings for country names that don't match country-list
const countryNameMapping: Record<string, string> = {
  "United States of America": "US",
  "South Korea": "KR",
  "North Korea": "KP",
  "United Kingdom": "GB",
  "Russia": "RU",
  "Vietnam": "VN",
  "Iran": "IR",
  "Syria": "SY",
  "Tanzania": "TZ",
  "Venezuela": "VE",
  "Bolivia": "BO",
  "Taiwan": "TW",
  "Moldova": "MD",
  "Macedonia": "MK",
  "Dem. Rep. Congo": "CD",
  "Congo": "CG",
  "Sudan": "SD",
  "Dominican Rep.": "DO",
  "Bahamas": "BS",
  "Falkland Is.": "FK",
  "Fr. S. Antarctic Lands": "TF",
  "Niger": "NE",
  "Central African Rep.": "CF",
  "Eq. Guinea": "GQ",
  "Palestine": "PS",
  "Gambia": "GM",
  "United Arab Emirates": "AE",
  "Laos": "LA",
  "Turkey": "TR",
  "Netherlands": "NL",
  "Solomon Is.": "SB",
  "Philippines": "PH",
  "Brunei": "BN",
  "Bosnia and Herz.": "BA",
  "S. Sudan": "SS"
};

export const SoundMap: React.FC<SoundMapProps> = ({
  t,
  onPlaySong,
  theme,
  onCountrySelect,
  trendingSongs = [],
  isTrendingLoading = false,
}) => {
  const [selectedCountryName, setSelectedCountryName] = useState<string | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<{ name: string; x: number; y: number } | null>(null);
  const [countryQuery, setCountryQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const allCountries = useMemo(() => {
    const base = getNames().map(name => ({
      name,
      code: getCode(name) || '',
    }));
    const extra = Object.entries(countryNameMapping).map(([name, code]) => ({ name, code }));
    const seen = new Set<string>();
    const merged: { name: string; code: string }[] = [];
    for (const c of [...extra, ...base]) {
      if (!c.code || seen.has(c.name.toLowerCase())) continue;
      seen.add(c.name.toLowerCase());
      merged.push(c);
    }
    return merged.sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return [];
    return allCountries
      .filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q)
      .slice(0, 8);
  }, [countryQuery, allCountries]);

  const handleCountryClick = (geo: any) => {
    const rawName = geo.properties.name;
    const mappedName = countryNameMapping[rawName] || rawName;
    const alpha2 = mappedName.length === 2 ? mappedName : getCode(mappedName);

    setSelectedCountryName(rawName);
    onCountrySelect(alpha2 || '', rawName);
  };

  const handleQuickSelectCountry = (name: string, code: string) => {
    setSelectedCountryName(name);
    setCountryQuery('');
    setIsSearchFocused(false);
    onCountrySelect(code, name);
  };

  const getMapColors = () => {
    if (theme === 'minimalist') return { default: '#e2e8f0', hover: '#cbd5e1', pressed: '#94a3b8', stroke: '#ffffff' };
    if (theme === 'vibrant') return { default: 'rgba(255,255,255,0.2)', hover: 'rgba(255,255,255,0.4)', pressed: 'var(--accent-primary)', stroke: 'transparent' };
    return { default: '#1e293b', hover: 'var(--accent-primary)', pressed: '#4db8ff', stroke: '#0f172a' };
  };

  const colors = getMapColors();

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: theme === 'minimalist' ? '#f8fafc' : 'transparent', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
      {/* Top Left Header */}
      <div style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 10, pointerEvents: 'none' }}>
        <h1 className="story-title" style={{ margin: 0, fontSize: '32px' }}>{t('soundMap') || 'Sound Map'}</h1>
        <p style={{ color: 'var(--text-secondary)', margin: '8px 0 0 0' }}>{t('soundMapInstruction') || 'Select a country on the map to see trending songs!'}</p>

        {selectedCountryName && (
          <div style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '10px', pointerEvents: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: '999px', backdropFilter: 'blur(12px)' }}>
            <MapPin size={14} color="var(--accent-primary)" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{selectedCountryName}</span>
            {!isTrendingLoading && trendingSongs.length > 0 && (
              <button
                onClick={() => onPlaySong(trendingSongs, 0)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  background: 'var(--accent-primary)', color: theme === 'minimalist' ? '#000' : '#fff',
                  border: 'none', borderRadius: '999px', padding: '4px 10px',
                  fontSize: '11px', fontWeight: 700, cursor: 'pointer'
                }}
              >
                <Play size={11} fill="currentColor" /> {t('soundMapPlayTopMix') || 'Play Top Mix'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Top Right Quick Country Search */}
      <div style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 20, width: '240px' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            type="text"
            value={countryQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 180)}
            onChange={(e) => setCountryQuery(e.target.value)}
            placeholder={t('soundMapQuickJump') || 'Quick jump country...'}
            style={{
              width: '100%',
              padding: '8px 30px 8px 32px',
              borderRadius: '999px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              outline: 'none',
              backdropFilter: 'blur(12px)',
            }}
          />
          {countryQuery && (
            <button
              onClick={() => setCountryQuery('')}
              style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {isSearchFocused && filteredCountries.length > 0 && (
          <div style={{
            marginTop: '6px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          }}>
            {filteredCountries.map(c => (
              <div
                key={`${c.code}-${c.name}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleQuickSelectCountry(c.name, c.code);
                }}
                style={{
                  padding: '8px 12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  color: 'var(--text-primary)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span>{c.name}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>{c.code}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hover Tooltip */}
      {hoveredCountry && (
        <div
          style={{
            position: 'fixed',
            left: hoveredCountry.x + 14,
            top: hoveredCountry.y - 12,
            zIndex: 50,
            pointerEvents: 'none',
            background: 'rgba(15, 23, 42, 0.92)',
            color: '#fff',
            padding: '5px 10px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600,
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
            whiteSpace: 'nowrap',
          }}
        >
          {hoveredCountry.name}
        </div>
      )}

      <ComposableMap projection="geoMercator" style={{ width: '100%', height: '100%' }}>
        <ZoomableGroup zoom={1} maxZoom={5} translateExtent={[[0, 0], [800, 600]]}>
          <Geographies geography={geoUrl}>
            {({ geographies }: { geographies: any[] }) =>
              geographies.map((geo: any) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onClick={() => handleCountryClick(geo)}
                  onMouseEnter={(e: React.MouseEvent) => {
                    setHoveredCountry({ name: geo.properties.name, x: e.clientX, y: e.clientY });
                  }}
                  onMouseMove={(e: React.MouseEvent) => {
                    setHoveredCountry({ name: geo.properties.name, x: e.clientX, y: e.clientY });
                  }}
                  onMouseLeave={() => setHoveredCountry(null)}
                  style={{
                    default: {
                      fill: selectedCountryName === geo.properties.name ? 'var(--accent-primary)' : colors.default,
                      stroke: colors.stroke,
                      strokeWidth: 0.5,
                      outline: 'none',
                      transition: 'all 250ms'
                    },
                    hover: {
                      fill: colors.hover,
                      stroke: colors.stroke,
                      strokeWidth: 0.5,
                      outline: 'none',
                      cursor: 'pointer'
                    },
                    pressed: {
                      fill: colors.pressed,
                      stroke: colors.stroke,
                      strokeWidth: 0.5,
                      outline: 'none'
                    }
                  }}
                />
              ))
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
    </div>
  );
};
