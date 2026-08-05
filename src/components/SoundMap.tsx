import React, { useState } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { getCode } from 'country-list';

interface SoundMapProps {
  t: (key: any) => string;
  onPlaySong: (list: any[], startIndex: number) => void;
  theme: string;
  onCountrySelect: (alpha2: string, countryName: string) => void;
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

export const SoundMap: React.FC<SoundMapProps> = ({ t, theme, onCountrySelect }) => {
  const [selectedCountryName, setSelectedCountryName] = useState<string | null>(null);

  const handleCountryClick = (geo: any) => {
    const rawName = geo.properties.name;
    const mappedName = countryNameMapping[rawName] || rawName;
    const alpha2 = mappedName.length === 2 ? mappedName : getCode(mappedName);

    setSelectedCountryName(rawName);
    onCountrySelect(alpha2 || '', rawName);
  };

  const getMapColors = () => {
    if (theme === 'minimalist') return { default: '#e2e8f0', hover: '#cbd5e1', pressed: '#94a3b8', stroke: '#ffffff' };
    if (theme === 'vibrant') return { default: 'rgba(255,255,255,0.2)', hover: 'rgba(255,255,255,0.4)', pressed: 'var(--accent-primary)', stroke: 'transparent' };
    // Default / Dark
    return { default: '#1e293b', hover: 'var(--accent-primary)', pressed: '#4db8ff', stroke: '#0f172a' };
  };

  const colors = getMapColors();

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: theme === 'minimalist' ? '#f8fafc' : 'transparent', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
      
      <div style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 10, pointerEvents: 'none' }}>
        <h1 className="story-title" style={{ margin: 0, fontSize: '32px' }}>{t('soundMap') || 'Sound Map'}</h1>
        <p style={{ color: 'var(--text-secondary)', margin: '8px 0 0 0' }}>{t('soundMapInstruction') || 'Select a country on the map to see trending songs!'}</p>
      </div>

      <ComposableMap projection="geoMercator" style={{ width: '100%', height: '100%' }}>
        <ZoomableGroup zoom={1} maxZoom={5} translateExtent={[[0, 0], [800, 600]]}>
          <Geographies geography={geoUrl}>
            {({ geographies }: { geographies: any[] }) =>
              geographies.map((geo: any) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onClick={() => handleCountryClick(geo)}
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
