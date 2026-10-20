'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { LEVELS, getLevelTier, type Level } from '@/lib/levels';
import {
  getSessions, getProfile, type TraineeProfile,
  getTierAccuracy, isTierUnlocked, getProfiles, getActiveProfileId,
  logoutProfile,
} from '@/lib/storage';
import ProfileSelector from '@/components/ProfileSelector';
import { getEarnedAchievements, ACHIEVEMENT_DEFS } from '@/lib/achievements';
import { DEMO_LEVEL } from '@/lib/demoMode';
import type { Weather } from '@/types';
import TacticalManualModal from '@/components/TacticalManualModal';

// ── Tier metadata ─────────────────────────────────────────────────────────────
const TIER_STYLES = {
  recruit:    { text: '#4ade80', label: 'PUNJAB',    tab: 'PUNJAB' },
  cadet:      { text: '#60a5fa', label: 'J&K LOC',   tab: 'J&K LOC' },
  operator:   { text: '#facc15', label: 'LADAKH',    tab: 'LADAKH' },
  specialist: { text: '#fb923c', label: 'COASTAL',   tab: 'COASTAL' },
  commander:  { text: '#f87171', label: 'DELHI NCR', tab: 'DELHI NCR' },
} as const;
const TIER_KEYS = ['recruit', 'cadet', 'operator', 'specialist', 'commander'] as const;
const TIER_NUM: Record<string, number> = { recruit:0, cadet:1, operator:2, specialist:3, commander:4 };

// ── SVG Radar Preview helpers ─────────────────────────────────────────────────
function bearingToXY(bearing: number, cx: number, cy: number, r: number): [number, number] {
  const rad = ((bearing - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function sectorArcPath(sectors: Array<{min:number;max:number}>, cx: number, cy: number, r: number): string {
  return sectors.map(s => {
    const range = s.max > s.min ? s.max - s.min : s.max + 360 - s.min;
    const [x1, y1] = bearingToXY(s.min, cx, cy, r);
    const [x2, y2] = bearingToXY((s.min + range) % 360, cx, cy, r);
    const lg = range > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${lg} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`;
  }).join(' ');
}

// ── Micro-badge helper ────────────────────────────────────────────────────────
function levelBadges(l: Level) {
  const b: Array<{icon:string; label:string; color:string}> = [];
  if (l.nightMode) b.push({ icon: '🌙', label: 'NIGHT',  color: '#8b5cf6' });
  if (l.weather === 'foggy')      b.push({ icon: '🌫', label: 'FOG',   color: '#60a5fa' });
  if (l.weather === 'dust-storm') b.push({ icon: '🌪', label: 'DUST',  color: '#f97316' });
  if (l.weather === 'rainy')      b.push({ icon: '🌧', label: 'RAIN',  color: '#3b82f6' });
  if (l.types.includes('swarm'))  b.push({ icon: '🐝', label: 'SWARM', color: '#22c55e' });
  if (l.types.includes('military')) b.push({ icon: '✈', label: 'UCAV',   color: '#ef4444' });
  if (l.sensorDegradation)        b.push({ icon: '⚡', label: 'EW JAM', color: '#f59e0b' });
  return b;
}

// ── Tactical challenge badge ──────────────────────────────────────────────────
function tacticalBadge(l: Level): { icon: string; label: string; color: string } | null {
  const r = l.spawnRadius;
  const name = (l.targetName + ' ' + l.name).toLowerCase();
  if (name.includes('refinery') || name.includes('oil') || name.includes('fuel') || name.includes('lpg'))
    return { icon: '🛢', label: 'OIL RESERVE', color: '#f97316' };
  if (name.includes('nuclear') || name.includes('atomic') || name.includes('breeder') || name.includes('kaiga') || name.includes('kalpakkam') || name.includes('tarapur') || name.includes('rawatbhata') || name.includes('narora'))
    return { icon: '☢', label: 'NUCLEAR', color: '#ef4444' };
  if (name.includes('carrier') || name.includes('vikrant') || name.includes('submarine') || name.includes('naval'))
    return { icon: '⚓', label: 'MARITIME', color: '#3b82f6' };
  if (name.includes('vvip') || name.includes('parliament') || name.includes('rashtrapati') || name.includes('red fort') || name.includes('central vista') || name.includes('palam') || name.includes('igi') || name.includes('vaishno'))
    return { icon: '✈', label: 'VIP DECON', color: '#f59e0b' };
  if (l.types.length === 1 && l.sensorDegradation && l.decoys)
    return { icon: '👻', label: 'STEALTH', color: '#8b5cf6' };
  if (r <= 0.80)
    return { icon: '⚡', label: 'POP-UP ' + Math.round(r * 110) + 'KM', color: '#ef4444' };
  if (l.speed > 0.0055)
    return { icon: '🚀', label: 'KAMIKAZE SALVO', color: '#f97316' };
  return null;
}

// ── Environment color ─────────────────────────────────────────────────────────
function envTint(env: string) {
  if (env === 'mountain')               return 'rgba(6,182,212,0.12)';
  if (env === 'coastal')                return 'rgba(59,130,246,0.12)';
  if (env === 'urban')                  return 'rgba(251,191,36,0.08)';
  if (env === 'critical-infrastructure') return 'rgba(239,68,68,0.08)';
  return 'rgba(0,255,136,0.05)';
}

// ── Main page component ───────────────────────────────────────────────────────
export default function BriefingPage() {
  const [selectedLevel, setSelectedLevel]       = useState(1);
  const [pbMap, setPbMap]                       = useState<Record<number, number>>({});
  const [profile, setProfile]                   = useState<TraineeProfile>({ name:'', rank:'', serviceNo:'', unit:'', base:'' });
  const [showProfileSelector, setShowProfileSelector] = useState(false);
  const [showTutorial, setShowTutorial]         = useState(false);
  const [earnedCount, setEarnedCount]           = useState(0);
  const [showManual, setShowManual]             = useState(false);
  const [selectedTier, setSelectedTier]         = useState(0);
  const [tierUnlocked, setTierUnlocked]         = useState<boolean[]>([true,true,true,true,true]);
  const [tierAccuracy, setTierAccuracy]         = useState<number[]>([0,0,0,0,0]);
  const [unlockAll, setUnlockAll]               = useState(true);
  const [profilePortal, setProfilePortal]       = useState<'trainee' | 'instructor'>('trainee');
  const [search, setSearch]                     = useState('');
  const [quickFilter, setQuickFilter]           = useState<'all'|'night'|'swarm'|'ucav'|'degraded'>('all');
  // On-the-fly overrides
  const [customWeather, setCustomWeather]       = useState('default');
  const [customTime, setCustomTime]             = useState('default');
  const [forceSwarm, setForceSwarm]             = useState(false);
  const [forceDecoys, setForceDecoys]           = useState(false);

  const router = useRouter();
  const level  = LEVELS[selectedLevel - 1];
  const tier   = getLevelTier(selectedLevel);
  const ts     = TIER_STYLES[tier];

  const refreshState = () => {
    const activeId = getActiveProfileId();
    const sessions = getSessions().filter(s => !activeId || !s.profileId || s.profileId === activeId);
    const map: Record<number,number> = {};
    for (const s of sessions) {
      const lvl = s.level ?? 1;
      if (!map[lvl] || s.score > map[lvl]) map[lvl] = s.score;
    }
    setPbMap(map);
    setProfile(getProfile());
    setEarnedCount(getEarnedAchievements().length);
    const unlocked = [0,1,2,3,4].map(n => isTierUnlocked(n));
    setTierUnlocked(unlocked);
    setTierAccuracy([0,1,2,3,4].map(n => getTierAccuracy(n)));
    const ua = localStorage.getItem('droneshield-unlock-all') !== '0';
    setUnlockAll(ua);
    setTierUnlocked(ua ? [true,true,true,true,true] : [0,1,2,3,4].map(n => isTierUnlocked(n)));
  };

  useEffect(() => {
    refreshState();
    if (!localStorage.getItem('droneshield-tutorial-done')) setShowTutorial(true);
    const profiles = getProfiles();
    const activeId = getActiveProfileId();
    if (profiles.length === 0 || !activeId) setShowProfileSelector(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleUnlockAll() {
    const next = !unlockAll;
    localStorage.setItem('droneshield-unlock-all', next ? '1' : '0');
    setUnlockAll(next);
    setTierUnlocked(next ? [true,true,true,true,true] : [0,1,2,3,4].map(n => isTierUnlocked(n)));
  }

  function handleLogout() {
    logoutProfile();
    setShowProfileSelector(true);
    refreshState();
  }

  const handleLaunch = () => {
    const overrides: Partial<Level> = {};
    if (customWeather !== 'default') overrides.weather = customWeather as Weather;
    if (customTime === 'day')   overrides.nightMode = false;
    if (customTime === 'night') overrides.nightMode = true;
    if (forceSwarm && !level.types.includes('swarm')) overrides.types = [...level.types, 'swarm'] as Level['types'];
    if (forceDecoys) overrides.decoys = true;
    sessionStorage.setItem('level', String(selectedLevel));
    if (Object.keys(overrides).length > 0) {
      sessionStorage.setItem('custom-scenario', JSON.stringify(overrides));
    }
    router.push('/simulation');
  };

  // ── Filtered levels for selected tier ─────────────────────────────────────
  const tierLevels = useMemo(() => {
    return LEVELS.filter(l => TIER_NUM[getLevelTier(l.number)] === selectedTier);
  }, [selectedTier]);

  const filteredLevels = useMemo(() => {
    let ls = tierLevels;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const num = parseInt(q);
      ls = ls.filter(l =>
        (!isNaN(num) && l.number === num) ||
        l.name.toLowerCase().includes(q) ||
        l.scenario.toLowerCase().includes(q) ||
        l.targetName.toLowerCase().includes(q)
      );
    }
    if (quickFilter === 'night')    ls = ls.filter(l => l.nightMode);
    if (quickFilter === 'swarm')    ls = ls.filter(l => l.types.includes('swarm'));
    if (quickFilter === 'ucav')     ls = ls.filter(l => l.types.includes('military'));
    if (quickFilter === 'degraded') ls = ls.filter(l => l.sensorDegradation);
    return ls;
  }, [tierLevels, search, quickFilter]);

  const CX = 100, CY = 100, R_OUTER = 90, R_MID = 62, R_INNER = 36;

  // SVG arc for current level's spawn sectors
  const sectorPath = sectorArcPath(level.spawnSectors ?? [], CX, CY, R_OUTER);

  const locked = !tierUnlocked[selectedTier];

  return (
    <div style={{
      height: '100vh', width: '100%',
      backgroundColor: '#070c18',
      backgroundImage: 'radial-gradient(circle at 15% 15%, rgba(15, 23, 42, 0.8) 0%, rgba(7, 12, 24, 0.98) 100%)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: 'inherit', color: '#fff',
    }}>

      {/* ── TOP COMMAND BAR (Option B Defence Modern) ─────────────────────────────────── */}
      <header style={{
        height: '56px', flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: '14px', padding: '0 24px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        backgroundColor: 'rgba(9, 14, 26, 0.85)',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}>
        {/* Logo with high-end defence badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            width: '32px', height: '32px', borderRadius: '10px',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            border: '1.5px solid rgba(59, 130, 246, 0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', color: '#60a5fa',
            boxShadow: '0 0 12px rgba(59, 130, 246, 0.25)',
          }}>
            🛡
          </span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: '14px', letterSpacing: '-0.02em', lineHeight: 1 }}>
              DroneShield
            </span>
            <span style={{ color: '#64748b', fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1.4 }}>
              C-UAS Integrated Tactical Air Defense Terminal · IDAS-C4I
            </span>
          </div>
        </div>

        <div style={{ width: '1px', height: '26px', backgroundColor: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />

        {/* Unlock toggle pill */}
        <button onClick={toggleUnlockAll}
          style={{
            backgroundColor: unlockAll ? 'rgba(245,158,11,0.14)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${unlockAll ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.1)'}`,
            color: unlockAll ? '#fbbf24' : '#64748b',
            fontSize: '10px', fontWeight: 800, padding: '5px 12px', borderRadius: '999px',
            cursor: 'pointer', letterSpacing: '0.04em', fontFamily: 'inherit',
            transition: 'all 0.15s ease',
            boxShadow: unlockAll ? '0 0 12px rgba(245,158,11,0.15)' : 'none',
          }}>
          {unlockAll ? '🔓 ALL THEATERS UNLOCKED' : '🔒 PROGRESSION MODE'}
        </button>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Active operator pill */}
        <button onClick={() => { setProfilePortal('trainee'); setShowProfileSelector(true); }}
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#e2e8f0', cursor: 'pointer', fontSize: '11px', fontWeight: 700,
            padding: '5px 14px', borderRadius: '999px',
            display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.02em', fontFamily: 'inherit',
            transition: 'all 0.15s ease',
          }}>
          &#128100; {profile.rank ? `${profile.rank} ` : ''}{profile.name || 'Select Profile'}
          {profile.serviceNo && <span style={{ color: '#64748b', fontWeight: 400 }}>· {profile.serviceNo}</span>}
          {profile.name && profile.role === 'instructor' && <span style={{ fontSize: '8px', fontWeight: 800, color: '#fbbf24', backgroundColor: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: '4px', padding: '1px 6px', letterSpacing: '0.04em' }}>&#127894; DS</span>}
          {profile.name && profile.role !== 'instructor' && <span style={{ fontSize: '8px', fontWeight: 800, color: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '4px', padding: '1px 6px', letterSpacing: '0.04em' }}>&#127919; OPS</span>}
        </button>

        {/* Achievements */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: earnedCount > 0 ? '#fbbf24' : '#64748b', fontWeight: 800, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '5px 10px', borderRadius: '999px' }}>
          &#127942; {earnedCount}<span style={{ color: '#475569', fontWeight: 400 }}>/{ACHIEVEMENT_DEFS.length}</span>
        </div>

        {/* Tactical Manual */}
        <button onClick={() => setShowManual(true)}
          style={{ background: 'rgba(245,158,11,0.16)', border: '1px solid rgba(245,158,11,0.5)', color: '#fbbf24', fontSize: '10px', fontWeight: 800, padding: '5px 12px', borderRadius: '999px', cursor: 'pointer', letterSpacing: '0.04em', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '5px' }}>
          📖 MANUAL
        </button>

        {/* Presentation Deck */}
        <button onClick={() => router.push('/presentation')}
          style={{ background: 'rgba(59,130,246,0.16)', border: '1px solid rgba(59,130,246,0.5)', color: '#60a5fa', fontSize: '10px', fontWeight: 800, padding: '5px 12px', borderRadius: '999px', cursor: 'pointer', letterSpacing: '0.04em', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '5px' }}>
          📊 PRESENTATION
        </button>

        {/* Logout */}
        <button onClick={handleLogout}
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontSize: '10px', fontWeight: 800, padding: '5px 10px', borderRadius: '999px', cursor: 'pointer', letterSpacing: '0.06em', fontFamily: 'inherit' }}>
          LOGOUT
        </button>
      </header>

      {/* ── 3-COLUMN BODY (Option B Defence Modern Glassmorphic Cards) ─────────────────────────── */}
      <div style={{
        display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0,
        padding: '16px', gap: '16px', boxSizing: 'border-box',
      }}>

        {/* ── LEFT COL — Theater Tabs + Scenario List ───────────────────── */}
        <div style={{
          width: '320px', flexShrink: 0,
          backgroundColor: '#070b16',
          border: '1px solid rgba(56, 189, 248, 0.22)',
          borderRadius: '4px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.6)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>

          {/* Theater tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, backgroundColor: '#050812', padding: '4px' }}>
            {TIER_KEYS.map((tk, i) => {
              const lk = !tierUnlocked[i];
              const s  = TIER_STYLES[tk];
              const isSel = selectedTier === i;
              return (
                <button key={tk} onClick={() => !lk && setSelectedTier(i)} disabled={lk}
                  style={{
                    flex: 1, padding: '7px 2px', border: 'none', cursor: lk ? 'not-allowed' : 'pointer',
                    fontSize: '8.5px', fontWeight: 800, letterSpacing: '0.04em',
                    backgroundColor: isSel ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
                    color: lk ? '#1e293b' : isSel ? s.text : '#64748b',
                    borderRadius: '2px',
                    boxShadow: isSel ? '0 0 10px rgba(56, 189, 248, 0.2)' : 'none',
                    transition: 'all 0.15s ease', fontFamily: 'monospace',
                  }}
                  title={lk ? `Complete Tier ${i} at ≥70%` : s.label}>
                  {lk ? '🔒' : s.tab}
                </button>
              );
            })}
          </div>

          {/* Tier header */}
          {(() => {
            const s = TIER_STYLES[TIER_KEYS[selectedTier]];
            const acc = selectedTier > 0 ? tierAccuracy[selectedTier - 1] : 100;
            return (
              <div style={{ padding: '6px 14px', fontSize: '8px', fontWeight: 700, color: locked ? '#475569' : s.text, letterSpacing: '0.14em', textTransform: 'uppercase', backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <span>{s.label} — SCENARIOS {selectedTier * 25 + 1}–{selectedTier * 25 + 25}</span>
                {locked && selectedTier > 0 && <span style={{ color: '#475569', fontWeight: 400 }}>PREV {acc}% / 70%</span>}
              </div>
            );
          })()}

          {/* Search + Quick filters */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '7px' }}>
            <input
              placeholder="Search or #1–125..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '999px', color: '#fff', fontSize: '11px', padding: '6px 12px', outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {(['all','night','swarm','ucav','degraded'] as const).map(f => (
                <button key={f} onClick={() => setQuickFilter(f)}
                  style={{
                    backgroundColor: quickFilter === f ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${quickFilter === f ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    color: quickFilter === f ? '#f59e0b' : '#64748b',
                    fontSize: '8px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px',
                    cursor: 'pointer', letterSpacing: '0.06em', fontFamily: 'inherit',
                    transition: 'all 0.12s ease',
                  }}>
                  {f === 'all' ? 'ALL' : f === 'night' ? '🌙 NIGHT' : f === 'swarm' ? '🐝 SWARM' : f === 'ucav' ? '✈ UCAV' : '⚡ DEGRADED'}
                </button>
              ))}
            </div>
          </div>

          {/* Scenario card list */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '6px' }}>
            {filteredLevels.map(l => {
              const active = l.number === selectedLevel;
              const badges = levelBadges(l);
              const tBadge = tacticalBadge(l);
              const tierK  = getLevelTier(l.number);
              const tStyle = TIER_STYLES[tierK];
              const pb     = pbMap[l.number];
              const shortBase = l.targetName.split(/[,(]/)[0].trim();
              return (
                <button key={l.number} onClick={() => !locked && setSelectedLevel(l.number)} disabled={locked}
                  style={{
                    width: '100%', textAlign: 'left', padding: '8px 10px', marginBottom: '4px',
                    display: 'flex', flexDirection: 'column', gap: '3px',
                    borderRadius: '10px',
                    backgroundColor: locked ? 'transparent' : active ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.02)',
                    cursor: locked ? 'not-allowed' : 'pointer',
                    border: active && !locked ? '1px solid rgba(245,158,11,0.45)' : '1px solid transparent',
                    boxShadow: active && !locked ? '0 0 14px rgba(245,158,11,0.15)' : 'none',
                    opacity: locked ? 0.35 : 1,
                    transition: 'all 0.15s ease',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <span style={{ fontSize: '10px', fontFamily: 'monospace', color: active ? '#f59e0b' : '#94a3b8', fontWeight: 700, letterSpacing: '0.04em', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {String(l.number).padStart(3,'0')} · {l.name}
                    </span>
                    {pb && <span style={{ fontSize: '9px', color: '#f59e0b', fontWeight: 800, flexShrink: 0 }}>{pb}pt</span>}
                    {!pb && <span style={{ fontSize: '7.5px', fontWeight: 800, padding: '2px 5px', borderRadius: '999px', backgroundColor: 'rgba(255,255,255,0.06)', color: tStyle.text, flexShrink: 0 }}>{tierK.slice(0,3).toUpperCase()}</span>}
                  </div>
                  <span style={{ fontSize: '9px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {shortBase}
                  </span>
                  {(badges.length > 0 || tBadge) && (
                    <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginTop: '2px' }}>
                      {tBadge && (
                        <span style={{ fontSize: '7px', fontWeight: 800, color: tBadge.color, backgroundColor: `${tBadge.color}22`, border: `1px solid ${tBadge.color}55`, borderRadius: '999px', padding: '1px 5px', letterSpacing: '0.06em' }}>
                          {tBadge.icon} {tBadge.label}
                        </span>
                      )}
                      {badges.map(b => (
                        <span key={b.label} style={{ fontSize: '7px', fontWeight: 800, color: b.color, backgroundColor: `${b.color}18`, border: `1px solid ${b.color}33`, borderRadius: '999px', padding: '1px 5px', letterSpacing: '0.06em' }}>
                          {b.icon} {b.label}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
            {filteredLevels.length === 0 && (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: '#475569', fontSize: '11px' }}>
                No scenarios match filter.
              </div>
            )}
          </div>
        </div>

        {/* ── CENTER COL — Radar Preview + Briefing ────────────────────── */}
        <div style={{
          flex: 1,
          backgroundColor: '#070b16',
          border: '1px solid rgba(56, 189, 248, 0.22)',
          borderRadius: '4px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.6)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>

          {/* Op header */}
          <div style={{ padding: '12px 18px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', backgroundColor: '#050812' }}>
            <div>
              <p style={{ margin: 0, fontSize: '9px', color: '#64748b', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                OPORD-2026-{String(selectedLevel).padStart(3,'0')} &nbsp;·&nbsp; SECTOR {level.region.toUpperCase()}
              </p>
              <h1 style={{ margin: '3px 0 0', fontSize: '20px', fontWeight: 900, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.1, fontFamily: 'monospace' }}>
                {level.name}
              </h1>
            </div>
            <span style={{ fontSize: '9px', fontWeight: 800, padding: '3px 10px', borderRadius: '3px', backgroundColor: `${ts.text}20`, color: ts.text, border: `1px solid ${ts.text}60`, flexShrink: 0, marginTop: '2px', letterSpacing: '0.08em', fontFamily: 'monospace' }}>
              {ts.label}
            </span>
          </div>

          {/* Dynamic Animated PPI Radar Scope */}
          <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, backgroundColor: '#040710' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '8.5px', color: '#00ff88', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                ● C2 PPI RADAR SCOPE · {level.targetName}
              </span>
              <span style={{ fontSize: '8px', color: '#64748b', fontFamily: 'monospace' }}>
                SCAN: 24 RPM · PRF: 1200Hz · GL=IN
              </span>
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ padding: '4px', borderRadius: '4px', backgroundColor: '#020408', border: '1px solid rgba(0, 255, 136, 0.3)' }}>
                <svg width="200" height="200" style={{ display: 'block', borderRadius: '2px' }}>
                  <defs>
                    <linearGradient id="radarSweepGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="rgba(0,255,136,0.6)" />
                      <stop offset="100%" stopColor="rgba(0,255,136,0)" />
                    </linearGradient>
                  </defs>

                  {/* Background Reticle */}
                  <rect width="200" height="200" fill="#030710" />
                  <circle cx={100} cy={100} r={90} fill={envTint(level.environment)} />
                  {level.nightMode && <circle cx={100} cy={100} r={90} fill="rgba(0,0,0,0.4)" />}

                  {/* Spawn sector threat corridor */}
                  {sectorPath && <path d={sectorArcPath(level.spawnSectors ?? [], 100, 100, 90) || undefined} fill="rgba(239,68,68,0.22)" stroke="#ef4444" strokeWidth="1" strokeDasharray="4 3" />}

                  {/* Range rings & Distance labels */}
                  {[90, 60, 30].map(r => (
                    <circle key={r} cx={100} cy={100} r={r} fill="none" stroke="rgba(0,255,136,0.25)" strokeWidth={r === 90 ? 1.5 : 0.8} strokeDasharray={r === 90 ? undefined : '3 5'} />
                  ))}
                  <text x={100 + 32} y={98} fontSize="6" fill="rgba(0,255,136,0.6)" fontFamily="monospace">5KM</text>
                  <text x={100 + 62} y={98} fontSize="6" fill="rgba(0,255,136,0.6)" fontFamily="monospace">10KM</text>
                  <text x={100 + 78} y={98} fontSize="6" fill="rgba(0,255,136,0.8)" fontFamily="monospace">15KM</text>

                  {/* Cardinal azimuth lines */}
                  {[0, 90, 180, 270].map(a => {
                    const [x2, y2] = bearingToXY(a, 100, 100, 90);
                    return <line key={a} x1={100} y1={100} x2={x2} y2={y2} stroke="rgba(0,255,136,0.25)" strokeWidth="0.8" />;
                  })}

                  {/* 30-deg bearing ticks */}
                  {[30, 60, 120, 150, 210, 240, 300, 330].map(a => {
                    const [x1, y1] = bearingToXY(a, 100, 100, 85);
                    const [x2, y2] = bearingToXY(a, 100, 100, 90);
                    return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(0,255,136,0.35)" strokeWidth="0.7" />;
                  })}

                  {/* Compass labels */}
                  {[{a:0,l:'N'},{a:90,l:'E'},{a:180,l:'S'},{a:270,l:'W'}].map(({ a, l }) => {
                    const [x, y] = bearingToXY(a, 100, 100, 90 * 1.14);
                    return <text key={l} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="7.5" fill="#00ff88" fontFamily="monospace" fontWeight="800">{l}</text>;
                  })}

                  {/* Live Rotating Radar Sweep Beam */}
                  <g style={{ transformOrigin: '100px 100px', animation: 'radarSweep 2.8s linear infinite' }}>
                    <line x1={100} y1={100} x2={100} y2={10} stroke="#00ff88" strokeWidth="1.8" opacity="0.9" />
                    <path d="M 100 100 L 100 10 A 90 90 0 0 1 164 36 Z" fill="url(#radarSweepGrad)" opacity="0.4" />
                  </g>

                  {/* Threat Contact Blips */}
                  <circle cx={140} cy={60} r={3} fill="#ef4444" opacity={0.9} style={{ animation: 'hudPulse 1.2s infinite' }} />
                  <circle cx={150} cy={76} r={2.5} fill="#f59e0b" opacity={0.8} />

                  {/* Defended asset */}
                  <circle cx={100} cy={100} r={5} fill="#3b82f6" opacity={0.9} />
                  <circle cx={100} cy={100} r={2} fill="#ffffff" />
                  <text x={100 + 8} y={100 - 8} fontSize="7" fill="#38bdf8" fontFamily="monospace" fontWeight="800">C2 DEFENDED</text>
                  <text x={100} y={100 + 34} textAnchor="middle" fontSize="6.5" fill="rgba(255,255,255,0.4)" fontFamily="monospace">{level.environment.toUpperCase()}</text>
                </svg>
              </div>

              {/* Legend & Telemetry Table */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '9px', justifyContent: 'center', fontFamily: 'monospace' }}>
                <span style={{ color: '#ef4444', fontWeight: 800 }}>⚠ INGRESS VECTOR: <b style={{ color: '#fca5a5' }}>{level.threatDirection}</b></span>
                <span style={{ color: '#64748b' }}>WGS-84 COORD: <span style={{ color: '#38bdf8', fontWeight: 800 }}>{level.targetLat.toFixed(4)}°N, {level.targetLng.toFixed(4)}°E</span></span>
                <span style={{ color: '#64748b' }}>ENV PROFILE: <span style={{ color: '#fff' }}>{level.environment.replace(/-/g,' ').toUpperCase()}</span></span>
                <span style={{ color: '#64748b' }}>WEATHER STATE: <span style={{ color: '#fff' }}>{level.weather.replace(/-/g,' ').toUpperCase()}</span></span>
                <span style={{ color: '#64748b' }}>VISIBILITY / NIGHT: <span style={{ color: level.nightMode ? '#a855f7' : '#22c55e', fontWeight: 800 }}>{level.nightMode ? '0400Z NIGHT FLIR' : 'DAYLIGHT VISUAL'}</span></span>
                {level.sensorDegradation && <span style={{ color: '#f59e0b', fontWeight: 800 }}>⚡ EW / RF JAMMING ACTIVE</span>}
                {level.decoys && <span style={{ color: '#f97316', fontWeight: 800 }}>🎭 SYNTHETIC DECOYS CORRIDOR</span>}
              </div>
            </div>
          </div>

          {/* WHATIF + Briefing scrollable area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Threat scenario */}
            <div style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: '12px', padding: '12px 14px' }}>
              <p style={{ margin: '0 0 5px', fontSize: '8px', color: '#ef4444', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>TACTICAL SITREP · REAL-TIME THREAT INTELLIGENCE</p>
              <p style={{ margin: 0, fontSize: '12px', color: '#fca5a5', lineHeight: 1.55, fontWeight: 500 }}>{level.scenario}</p>
            </div>

            {/* Tactical briefing */}
            <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px 14px' }}>
              <p style={{ margin: '0 0 6px', fontSize: '8px', color: '#f59e0b', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>COMMANDER'S TACTICAL BRIEFING</p>
              <div style={{ borderLeft: '2px solid rgba(245,158,11,0.5)', paddingLeft: '12px' }}>
                <p style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.65', margin: 0 }}>{level.briefing}</p>
              </div>
            </div>

            {/* Target + origin */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ backgroundColor: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px', padding: '10px 14px' }}>
                <p style={{ margin: '0 0 3px', fontSize: '8px', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>DEFENDED INSTALLATION (WGS-84)</p>
                <p style={{ margin: 0, fontSize: '11px', color: '#fff', fontWeight: 700, lineHeight: 1.3 }}>{level.targetName}</p>
                <p style={{ margin: '3px 0 0', fontSize: '10px', color: '#38bdf8', fontFamily: 'monospace', fontWeight: 700 }}>{level.targetLat.toFixed(4)}°N · {level.targetLng.toFixed(4)}°E</p>
              </div>
              <div style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '10px 14px' }}>
                <p style={{ margin: '0 0 3px', fontSize: '8px', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>THREAT ORIGIN</p>
                <p style={{ margin: 0, fontSize: '11px', color: '#fca5a5', fontWeight: 600, lineHeight: 1.3 }}>{level.threatOrigin}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COL — Mission Telemetry + Customizer + Launch ──────── */}
        <div style={{
          width: '320px', flexShrink: 0,
          backgroundColor: '#070b16',
          border: '1px solid rgba(56, 189, 248, 0.22)',
          borderRadius: '4px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.6)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>

          {/* Mission parameters grid */}
          <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
            <p style={{ margin: '0 0 8px', fontSize: '8px', color: '#64748b', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>MISSION PARAMETERS</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {[
                { label: 'DEFENDED ASSET',   value: level.targetName.split(/[,(]/)[0].trim(), big: false },
                { label: 'THREAT QUOTA',     value: `${level.threatQuota}`, unit: 'drones', big: true },
                { label: 'DECISION WINDOW',  value: `${level.timeLimit}`, unit: 'sec', big: true },
                { label: 'MAX CONCURRENT',   value: `${level.maxConcurrent}`, unit: 'active', big: true },
                { label: 'ENVIRONMENT',      value: level.environment.replace(/-/g,' ').toUpperCase(), big: false },
                { label: 'WEATHER',          value: level.weather.replace(/-/g,' ').toUpperCase(), big: false },
                { label: 'SENSOR SUITE',     value: level.sensorDegradation ? `DEGRADED (${level.degradedFields.length})` : 'NOMINAL', big: false },
                { label: 'THREAT CLASSES',   value: level.types.map(t => t.toUpperCase()).join(' · '), big: false },
              ].map(s => (
                <div key={s.label} style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '8px 10px' }}>
                  <p style={{ margin: '0 0 2px', fontSize: '7px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>{s.label}</p>
                  <p style={{ margin: 0, fontSize: s.big ? '18px' : '10.5px', fontWeight: 800, color: s.value.includes('DEGRADED') ? '#f59e0b' : '#fff', lineHeight: 1.1 }}>
                    {s.value}
                    {s.big && 'unit' in s && s.unit && <span style={{ fontSize: '9px', fontWeight: 400, color: '#64748b', marginLeft: '3px' }}>{s.unit}</span>}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* On-the-fly customizer */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
            <p style={{ margin: '0 0 8px', fontSize: '8px', color: '#64748b', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>QUICK TACTICAL OVERRIDE</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Weather */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 700, width: '56px', flexShrink: 0 }}>WEATHER</span>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {['default','clear','foggy','dust-storm','rainy'].map(w => (
                    <button key={w} onClick={() => setCustomWeather(w)}
                      style={{ backgroundColor: customWeather === w ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.04)', border: `1px solid ${customWeather === w ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.08)'}`, color: customWeather === w ? '#f59e0b' : '#94a3b8', fontSize: '8px', fontWeight: 700, padding: '3px 7px', borderRadius: '999px', cursor: 'pointer', letterSpacing: '0.04em', fontFamily: 'inherit', transition: 'all 0.12s ease' }}>
                      {w === 'default' ? 'DEF' : w === 'clear' ? 'CLR' : w === 'foggy' ? 'FOG' : w === 'dust-storm' ? 'DUST' : 'RAIN'}
                    </button>
                  ))}
                </div>
              </div>
              {/* Day/Night */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 700, width: '56px', flexShrink: 0 }}>TIME</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {['default','day','night'].map(t => (
                    <button key={t} onClick={() => setCustomTime(t)}
                      style={{ backgroundColor: customTime === t ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.04)', border: `1px solid ${customTime === t ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.08)'}`, color: customTime === t ? '#f59e0b' : '#94a3b8', fontSize: '8px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', cursor: 'pointer', letterSpacing: '0.04em', fontFamily: 'inherit', transition: 'all 0.12s ease' }}>
                      {t === 'default' ? 'DEFAULT' : t.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              {/* Toggle switches */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { label: '🐝 SWARM', val: forceSwarm, set: setForceSwarm },
                  { label: '🎭 DECOYS', val: forceDecoys, set: setForceDecoys },
                ].map(({ label, val, set }) => (
                  <button key={label} onClick={() => set(!val)}
                    style={{ flex: 1, backgroundColor: val ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.04)', border: `1px solid ${val ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.08)'}`, color: val ? '#fbbf24' : '#94a3b8', fontSize: '9px', fontWeight: 800, padding: '6px 8px', borderRadius: '999px', cursor: 'pointer', letterSpacing: '0.04em', fontFamily: 'inherit', transition: 'all 0.12s ease', boxShadow: val ? '0 0 10px rgba(245,158,11,0.2)' : 'none' }}>
                    {label} {val ? 'ON' : 'OFF'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Threat types */}
          <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '8px', color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>THREATS:</span>
            {level.types.map(t => (
              <span key={t} style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {t === 'commercial' ? '🟡' : t === 'military' ? '🔴' : '🟣'}
                <span style={{ fontSize: '9px', textTransform: 'capitalize', fontWeight: 600 }}>{t}</span>
              </span>
            ))}
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Launch CTA */}
          <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            {(customWeather !== 'default' || customTime !== 'default' || forceSwarm || forceDecoys) && (
              <div style={{ marginBottom: '10px', backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '10px', padding: '6px 12px' }}>
                <p style={{ margin: 0, fontSize: '8.5px', color: '#f59e0b', fontWeight: 700 }}>
                  ⚙ CUSTOM OVERRIDES ACTIVE
                  {customWeather !== 'default' ? ` · WX:${customWeather.toUpperCase()}` : ''}
                  {customTime !== 'default' ? ` · ${customTime.toUpperCase()}` : ''}
                  {forceSwarm ? ' · +SWARM' : ''}
                  {forceDecoys ? ' · +DECOYS' : ''}
                </p>
              </div>
            )}
            <button
              onClick={handleLaunch}
              disabled={locked}
              style={{
                width: '100%',
                background: locked ? 'rgba(255,255,255,0.05)' : '#f59e0b',
                color: locked ? '#475569' : '#050812',
                fontWeight: 900, padding: '13px 16px', borderRadius: '4px',
                fontSize: '12px', border: 'none',
                cursor: locked ? 'not-allowed' : 'pointer',
                letterSpacing: '0.08em', fontFamily: 'monospace',
                textTransform: 'uppercase',
                transition: 'all 0.15s ease',
                boxShadow: locked ? 'none' : '0 0 20px rgba(245, 158, 11, 0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
              onMouseOver={e => !locked && (e.currentTarget.style.backgroundColor = '#fbbf24')}
              onMouseOut={e => !locked && (e.currentTarget.style.backgroundColor = '#f59e0b')}
            >
              {locked ? '🔒 TIER LOCKED' : `⚡ ARM & COMMENCE MISSION #${String(selectedLevel).padStart(2,'0')} →`}
            </button>
          </div>
        </div>
      </div>

      {/* ── PROFILE SELECTOR MODAL ────────────────────────────────────────── */}
      {showProfileSelector && !showTutorial && (
        <ProfileSelector
          onSelect={() => { setShowProfileSelector(false); refreshState(); }}
          onCancel={getActiveProfileId() ? () => setShowProfileSelector(false) : undefined}
          defaultPortal={profilePortal}
        />
      )}

      {/* ── FIRST-RUN TUTORIAL OVERLAY ────────────────────────────────────── */}
      {showTutorial && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ maxWidth: '580px', width: '100%', backgroundColor: '#111827', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '24px', padding: '36px 40px' }}>
            <div style={{ marginBottom: '24px' }}>
              <p style={{ margin: 0, fontSize: '9px', color: '#f59e0b', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                INDIAN AIR FORCE &amp; ARMY AIR DEFENCE &mdash; INTEGRATED DEFENSE COMMAND
              </p>
              <h1 style={{ margin: '8px 0 4px', fontSize: '26px', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>Welcome to DroneShield</h1>
              <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>AI-Enabled Counter-Drone Threat Simulation Trainer — 125 Real-World Scenarios</p>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <p style={{ margin: '0 0 10px', fontSize: '9px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>HOW IT WORKS — OODA LOOP</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {([
                  { n:1, stage:'OBSERVE',  desc:'Click radar blip to acquire threat',        color:'#3b82f6' },
                  { n:2, stage:'ORIENT',   desc:'Read 4-sensor data + AI assessment',         color:'#8b5cf6' },
                  { n:3, stage:'DECIDE',   desc:'Classify type + intent (1/2/3, H/N/F)',     color:'#f59e0b' },
                  { n:4, stage:'ACT',      desc:'Deploy C-UAS effector (Q/T/W/Y/E/R)',       color:'#22c55e' },
                ]).map(o => (
                  <div key={o.stage} style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: o.color, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px', fontSize: '11px', fontWeight: 900, color: '#fff' }}>{o.n}</div>
                    <p style={{ margin: '0 0 4px', fontSize: '10px', fontWeight: 800, color: o.color, letterSpacing: '0.05em' }}>{o.stage}</p>
                    <p style={{ margin: 0, fontSize: '9px', color: '#6b7280', lineHeight: '1.3' }}>{o.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ backgroundColor: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px' }}>
              <p style={{ margin: '0 0 8px', fontSize: '9px', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>COMBAT READINESS METRIC — per engagement (max 100 pts)</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '6px' }}>
                {[{pts:'30',label:'Detection Speed'},{pts:'30',label:'Classification'},{pts:'25',label:'Engagement'},{pts:'15',label:'Speed'}].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#f59e0b' }}>{s.pts}</p>
                    <p style={{ margin: 0, fontSize: '9px', color: '#6b7280' }}>{s.label}</p>
                  </div>
                ))}
              </div>
              <p style={{ margin: 0, fontSize: '10px', color: '#ef4444', textAlign: 'center', fontWeight: 600 }}>Fratricide (engaging neutral/friendly) = −25 pts</p>
            </div>
            <button onClick={() => { localStorage.setItem('droneshield-tutorial-done','1'); setShowTutorial(false); refreshState(); if (!getActiveProfileId()) setShowProfileSelector(true); }}
              style={{ width: '100%', backgroundColor: '#f59e0b', color: '#0a0a0f', fontWeight: 800, padding: '16px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: '15px', letterSpacing: '-0.01em', fontFamily: 'inherit' }}>
              Begin Training →
            </button>
            <p style={{ margin: '10px 0 0', textAlign: 'center', fontSize: '10px', color: '#374151' }}>INTEGRATED COUNTER-UAS C2 SYSTEM — Indian Armed Forces Air Defense Command</p>
          </div>
        </div>
      )}

      {/* ── TACTICAL MANUAL MODAL ────────────────────────────────────── */}
      <TacticalManualModal isOpen={showManual} onClose={() => setShowManual(false)} />

      <style>{`
        @keyframes radarSweep { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes hudPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
      `}</style>
    </div>
  );
}
