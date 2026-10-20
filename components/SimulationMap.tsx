'use client';
import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { Threat } from '@/types';
import { Weather, Environment } from '@/types';
import { CLASSIFIED_MILITARY_BASES, type ClassifiedBase } from '@/lib/indiaBoundary';

export type MapMode = 'hybrid' | 'satellite' | 'normal' | 'terrain' | 'radar';

const GOOGLE_TILE_URLS: Record<MapMode, string> = {
  satellite: 'https://mt1.google.com/vt/lyrs=s&hl=en&gl=IN&x={x}&y={y}&z={z}',
  hybrid:    'https://mt1.google.com/vt/lyrs=y&hl=en&gl=IN&x={x}&y={y}&z={z}',
  normal:    'https://mt1.google.com/vt/lyrs=m&hl=en&gl=IN&x={x}&y={y}&z={z}',
  terrain:   'https://mt1.google.com/vt/lyrs=p&hl=en&gl=IN&x={x}&y={y}&z={z}',
  radar:     'https://mt1.google.com/vt/lyrs=y&hl=en&gl=IN&x={x}&y={y}&z={z}',
};

const BASE_CATEGORY_STYLE: Record<ClassifiedBase['category'], { icon: string; color: string; tag: string }> = {
  airbase: { icon: '✈', color: '#38bdf8', tag: 'IAF AIRBASE' },
  nuclear: { icon: '☢', color: '#ef4444', tag: 'NUCLEAR / SFC' },
  naval:   { icon: '⚓', color: '#60a5fa', tag: 'NAVAL / SSBN' },
  missile: { icon: '🚀', color: '#f97316', tag: 'DRDO / ISRO' },
  command: { icon: '🛡', color: '#fbbf24', tag: 'C4ISR COMMAND' },
  oil:     { icon: '🛢', color: '#f59e0b', tag: 'STRATEGIC SPR' },
};

interface Props {
  threats: Threat[];
  onThreatClick: (threat: Threat) => void;
  nightMode: boolean;
  targetLat: number;
  targetLng: number;
  targetName?: string;
  weather?: Weather;
  environment?: Environment;
  satellite?: boolean;
  spawnSectors?: Array<{ min: number; max: number }>;
  selectedThreatId?: string | null;
  activeEngagement?: { lat: number; lng: number; cm: string } | null;
}

interface CursorInfo {
  brg: number;
  rngKm: number;
  lat: number;
  lng: number;
}

/** Great-circle destination point at distM metres on bearing brgDeg from (lat,lng) */
function geoOffset(lat: number, lng: number, distM: number, brgDeg: number): [number, number] {
  const R = 6371000;
  const d = distM / R;
  const b = (brgDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lng * Math.PI) / 180;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(b) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
    );
  return [(lat2 * 180) / Math.PI, (lon2 * 180) / Math.PI];
}

export default function SimulationMap({
  threats,
  onThreatClick,
  nightMode,
  targetLat,
  targetLng,
  targetName = '',
  weather = 'clear',
  environment = 'open',
  satellite = true,
  spawnSectors = [],
  selectedThreatId = null,
  activeEngagement = null,
}: Props) {
  const mapRef       = useRef<any>(null);
  const markersRef   = useRef<Map<string, any>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const onThreatClickRef = useRef(onThreatClick);
  const tileLayerRef = useRef<any>(null);
  const classifiedLayerRef = useRef<any>(null);

  const [mapMode, setMapMode] = useState<MapMode>('hybrid');
  const [showClassifiedBases, setShowClassifiedBases] = useState(true);
  const [selectedBase, setSelectedBase] = useState<ClassifiedBase | null>(null);
  const [cursorInfo, setCursorInfo] = useState<CursorInfo | null>(null);
  const [radarPx, setRadarPx] = useState<{ x: number; y: number; r: number } | null>(null);

  const trailsRef    = useRef<Map<string, [number, number][]>>(new Map());
  const trailLinesRef = useRef<Map<string, any>>(new Map());
  const predLinesRef = useRef<Map<string, any>>(new Map());
  const threatsRef   = useRef<Threat[]>([]);
  // Composite icon signature → only rebuild Leaflet DOM when something meaningful changes
  const iconStateRef = useRef<Map<string, string>>(new Map());
  const slewLineRef  = useRef<any>(null);
  const engGroupRef  = useRef<any>(null);

  useEffect(() => {
    onThreatClickRef.current = onThreatClick;
  }, [onThreatClick]);

  // ── Map initialisation ─────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const L = require('leaflet');

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      maxZoom: 20,
      minZoom: 4,
    }).setView([targetLat, targetLng], 8);

    L.control.zoom({ position: 'bottomleft' }).addTo(map);

    // Google Maps Official India (gl=IN) tile layer — native Survey of India borders, zero broken polygons
    const tile = L.tileLayer(GOOGLE_TILE_URLS[mapMode], {
      maxZoom: 20,
      className: `mod-tiles-${mapMode}`,
    });
    tile.addTo(map);
    tileLayerRef.current = tile;

    // ── Classified / Confidential Indian Military Bases Layer (No Common Civilian Places) ──
    const classifiedGroup = L.layerGroup().addTo(map);
    classifiedLayerRef.current = classifiedGroup;

    CLASSIFIED_MILITARY_BASES.forEach(base => {
      // Skip if right on top of the active mission's primary target marker (<12km)
      const dLat = Math.abs(base.lat - targetLat);
      const dLng = Math.abs(base.lng - targetLng);
      if (dLat < 0.08 && dLng < 0.08) return;

      const st = BASE_CATEGORY_STYLE[base.category];
      const m = L.marker([base.lat, base.lng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="display:flex;align-items:center;gap:4px;background:rgba(3,10,20,0.88);border:1px solid ${st.color}88;border-left:3px solid ${st.color};padding:2px 6px;border-radius:4px;font-family:monospace;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.75);cursor:pointer;">
            <span style="font-size:10px;">${st.icon}</span>
            <div>
              <div style="font-size:8.5px;font-weight:900;color:#f8fafc;letter-spacing:0.04em;line-height:1.1;">${base.name}</div>
              <div style="font-size:7px;font-weight:700;color:${st.color};letter-spacing:0.06em;line-height:1.1;">🔒 ${base.code} · ${base.lat.toFixed(4)}°N, ${base.lng.toFixed(4)}°E</div>
            </div>
          </div>`,
          iconSize: [180, 26],
          iconAnchor: [12, 13],
        }),
      });
      m.on('click', () => {
        setSelectedBase(base);
      });
      m.addTo(classifiedGroup);
    });

    // ── Precision WGS-84 1° × 1° Latitude / Longitude Graticule Grid ────────
    const minLatG = Math.floor(targetLat - 5);
    const maxLatG = Math.ceil(targetLat + 5);
    const minLngG = Math.floor(targetLng - 6);
    const maxLngG = Math.ceil(targetLng + 6);
    for (let latG = minLatG; latG <= maxLatG; latG += 1) {
      L.polyline([[latG, minLngG], [latG, maxLngG]], {
        color: '#00ff88',
        weight: 0.5,
        opacity: 0.16,
        dashArray: '2 6',
        interactive: false,
      }).addTo(map);
      L.marker([latG, targetLng - 3.2], {
        icon: L.divIcon({
          className: '',
          html: `<span style="font-family:monospace;font-size:8px;color:rgba(0,255,136,0.42);white-space:nowrap;">${latG.toFixed(2)}°N</span>`,
          iconSize: [48, 10],
          iconAnchor: [24, 5],
        }),
        interactive: false,
      }).addTo(map);
    }
    for (let lngG = minLngG; lngG <= maxLngG; lngG += 1) {
      L.polyline([[minLatG, lngG], [maxLatG, lngG]], {
        color: '#00ff88',
        weight: 0.5,
        opacity: 0.16,
        dashArray: '2 6',
        interactive: false,
      }).addTo(map);
      L.marker([targetLat + 2.6, lngG], {
        icon: L.divIcon({
          className: '',
          html: `<span style="font-family:monospace;font-size:8px;color:rgba(0,255,136,0.42);white-space:nowrap;">${lngG.toFixed(2)}°E</span>`,
          iconSize: [48, 10],
          iconAnchor: [24, 5],
        }),
        interactive: false,
      }).addTo(map);
    }

    // ── Target zone ──────────────────────────────────────────────────────────
    L.circle([targetLat, targetLng], {
      radius: 50000,
      color: '#ef4444', fillColor: '#ef4444',
      fillOpacity: 0.10, weight: 2, dashArray: '6 4',
    }).addTo(map);

    // ── WEZ range rings with zone colours ───────────────────────────────────
    const RING_ZONES = [
      { km: 300, color: 'rgba(0,255,136,0.18)',   label: '300KM · EARLY WARNING',  lc: 'rgba(0,255,136,0.55)'   },
      { km: 150, color: 'rgba(59,130,246,0.28)',  label: '150KM · EW/SOFT-KILL',   lc: 'rgba(96,165,250,0.70)'  },
      { km:  75, color: 'rgba(245,158,11,0.30)',  label:  '75KM · KINETIC WEZ',    lc: 'rgba(251,191,36,0.75)'  },
      { km:  25, color: 'rgba(239,68,68,0.38)',   label:  '25KM · TERMINAL',       lc: 'rgba(252,165,165,0.85)' },
    ];
    RING_ZONES.forEach(({ km, color, label, lc }) => {
      L.circle([targetLat, targetLng], {
        radius: km * 1000,
        color, fillColor: 'transparent',
        weight: 1, dashArray: '3 8', fillOpacity: 0, interactive: false,
      }).addTo(map);
      const labelPos = geoOffset(targetLat, targetLng, km * 1000, 92);
      L.marker(labelPos, {
        icon: L.divIcon({
          className: '',
          html: `<span style="font-size:9px;color:${lc};font-family:monospace;white-space:nowrap;font-weight:700;">${label}</span>`,
          iconSize: [140, 10], iconAnchor: [0, 5],
        }),
        interactive: false,
      }).addTo(map);
    });

    // ── Polar azimuth radials (12 × 30°) to outer ring ─────────────────────
    const OUTER_M = 300000;
    for (let brg = 0; brg < 360; brg += 30) {
      const endpoint = geoOffset(targetLat, targetLng, OUTER_M, brg);
      const isCardinal = brg % 90 === 0;
      L.polyline([[targetLat, targetLng], endpoint], {
        color: '#00ff88',
        weight: isCardinal ? 1 : 0.75,
        opacity: isCardinal ? 0.28 : 0.15,
        dashArray: isCardinal ? undefined : '4, 6',
        interactive: false,
      }).addTo(map);
    }

    // ── Azimuth degree labels at 300km perimeter ────────────────────────────
    const AZ_LABELS: Record<number, string> = {
      0: '000° N', 30: '030°',  60: '060°',
      90: '090° E', 120: '120°', 150: '150°',
      180: '180° S', 210: '210°', 240: '240°',
      270: '270° W', 300: '300°', 330: '330°',
    };
    for (let brg = 0; brg < 360; brg += 30) {
      const pos = geoOffset(targetLat, targetLng, OUTER_M * 1.045, brg);
      L.marker(pos, {
        icon: L.divIcon({
          className: '',
          html: `<span style="font-family:monospace;font-size:9px;color:rgba(0,255,136,0.50);white-space:nowrap;">${AZ_LABELS[brg]}</span>`,
          iconSize: [52, 10], iconAnchor: [26, 5],
        }),
        interactive: false,
      }).addTo(map);
    }

    // ── 36 compass bezel tick marks every 10° around outer ring ────────────
    for (let brg = 0; brg < 360; brg += 10) {
      const inner = geoOffset(targetLat, targetLng, OUTER_M * 0.974, brg);
      const outer = geoOffset(targetLat, targetLng, OUTER_M * 1.000, brg);
      L.polyline([inner, outer], {
        color: '#00ff88',
        weight: brg % 30 === 0 ? 1 : 0.5,
        opacity: brg % 30 === 0 ? 0.38 : 0.18,
        interactive: false,
      }).addTo(map);
    }

    // ── Defended asset marker ────────────────────────────────────────────────
    L.marker([targetLat, targetLng], {
      icon: L.divIcon({
        className: '',
        html: `<div style="position:relative;">
          <div style="width:10px;height:10px;border:2px solid #ef4444;border-radius:50%;box-shadow:0 0 10px #ef4444;"></div>
          <div style="position:absolute;top:3px;left:3px;width:4px;height:4px;background:#ef4444;border-radius:50%;"></div>
          <div style="position:absolute;top:-22px;left:10px;font-size:8px;color:#ef4444;font-family:monospace;font-weight:800;white-space:nowrap;letter-spacing:0.06em;background:rgba(3,10,20,0.82);padding:1px 5px;border-radius:3px;border:1px solid rgba(239,68,68,0.4);">🎯 ${targetName ? targetName.toUpperCase() : 'DEFENDED ASSET'} [${targetLat.toFixed(4)}°N, ${targetLng.toFixed(4)}°E]</div>
        </div>`,
        iconSize: [0, 0],
        iconAnchor: [5, 5],
      }),
    }).addTo(map);

    // ── Protected Facility Sub-Asset Markers ────────────────────────────────
    const tn = targetName.toLowerCase();
    type SubAsset = { icon: string; label: string };
    let subAssets: SubAsset[];
    if (tn.includes('atomic') || tn.includes('kalpakkam') || tn.includes('pokhran') || tn.includes('nuclear')) {
      subAssets = [
        { icon: '☢', label: 'REACTOR DOME' },
        { icon: '⚡', label: '400kV SWITCHYARD' },
        { icon: '💧', label: 'COOLING TOWERS' },
      ];
    } else if (tn.includes('ins') || tn.includes('dwarka') || tn.includes('pangong') || tn.includes('port') || tn.includes('naval') || tn.includes('carrier') || tn.includes('okha') || tn.includes('mundra') || tn.includes('kandla')) {
      subAssets = [
        { icon: '⚓', label: 'FLAGSHIP PIER' },
        { icon: '🛡', label: 'BARAK-8 SAM SITE' },
        { icon: '⛽', label: 'FLEET FUEL DEPOT' },
      ];
    } else if (tn.includes('delhi') || tn.includes('golden temple') || tn.includes('srinagar') || tn.includes('chandigarh') || tn.includes('palam') || tn.includes('central vista') || tn.includes('hindon') || tn.includes('vip') || tn.includes('rashtrapati')) {
      subAssets = [
        { icon: '🏛', label: 'VVIP ENCLAVE' },
        { icon: '👥', label: 'CIVILIAN SECTOR' },
        { icon: '🚁', label: 'VIP HELIPAD' },
      ];
    } else if (tn.includes('dam') || tn.includes('uri') || tn.includes('galwan') || tn.includes('dbo') || tn.includes('gurez') || tn.includes('siachen') || tn.includes('rezang') || tn.includes('kupwara') || tn.includes('tangdhar')) {
      subAssets = [
        { icon: '⛰', label: 'RIDGE RADAR SITE' },
        { icon: '🌉', label: 'GORGE / BRIDGE' },
        { icon: '🪖', label: 'AMMO BUNKER' },
      ];
    } else if (tn.includes('refinery') || tn.includes('oil') || tn.includes('tanker') || tn.includes('rig') || tn.includes('fuel farm') || tn.includes('lpg') || tn.includes('crude') || tn.includes('jamnagar') || tn.includes('bhatinda') || tn.includes('hmel')) {
      subAssets = [
        { icon: '🛢', label: 'CRUDE DISTILLATION UNIT' },
        { icon: '🔥', label: 'LPG SPHERE TANKS' },
        { icon: '⚡', label: 'PIPELINE MANIFOLD' },
      ];
    } else if (tn.includes('bridge') || tn.includes('tunnel') || tn.includes('rail') || tn.includes('barrage') || tn.includes('headworks') || tn.includes('railhead') || tn.includes('siding') || tn.includes('chenab') || tn.includes('beas') || tn.includes('kathua') || tn.includes('reasi')) {
      subAssets = [
        { icon: '🌉', label: 'MAIN ARCH SPAN' },
        { icon: '🛤', label: 'MILITARY RAIL SIDING' },
        { icon: '⚙', label: 'FLOODGATE HYDRAULICS' },
      ];
    } else {
      subAssets = [
        { icon: '✈', label: 'RUNWAY 09/27' },
        { icon: '🛩', label: 'FIGHTER BLAST PENS' },
        { icon: '⛽', label: 'FUEL FARM' },
      ];
    }
    const SUB_BEARINGS = [45, 165, 285];
    subAssets.forEach((sa, i) => {
      const pos = geoOffset(targetLat, targetLng, 18000, SUB_BEARINGS[i]);
      L.marker(pos, {
        icon: L.divIcon({
          className: '',
          html: `<div style="font-size:9px;color:#fbbf24;font-family:monospace;font-weight:700;white-space:nowrap;text-shadow:0 0 6px rgba(251,191,36,0.6);text-align:center;">
            <div style="font-size:11px;">${sa.icon}</div>
            <div style="margin-top:1px;">${sa.label}</div>
          </div>`,
          iconSize: [80, 22], iconAnchor: [40, 11],
        }),
        interactive: false,
      }).addTo(map);
    });

    // (Generic civilian terrain labels removed — only classified military bases are highlighted)

    // ── Live cursor BRG/RNG readout ──────────────────────────────────────────
    map.on('mousemove', (e: any) => {
      const cLat = e.latlng.lat as number;
      const cLng = e.latlng.lng as number;
      const toRad = (x: number) => (x * Math.PI) / 180;
      const dLat = toRad(cLat - targetLat);
      const dLng = toRad(cLng - targetLng);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(targetLat)) * Math.cos(toRad(cLat)) * Math.sin(dLng / 2) ** 2;
      const rngKm = 2 * 6371 * Math.asin(Math.sqrt(a));
      const y = Math.sin(toRad(cLng - targetLng)) * Math.cos(toRad(cLat));
      const x =
        Math.cos(toRad(targetLat)) * Math.sin(toRad(cLat)) -
        Math.sin(toRad(targetLat)) * Math.cos(toRad(cLat)) * Math.cos(toRad(cLng - targetLng));
      const brg = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
      setCursorInfo({ brg, rngKm, lat: cLat, lng: cLng });
    });
    map.on('mouseout', () => setCursorInfo(null));

    // ── Quarantine Capture LZ (GNSS Spoof diversion destination) ────────────
    const lzPos = geoOffset(targetLat, targetLng, 65000, 315);
    L.circle(lzPos, {
      radius: 12000,
      color: '#06b6d4', fillColor: 'rgba(6,182,212,0.06)',
      weight: 1.5, dashArray: '5 6', fillOpacity: 1, interactive: false,
    }).addTo(map);
    L.marker(lzPos, {
      icon: L.divIcon({
        className: '',
        html: `<span style="font-size:9px;color:#06b6d4;font-family:monospace;font-weight:700;white-space:nowrap;letter-spacing:0.06em;text-shadow:0 0 6px rgba(6,182,212,0.5);">⬡ CAPTURE LZ</span>`,
        iconSize: [90, 10], iconAnchor: [45, 5],
      }),
      interactive: false,
    }).addTo(map);

    // ── Threat Approach Sector Corridors (red/amber wedges) ─────────────────
    if (spawnSectors && spawnSectors.length > 0) {
      const OUTER_M = 300000;
      spawnSectors.forEach((sector, si) => {
        const range = sector.max > sector.min
          ? sector.max - sector.min
          : sector.max + 360 - sector.min;
        // Build polygon: target → arc along outer ring → back to target
        const steps = Math.max(6, Math.round(range / 8));
        const arcPts: [number, number][] = [];
        for (let i = 0; i <= steps; i++) {
          const brg = (sector.min + (range * i) / steps) % 360;
          arcPts.push(geoOffset(targetLat, targetLng, OUTER_M, brg));
        }
        const poly = [[targetLat, targetLng], ...arcPts, [targetLat, targetLng]];
        L.polygon(poly as [number, number][], {
          color: si === 0 ? '#ef4444' : '#f97316',
          fillColor: si === 0 ? 'rgba(239,68,68,0.10)' : 'rgba(249,115,22,0.10)',
          weight: 1.5, dashArray: '6 4', fillOpacity: 1, interactive: false,
        }).addTo(map);
        // Label at mid-arc
        const midBrg = (sector.min + range / 2) % 360;
        const labelPos = geoOffset(targetLat, targetLng, OUTER_M * 0.62, midBrg);
        L.marker(labelPos, {
          icon: L.divIcon({
            className: '',
            html: `<span style="font-size:8px;color:#ef4444;font-family:monospace;font-weight:800;letter-spacing:0.1em;white-space:nowrap;text-shadow:0 0 6px rgba(239,68,68,0.6);">⚠ THREAT CORRIDOR ${si + 1}</span>`,
            iconSize: [130, 10], iconAnchor: [65, 5],
          }),
          interactive: false,
        }).addTo(map);
      });
    }

    // ── Environment-Specific Tactical Overlays ───────────────────────────────
    if (environment === 'mountain') {
      // 3–4 dashed cyan terrain masking ridge / valley corridors
      const ridges = [
        { brg: 25,  dist: 0.42, span: 80,  elev: '4 800M' },
        { brg: 78,  dist: 0.55, span: 65,  elev: '5 200M' },
        { brg: 130, dist: 0.35, span: 50,  elev: '3 900M' },
        { brg: 200, dist: 0.48, span: 70,  elev: '4 400M' },
      ];
      ridges.forEach(r => {
        const RIDGE_M = OUTER_M * r.dist;
        const pts: [number, number][] = [];
        for (let i = -Math.floor(r.span / 2); i <= Math.floor(r.span / 2); i += 8) {
          pts.push(geoOffset(targetLat, targetLng, RIDGE_M, (r.brg + i + 360) % 360));
        }
        if (pts.length > 1) {
          L.polyline(pts, { color: '#06b6d4', weight: 1.5, opacity: 0.55, dashArray: '8 5', interactive: false }).addTo(map);
          L.marker(pts[Math.floor(pts.length / 2)], {
            icon: L.divIcon({
              className: '',
              html: `<span style="font-size:8px;color:#06b6d4;font-family:monospace;font-weight:700;white-space:nowrap;text-shadow:0 0 4px rgba(6,182,212,0.5);">▲ RIDGE / ELEV ${r.elev}M ASL — RADAR SHADOW</span>`,
              iconSize: [180, 10], iconAnchor: [90, 5],
            }),
            interactive: false,
          }).addTo(map);
        }
      });
    } else if (environment === 'coastal') {
      // 12 NM territorial waters circle
      const NM_12_M = 22224;
      L.circle([targetLat, targetLng], {
        radius: NM_12_M,
        color: '#3b82f6', fillColor: 'rgba(59,130,246,0.06)',
        weight: 1.5, dashArray: '10 6', fillOpacity: 1, interactive: false,
      }).addTo(map);
      L.marker(geoOffset(targetLat, targetLng, NM_12_M, 90), {
        icon: L.divIcon({
          className: '',
          html: `<span style="font-size:8px;color:#3b82f6;font-family:monospace;font-weight:700;white-space:nowrap;">12 NM MARITIME EXCLUSION ZONE</span>`,
          iconSize: [180, 10], iconAnchor: [0, 5],
        }),
        interactive: false,
      }).addTo(map);
      // Naval shipping lane (SW-NE diagonal)
      const laneA = geoOffset(targetLat, targetLng, 180000, 210);
      const laneB = geoOffset(targetLat, targetLng, 200000, 30);
      L.polyline([laneA, laneB], { color: '#3b82f6', weight: 2, opacity: 0.40, dashArray: '14 8', interactive: false }).addTo(map);
      const laneMid = geoOffset(targetLat, targetLng, 60000, 30);
      L.marker(laneMid, {
        icon: L.divIcon({
          className: '',
          html: `<span style="font-size:8px;color:#60a5fa;font-family:monospace;font-weight:700;white-space:nowrap;">⚓ NAVAL SHIPPING LANE</span>`,
          iconSize: [140, 10], iconAnchor: [70, 5],
        }),
        interactive: false,
      }).addTo(map);
    } else if (environment === 'urban' || environment === 'critical-infrastructure') {
      // Inner red hexagon — No-Fly Red Zone / Civil Air Corridor deconfliction box
      const HEX_M = 25000;
      const hexPts: [number, number][] = [];
      for (let i = 0; i < 6; i++) {
        hexPts.push(geoOffset(targetLat, targetLng, HEX_M, i * 60));
      }
      L.polygon([...hexPts, hexPts[0]], {
        color: environment === 'critical-infrastructure' ? '#f59e0b' : '#ef4444',
        fillColor: environment === 'critical-infrastructure' ? 'rgba(245,158,11,0.05)' : 'rgba(239,68,68,0.05)',
        weight: 1.5, dashArray: '5 4', fillOpacity: 1, interactive: false,
      }).addTo(map);
      L.marker(geoOffset(targetLat, targetLng, HEX_M * 1.12, 0), {
        icon: L.divIcon({
          className: '',
          html: `<span style="font-size:8px;color:${environment === 'critical-infrastructure' ? '#f59e0b' : '#ef4444'};font-family:monospace;font-weight:800;white-space:nowrap;">${environment === 'critical-infrastructure' ? '⚡ RESTRICTED AIRSPACE — STRATEGIC ASSET' : '⛔ NO-FLY RED ZONE — CIVIL AIR CORRIDOR'}</span>`,
          iconSize: [220, 10], iconAnchor: [110, 5],
        }),
        interactive: false,
      }).addTo(map);
    }

    // ── Engagement layer group (cleared per CM deployment) ──────────────────
    engGroupRef.current = L.layerGroup().addTo(map);

    // ── Geo-pin radar sweep: recalculate CSS position on every view change ───
    const updateRadarSweepPos = () => {
      const centerPt = map.latLngToContainerPoint([targetLat, targetLng]);
      const edgeLatLng = geoOffset(targetLat, targetLng, 300000, 0);
      const edgePt = map.latLngToContainerPoint(edgeLatLng);
      const radiusPx = Math.max(40, Math.hypot(edgePt.x - centerPt.x, edgePt.y - centerPt.y));
      setRadarPx({ x: centerPt.x, y: centerPt.y, r: radiusPx });
    };
    updateRadarSweepPos();
    map.on('move zoom viewreset resize', updateRadarSweepPos);

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      trailsRef.current.clear();
      trailLinesRef.current.clear();
      predLinesRef.current.clear();
      iconStateRef.current.clear();
      engGroupRef.current = null;
    };
  }, [targetLat, targetLng, targetName, environment]);

  // ── Sync threat markers + trails ──────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    const L = require('leaflet');

    const nonNeutralized = threats.filter(t => !t.neutralized);
    threatsRef.current = nonNeutralized;
    const activeIds = new Set(nonNeutralized.map(t => t.id));

    // Remove neutralised markers
    markersRef.current.forEach((marker, id) => {
      if (!activeIds.has(id)) {
        mapRef.current.removeLayer(marker);
        markersRef.current.delete(id);
        trailsRef.current.delete(id);
        iconStateRef.current.delete(id);
      }
    });
    trailLinesRef.current.forEach((poly, id) => {
      if (!activeIds.has(id)) { mapRef.current.removeLayer(poly); trailLinesRef.current.delete(id); }
    });
    predLinesRef.current.forEach((poly, id) => {
      if (!activeIds.has(id)) { mapRef.current.removeLayer(poly); predLinesRef.current.delete(id); }
    });

    nonNeutralized.forEach(threat => {
      // ── Metrics ────────────────────────────────────────────────────────────
      const distDeg = Math.sqrt(
        (threat.targetLat - threat.lat) ** 2 + (threat.targetLng - threat.lng) ** 2,
      );
      const distKm    = (distDeg * 111).toFixed(1);
      const etaSec    = threat.speed > 0 ? Math.max(1, Math.round((distDeg / threat.speed) * 0.2)) : 99;
      const etaBucket = Math.floor(etaSec / 2) * 2;
      const hdgBucket = Math.round(threat.heading / 5) * 5;
      // Bucket distKm to 1km precision to prevent icon rebuild every frame
      const distBucket = Math.round(distDeg * 111);
      const isSel = threat.id === selectedThreatId;
      const isGhost = !!(threat.isGhosting && !threat.detected);
      const isSprint = !!threat.sprintActive;
      const isSwarm = threat.flightProfile === 'swarm-cluster';
      const sig = `${threat.detected}-${threat.type}-${threat.threatRating}-${hdgBucket}-${etaBucket}-${distBucket}-${isSel ? 'SEL' : ''}-${isGhost ? 'G' : ''}-${isSprint ? 'SP' : ''}`;

      // ── ATC phosphor colour ────────────────────────────────────────────────
      const color = isGhost
        ? 'rgba(200,200,200,0.35)'
        : threat.detected
          ? etaSec < 12 ? '#ff3344' : '#00e5ff'
          : etaSec < 12 ? '#ff3344' : etaSec < 25 ? '#ffaa00' : '#00ff88';

      const trackCode = `TRK-${threat.id.slice(-3).toUpperCase()}`;

      // ── Velocity leader line (26px, rotates from bottom-centre at (22,22)) ─
      const velLeader = `<div style="position:absolute;top:-4px;left:21.25px;width:1.5px;height:26px;
        background:${color};transform-origin:50% 100%;transform:rotate(${threat.heading}deg);
        pointer-events:none;opacity:0.9;"></div>`;

      // ── Primary/secondary target reticle ────────────────────────────────────
      const slewGlow = isSel ? `box-shadow:0 0 14px #00e5ff,0 0 4px #00e5ff;` : '';
      const reticle = threat.detected
        ? `<div style="position:absolute;top:15px;left:15px;width:14px;height:14px;
             border:2px solid ${isSel ? '#00e5ff' : color};${slewGlow}
             transform:rotate(45deg);background:rgba(0,20,40,0.75);pointer-events:none;"></div>`
        : `<div style="position:absolute;top:16px;left:16px;width:12px;height:12px;
             border:1.5px solid ${color};background:rgba(0,20,10,0.75);pointer-events:none;">
             <div style="position:absolute;top:3.5px;left:3.5px;width:3px;height:3px;
               border-radius:50%;background:${color};"></div>
           </div>`;

      // ── Offset data block with diagonal leader line ──────────────────────────
      const altStr  = `A${String(Math.round(threat.altitude / 10)).padStart(3, '0')}`;
      const etaStr  = etaSec < 99 ? `${etaSec}S` : '--';
      const status  = isGhost ? '👻GHOST' : threat.detected ? 'LOCK' : 'UNKN';
      const modelTag = threat.detected && threat.modelName ? `<div style="color:#00e5ff;font-weight:700;font-size:8.5px;">${threat.modelName}</div>` : '';
      const payloadTag = threat.detected && threat.payload ? `<div style="color:#fca5a5;font-weight:700;font-size:7.5px;">📦 ${threat.payload.slice(0, 22)}${threat.payload.length > 22 ? '…' : ''}</div>` : '';
      const transitTag = threat.isTransit ? `<div style="color:#fbbf24;font-weight:800;font-size:8px;">✈ ENROUTE: ${threat.transitDestinationName?.split(' ')[0] ?? 'SECONDARY BASE'}</div>` : '';
      const sprintTag  = threat.sprintActive ? `<div style="color:#f97316;font-weight:800;font-size:8px;">⚡DIVE SPRINT</div>` : '';
      const maskTag    = threat.isMaskedAsCivilian && !threat.unmasked ? `<div style="color:#fbbf24;font-weight:800;font-size:7.5px;background:rgba(245,158,11,0.2);padding:1px 3px;border-radius:2px;">✈ MASK: ${threat.maskedCallsign?.split(' ')[0] ?? 'CIVIL CARGO'}</div>` : threat.unmasked ? `<div style="color:#ef4444;font-weight:900;font-size:7.5px;">⚠ UNMASKED SWARM</div>` : '';
      const fiberTag   = threat.isFiberOptic ? `<div style="color:#f59e0b;font-weight:800;font-size:7.5px;">⚡ FO-TETHER (RF IMMUNE)</div>` : '';
      const dataBlock = `
        <div style="position:absolute;top:3px;left:26px;width:16px;height:1px;
          background:${color};opacity:0.45;transform:rotate(-35deg);transform-origin:0% 0%;
          pointer-events:none;"></div>
        <div style="position:absolute;top:-16px;left:36px;pointer-events:none;
          font-family:'Courier New',monospace;font-size:10px;line-height:1.25;
          background:rgba(3,12,22,0.88);border-left:2px solid ${color};
          padding:2px 5px;white-space:nowrap;color:${color};text-shadow:0 0 4px ${color}60;">
          <div>${trackCode} ${status}</div>
          ${modelTag}
          ${payloadTag}
          ${maskTag}
          ${fiberTag}
          <div>${altStr} · ${distKm}KM · ${etaStr}</div>
          ${sprintTag}
          ${transitTag}
        </div>`;

      // ── Swarm cluster: 4 micro-diamond satellites with dynamic interlink mesh ──────
      let swarmSatellites = '';
      if (isSwarm) {
        const isDissociating = !!activeEngagement && (
          Math.abs(threat.lat - activeEngagement.lat) < 0.08 &&
          Math.abs(threat.lng - activeEngagement.lng) < 0.08
        );
        const distR = isDissociating ? 22 : 13;
        const satColor = isDissociating ? '#ef4444' : color;
        const meshLines = [45, 135, 225, 315].map(angle => {
          const rad = (angle * Math.PI) / 180;
          const x2 = 22 + Math.round(distR * Math.sin(rad));
          const y2 = 22 + Math.round(-distR * Math.cos(rad));
          const stroke = isDissociating ? '#ef4444' : 'rgba(0, 229, 255, 0.45)';
          return `<line x1="22" y1="22" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="1" stroke-dasharray="${isDissociating ? '2 2' : '3 2'}" />`;
        }).join('');

        const nodes = [45, 135, 225, 315].map(angle => {
          const rad = (angle * Math.PI) / 180;
          const ox = Math.round(distR * Math.sin(rad));
          const oy = Math.round(-distR * Math.cos(rad));
          const dissClass = isDissociating ? 'animation: pulse 0.4s infinite;' : '';
          return `<div style="position:absolute;top:${22 + oy - 3}px;left:${22 + ox - 3}px;
            width:6px;height:6px;border:1.2px solid ${satColor};transform:rotate(45deg);
            opacity:${isDissociating ? 0.95 : 0.75};pointer-events:none;background:rgba(0,20,40,0.7);${dissClass}"></div>`;
        }).join('');

        const meshSvg = `<svg style="position:absolute;top:0;left:0;width:44px;height:44px;pointer-events:none;">${meshLines}</svg>`;
        const dissBadge = isDissociating ? `<div style="position:absolute;top:38px;left:-24px;font-size:7px;color:#ef4444;font-family:monospace;font-weight:900;background:rgba(0,0,0,0.85);border:1px solid #ef4444;padding:1px 4px;border-radius:3px;white-space:nowrap;letter-spacing:0.04em;">⚡ SWM-2024: MESH SEVERED</div>` : '';
        swarmSatellites = `${meshSvg}${nodes}${dissBadge}`;
      }

      const ghostOpacity = isGhost ? 'opacity:0.18;' : '';

      const icon = L.divIcon({
        className: '',
        html: `<div style="position:relative;width:44px;height:44px;${ghostOpacity}">${velLeader}${reticle}${swarmSatellites}${dataBlock}</div>`,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      if (markersRef.current.has(threat.id)) {
        const m = markersRef.current.get(threat.id);
        m.setLatLng([threat.lat, threat.lng]);
        // Only rebuild DOM when the composite signature changes
        if (iconStateRef.current.get(threat.id) !== sig) {
          m.setIcon(icon);
          iconStateRef.current.set(threat.id, sig);
        }
      } else {
        const marker = L.marker([threat.lat, threat.lng], { icon }).addTo(mapRef.current);
        marker.on('click', () => {
          const current = threatsRef.current.find(t => t.id === threat.id);
          if (current) onThreatClickRef.current(current);
        });
        markersRef.current.set(threat.id, marker);
        iconStateRef.current.set(threat.id, sig);
      }

      // ── Prediction arc (threat → base) ─────────────────────────────────────
      const predColor =
        etaSec > 120 ? 'rgba(0,255,136,0.10)' :
        etaSec > 30  ? 'rgba(255,170,0,0.18)'  :
                       'rgba(255,51,68,0.28)';
      if (predLinesRef.current.has(threat.id)) {
        predLinesRef.current.get(threat.id).setLatLngs([
          [threat.lat, threat.lng], [threat.targetLat, threat.targetLng],
        ]);
        predLinesRef.current.get(threat.id).setStyle({ color: predColor });
      } else {
        predLinesRef.current.set(
          threat.id,
          L.polyline(
            [[threat.lat, threat.lng], [threat.targetLat, threat.targetLng]],
            { color: predColor, weight: 1, dashArray: '5 10', interactive: false },
          ).addTo(mapRef.current),
        );
      }

      // ── Phosphor history trail (acquired tracks only) ───────────────────────
      if (threat.detected) {
        const trail = trailsRef.current.get(threat.id) ?? [];
        const newTrail: [number, number][] = [
          ...trail,
          [threat.lat, threat.lng] as [number, number],
        ].slice(-10);
        trailsRef.current.set(threat.id, newTrail);
        if (newTrail.length >= 2) {
          const trailColor = color;
          if (trailLinesRef.current.has(threat.id)) {
            trailLinesRef.current.get(threat.id).setLatLngs(newTrail);
            trailLinesRef.current.get(threat.id).setStyle({ color: trailColor });
          } else {
            trailLinesRef.current.set(
              threat.id,
              L.polyline(newTrail, {
                color: trailColor, weight: 1.5, opacity: 0.40,
                dashArray: '2 8', interactive: false,
              }).addTo(mapRef.current),
            );
          }
        }
      }
    });
    // ── Slew lock line: target → selected threat ──────────────────────────
    if (slewLineRef.current) {
      mapRef.current.removeLayer(slewLineRef.current);
      slewLineRef.current = null;
    }
    if (selectedThreatId) {
      const sel = nonNeutralized.find(t => t.id === selectedThreatId);
      if (sel) {
        slewLineRef.current = L.polyline(
          [[targetLat, targetLng], [sel.lat, sel.lng]],
          { color: '#00e5ff', weight: 1.5, dashArray: '4,4', opacity: 0.55, interactive: false },
        ).addTo(mapRef.current);
      }
    }
  }, [threats, selectedThreatId, targetLat, targetLng]);

  // ── Sync parent satellite prop or internal mapMode ────────────────────────
  useEffect(() => {
    setMapMode(satellite ? 'hybrid' : 'radar');
  }, [satellite]);

  // ── Switch Google Maps layer mode (Satellite, Hybrid, Normal, Terrain, Radar) ──
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;
    const L = require('leaflet');
    mapRef.current.removeLayer(tileLayerRef.current);
    const newTile = L.tileLayer(GOOGLE_TILE_URLS[mapMode], {
      maxZoom: 20,
      className: `mod-tiles-${mapMode}`,
    });
    newTile.addTo(mapRef.current);
    tileLayerRef.current = newTile;
  }, [mapMode]);

  // ── Toggle Classified Military Bases Layer ────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !classifiedLayerRef.current) return;
    if (showClassifiedBases) {
      if (!mapRef.current.hasLayer(classifiedLayerRef.current)) {
        classifiedLayerRef.current.addTo(mapRef.current);
      }
    } else {
      if (mapRef.current.hasLayer(classifiedLayerRef.current)) {
        mapRef.current.removeLayer(classifiedLayerRef.current);
      }
    }
  }, [showClassifiedBases]);

  // ── Engagement beam — Authentic Air-Defense Battery Launch Physics ───────────────
  useEffect(() => {
    if (!mapRef.current || !engGroupRef.current) return;
    const L = require('leaflet');
    engGroupRef.current.clearLayers();
    if (!activeEngagement) return;

    const tLat = activeEngagement.lat, tLng = activeEngagement.lng;
    const cm = activeEngagement.cm;

    // Determine exact firing battery station at defending base
    const batLat = (activeEngagement as any).batLat ?? (
      cm === 'interceptor' ? targetLat - 0.0035 :
      cm === 'laser-dew' ? targetLat + 0.0028 :
      cm === 'ew' ? targetLat - 0.0022 :
      targetLat + 0.0045
    );
    const batLng = (activeEngagement as any).batLng ?? (
      cm === 'interceptor' ? targetLng + 0.0055 :
      cm === 'laser-dew' ? targetLng - 0.0042 :
      cm === 'ew' ? targetLng - 0.0035 :
      targetLng + 0.0038
    );
    const batName = (activeEngagement as any).batName ?? (
      cm === 'interceptor' ? 'Akash-NG / QRSAM SAM Battery' :
      cm === 'laser-dew' ? '10kW Fiber Laser DEW Turret #1' :
      cm === 'ew' ? 'Broadband High-Power Microwave (HPM) Array' :
      cm === 'gnss-spoof' ? 'Tactical GNSS Spoofing Ground Station' :
      'D-4 Directional RF High-Gain Jammer Mast'
    );

    // 1. Battery launch station badge on map
    L.marker([batLat, batLng], {
      icon: L.divIcon({
        className: '',
        html: `<div style="background:rgba(3,8,18,0.95);border:1.5px solid #38bdf8;padding:3px 7px;border-radius:4px;font-family:monospace;font-size:8px;font-weight:900;color:#38bdf8;white-space:nowrap;box-shadow:0 0 14px rgba(56,189,248,0.6);">
          🚀 LAUNCH: ${batName.toUpperCase()} [${batLat.toFixed(4)}°N, ${batLng.toFixed(4)}°E]
        </div>`,
        iconSize: [220, 18], iconAnchor: [110, 22],
      }),
      interactive: false,
    }).addTo(engGroupRef.current);

    // 2. Target intercept coordinates callout on map
    L.marker([tLat, tLng], {
      icon: L.divIcon({
        className: '',
        html: `<div style="background:rgba(3,8,18,0.95);border:1.5px solid #ef4444;padding:3px 7px;border-radius:4px;font-family:monospace;font-size:8px;font-weight:900;color:#f87171;white-space:nowrap;box-shadow:0 0 14px rgba(239,68,68,0.6);">
          🎯 INTERCEPT COORD: [${tLat.toFixed(4)}°N, ${tLng.toFixed(4)}°E]
        </div>`,
        iconSize: [180, 18], iconAnchor: [90, -8],
      }),
      interactive: false,
    }).addTo(engGroupRef.current);

    // 3. Realistic Weapon Projectile / Directed Energy Beam Physics
    if (cm === 'rf-jammer') {
      L.polyline([[batLat, batLng], [tLat, tLng]],
        { color: '#3b82f6', weight: 3, opacity: 0.9, dashArray: '6 3', interactive: false },
      ).addTo(engGroupRef.current);
      const brgRad = Math.atan2(tLng - batLng, tLat - batLat);
      const dist = Math.sqrt((tLat - batLat) ** 2 + (tLng - batLng) ** 2);
      const off1 = [batLat + dist * Math.cos(brgRad + 0.14), batLng + dist * Math.sin(brgRad + 0.14)];
      const off2 = [batLat + dist * Math.cos(brgRad - 0.14), batLng + dist * Math.sin(brgRad - 0.14)];
      L.polygon([[batLat, batLng], off1, off2],
        { color: '#3b82f6', fillColor: 'rgba(59,130,246,0.15)', weight: 0.5, fillOpacity: 1, interactive: false },
      ).addTo(engGroupRef.current);
    } else if (cm === 'gnss-spoof') {
      L.polyline([[batLat, batLng], [tLat, tLng]],
        { color: '#06b6d4', weight: 2, opacity: 0.85, dashArray: '4 4', interactive: false },
      ).addTo(engGroupRef.current);
      const lzPos = geoOffset(targetLat, targetLng, 65000, 315);
      L.polyline([[tLat, tLng], lzPos],
        { color: '#06b6d4', weight: 2.5, opacity: 0.9, dashArray: '8 4', interactive: false },
      ).addTo(engGroupRef.current);
      L.circle([tLat, tLng], { radius: 6000, color: '#06b6d4', fillColor: 'rgba(6,182,212,0.15)', weight: 1.5, fillOpacity: 1, interactive: false }).addTo(engGroupRef.current);
    } else if (cm === 'interceptor') {
      // Kinetic SAM missile ascent trajectory from battery to target
      L.polyline([[batLat, batLng], [tLat, tLng]],
        { color: '#ef4444', weight: 3, opacity: 0.95, dashArray: '12 4', interactive: false },
      ).addTo(engGroupRef.current);
      L.polyline([[batLat, batLng], [tLat, tLng]],
        { color: '#ffffff', weight: 1, opacity: 0.8, interactive: false },
      ).addTo(engGroupRef.current);
      L.circle([tLat, tLng], { radius: 14000, color: '#ef4444', fillColor: 'rgba(239,68,68,0.25)', weight: 2, dashArray: '6 4', fillOpacity: 1, interactive: false }).addTo(engGroupRef.current);
    } else if (cm === 'laser-dew') {
      // 10kW DEW high-energy laser direct line of sight
      L.polyline([[batLat, batLng], [tLat, tLng]],
        { color: '#f97316', weight: 4, opacity: 0.95, interactive: false },
      ).addTo(engGroupRef.current);
      L.polyline([[batLat, batLng], [tLat, tLng]],
        { color: '#ffffff', weight: 1.5, opacity: 0.9, interactive: false },
      ).addTo(engGroupRef.current);
      L.circle([tLat, tLng], { radius: 4000, color: '#f97316', fillColor: 'rgba(249,115,22,0.35)', weight: 1.5, fillOpacity: 1, interactive: false }).addTo(engGroupRef.current);
    } else if (cm === 'ew') {
      // Broadband EMP / HPM microwave burst from array
      L.circle([batLat, batLng], { radius: 26000, color: '#8b5cf6', fillColor: 'rgba(139,92,246,0.18)', weight: 2.5, dashArray: '8 5', fillOpacity: 1, interactive: false }).addTo(engGroupRef.current);
      L.polyline([[batLat, batLng], [tLat, tLng]],
        { color: '#8b5cf6', weight: 2.5, opacity: 0.8, dashArray: '4 4', interactive: false },
      ).addTo(engGroupRef.current);
    } else if (cm === 'alert-evacuate') {
      L.circle([tLat, tLng], { radius: 10000, color: '#22c55e', fillColor: 'rgba(34,197,94,0.12)', weight: 1.5, dashArray: '6 4', fillOpacity: 1, interactive: false }).addTo(engGroupRef.current);
      L.polyline([[batLat, batLng], [tLat, tLng]],
        { color: '#22c55e', weight: 1.5, opacity: 0.7, dashArray: '5 5', interactive: false },
      ).addTo(engGroupRef.current);
    }
  }, [activeEngagement, targetLat, targetLng]);

  const MODES: Array<{ id: MapMode; label: string; color: string }> = [
    { id: 'hybrid',    label: '🗺 HYBRID',    color: '#fbbf24' },
    { id: 'satellite', label: '🛰 SATELLITE', color: '#38bdf8' },
    { id: 'normal',    label: '🛣 NORMAL',    color: '#60a5fa' },
    { id: 'terrain',   label: '⛰ TERRAIN',   color: '#4ade80' },
    { id: 'radar',     label: '📡 RADAR',     color: '#00ff88' },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0, isolation: 'isolate', backgroundColor: '#020813' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', backgroundColor: '#020813' }} />

      {/* Circular PPI radar sweep — geo-pinned to targetLat/targetLng */}
      {radarPx && (
        <div
          style={{
            position: 'absolute',
            top: `${radarPx.y}px`,
            left: `${radarPx.x}px`,
            transform: 'translate(-50%, -50%)',
            width: `${radarPx.r * 2}px`,
            height: `${radarPx.r * 2}px`,
            borderRadius: '50%',
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: 400,
          }}
        >
          <div
            style={{
              width: '100%', height: '100%',
              background:
                'conic-gradient(from 0deg, transparent 0deg, rgba(0,255,136,0.04) 20deg, rgba(0,255,136,0.12) 28deg, rgba(0,255,136,0.26) 30deg, transparent 31deg)',
              animation: 'radarSweep 4s linear infinite',
            }}
          />
        </div>
      )}

      {/* ── Google Maps 5-Mode Layer Switcher + Classified Bases Toggle (Top-Right) ── */}
      <div style={{ position: 'absolute', top: '12px', right: '14px', zIndex: 550, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
        <div style={{ display: 'flex', backgroundColor: 'rgba(3,10,20,0.92)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: '7px', padding: '2px', gap: '2px', boxShadow: '0 4px 16px rgba(0,0,0,0.6)' }}>
          {MODES.map(m => {
            const active = mapMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMapMode(m.id)}
                style={{
                  backgroundColor: active ? `${m.color}28` : 'transparent',
                  border: active ? `1px solid ${m.color}aa` : '1px solid transparent',
                  color: active ? m.color : '#94a3b8',
                  fontSize: '9px', fontWeight: 800, fontFamily: 'monospace',
                  letterSpacing: '0.05em', padding: '4px 8px', borderRadius: '5px', cursor: 'pointer',
                }}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Camera Presets + Confidential Bases Toggle */}
        <div style={{ display: 'flex', gap: '5px' }}>
          <button
            onClick={() => setShowClassifiedBases(v => !v)}
            style={{
              backgroundColor: showClassifiedBases ? 'rgba(239,68,68,0.18)' : 'rgba(3,10,20,0.88)',
              border: `1px solid ${showClassifiedBases ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.16)'}`,
              color: showClassifiedBases ? '#f87171' : '#64748b',
              fontSize: '8.5px', fontWeight: 800,
              padding: '4px 8px', borderRadius: '6px', cursor: 'pointer',
              fontFamily: 'monospace', letterSpacing: '0.05em',
            }}
            title="Show/Hide Confidential & Strategic Indian Military Bases"
          >
            🔒 CLASSIFIED BASES {showClassifiedBases ? '●' : '○'}
          </button>
          <button
            onClick={() => {
              if (mapRef.current) mapRef.current.setView([targetLat, targetLng], 15, { animate: true });
            }}
            style={{
              backgroundColor: 'rgba(3,10,20,0.88)', border: '1px solid rgba(251,191,36,0.45)',
              color: '#fbbf24', fontSize: '8.5px', fontWeight: 800,
              padding: '4px 8px', borderRadius: '6px', cursor: 'pointer',
              fontFamily: 'monospace', letterSpacing: '0.05em',
            }}
            title="Zoom into exact base/asset satellite view (Zoom 15)"
          >
            🔍 PINPOINT BASE
          </button>
          <button
            onClick={() => {
              if (mapRef.current) mapRef.current.setView([targetLat, targetLng], 8, { animate: true });
            }}
            style={{
              backgroundColor: 'rgba(3,10,20,0.88)', border: '1px solid rgba(0,255,136,0.38)',
              color: '#00ff88', fontSize: '8.5px', fontWeight: 800,
              padding: '4px 8px', borderRadius: '6px', cursor: 'pointer',
              fontFamily: 'monospace', letterSpacing: '0.05em',
            }}
            title="Center 300km radar sector on defended asset (Zoom 8)"
          >
            🎯 SECTOR
          </button>
          <button
            onClick={() => {
              if (mapRef.current) mapRef.current.setView([23.5, 80.5], 5, { animate: true });
            }}
            style={{
              backgroundColor: 'rgba(3,10,20,0.88)', border: '1px solid rgba(56,189,248,0.4)',
              color: '#38bdf8', fontSize: '8.5px', fontWeight: 800,
              padding: '4px 8px', borderRadius: '6px', cursor: 'pointer',
              fontFamily: 'monospace', letterSpacing: '0.05em',
            }}
            title="View full India strategic theater (Zoom 5)"
          >
            🇮🇳 ALL INDIA
          </button>
        </div>
      </div>

      {/* Classified Base Intelligence Dossier Popup */}
      {selectedBase && (
        <div
          style={{
            position: 'absolute', bottom: '44px', right: '14px', zIndex: 550,
            width: '300px', backgroundColor: 'rgba(3,10,20,0.95)',
            border: `1px solid ${BASE_CATEGORY_STYLE[selectedBase.category].color}`,
            borderRadius: '8px', padding: '10px 12px', fontFamily: 'monospace',
            boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '9px', fontWeight: 900, color: BASE_CATEGORY_STYLE[selectedBase.category].color, letterSpacing: '0.08em' }}>
              🔒 {selectedBase.classification}
            </span>
            <button
              onClick={() => setSelectedBase(null)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '12px', fontWeight: 900 }}
            >
              ✕
            </button>
          </div>
          <div style={{ fontSize: '12px', fontWeight: 900, color: '#fff', marginBottom: '2px' }}>
            {BASE_CATEGORY_STYLE[selectedBase.category].icon} {selectedBase.name}
          </div>
          <div style={{ fontSize: '9.5px', color: '#94a3b8', marginBottom: '6px' }}>
            {selectedBase.command} · <span style={{ color: '#fbbf24' }}>{selectedBase.code}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px' }}>
            <span style={{ fontSize: '9px', color: '#00ff88', fontWeight: 700 }}>
              WGS-84: {selectedBase.lat.toFixed(4)}°N, {selectedBase.lng.toFixed(4)}°E
            </span>
            <button
              onClick={() => {
                if (mapRef.current) mapRef.current.setView([selectedBase.lat, selectedBase.lng], 15, { animate: true });
              }}
              style={{
                backgroundColor: 'rgba(251,191,36,0.18)', border: '1px solid rgba(251,191,36,0.55)',
                color: '#fbbf24', fontSize: '8.5px', fontWeight: 800, padding: '3px 8px',
                borderRadius: '4px', cursor: 'pointer', fontFamily: 'monospace',
              }}
            >
              🔍 INSPECT BASE (15x)
            </button>
          </div>
        </div>
      )}

      {/* Night mode veil */}
      {nightMode && (
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15,23,42,0.45)', pointerEvents: 'none', zIndex: 420 }} />
      )}

      {/* Weather overlays */}
      {weather === 'foggy' && (
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(148,163,184,0.25)', pointerEvents: 'none', backdropFilter: 'blur(1px)', zIndex: 420 }} />
      )}
      {weather === 'dust-storm' && (
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(217,119,6,0.18)', pointerEvents: 'none', zIndex: 420 }} />
      )}
      {weather === 'rainy' && (
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(30,58,138,0.15)', pointerEvents: 'none', zIndex: 420 }} />
      )}

      {/* Tactical terrain/weather + Exact WGS-84 Coordinate badge */}
      <div
        style={{
          position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: 'rgba(3,10,20,0.92)',
          border: '1px solid rgba(251,191,36,0.4)',
          color: weather !== 'clear' || nightMode ? '#f59e0b' : '#e2e8f0',
          fontSize: '9.5px', fontWeight: 700, padding: '4px 14px', borderRadius: '999px',
          pointerEvents: 'none', letterSpacing: '0.07em', zIndex: 500, whiteSpace: 'nowrap',
          fontFamily: 'monospace',
        }}
      >
        {`🇮🇳 SOI WGS-84: ${targetLat.toFixed(4)}°N, ${targetLng.toFixed(4)}°E · ${mapMode.toUpperCase()} MODE · ${environment.toUpperCase().replace(/-/g, ' ')}`}
      </div>

      {/* Live cursor BRG/RNG readout */}
      {cursorInfo && (
        <div
          style={{
            position: 'absolute', bottom: '14px', left: '52px', zIndex: 450,
            pointerEvents: 'none',
            fontFamily: "'Courier New', monospace", fontSize: '10px',
            color: 'rgba(0,255,136,0.85)',
            background: 'rgba(3,12,22,0.92)',
            border: '1px solid rgba(0,255,136,0.28)',
            padding: '4px 10px', borderRadius: '4px',
            letterSpacing: '0.04em', whiteSpace: 'nowrap',
          }}
        >
          {`CURSOR: BRG ${String(Math.round(cursorInfo.brg)).padStart(3, '0')}° | RNG ${cursorInfo.rngKm.toFixed(2)} KM | LAT ${cursorInfo.lat >= 0 ? cursorInfo.lat.toFixed(4) + '°N' : Math.abs(cursorInfo.lat).toFixed(4) + '°S'} LNG ${cursorInfo.lng >= 0 ? cursorInfo.lng.toFixed(4) + '°E' : Math.abs(cursorInfo.lng).toFixed(4) + '°W'}`}
        </div>
      )}

      <style>{`
        .leaflet-container {
          background-color: #020813 !important;
        }
        .mod-tiles-satellite {
          filter: brightness(0.96) contrast(1.08) saturate(1.08);
        }
        .mod-tiles-hybrid {
          filter: brightness(0.95) contrast(1.08) saturate(1.06);
        }
        .mod-tiles-normal {
          filter: brightness(0.94) contrast(1.04);
        }
        .mod-tiles-terrain {
          filter: brightness(0.94) contrast(1.08) saturate(1.05);
        }
        .mod-tiles-radar {
          filter: invert(1) hue-rotate(140deg) brightness(0.45) contrast(1.55) saturate(1.4);
        }
        @keyframes radarSweep {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
