'use client';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AnimatePresence } from 'framer-motion';
import { useGameState } from '@/hooks/useGameState';
import HUDBar from '@/components/HUDBar';
import ClassificationPanel from '@/components/ClassificationPanel';
import { saveSession, getActiveProfileId, getProfile } from '@/lib/storage';
import type { CountermeasureType } from '@/types';
import { getLevel } from '@/lib/levels';
import type { Level } from '@/lib/levels';
import { getROE } from '@/lib/roe';
import React from 'react';
import { playRadarChirp, playAlertTone, playBreachKlaxon, playSuccessChime, playErrorBuzz, playLockAcquired, playEffectorLaunch, playRadioSquelch, isMuted, setMuted } from '@/lib/audio';
import TacticalManualModal from '@/components/TacticalManualModal';

const SimulationMap = dynamic(() => import('@/components/SimulationMap'), { ssr: false });

function speak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  if (isMuted()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.1;
  u.pitch = 0.9;
  u.volume = 0.8;
  window.speechSynthesis.speak(u);
}

export default function SimulationPage() {
  const router = useRouter();
  const [levelNum, setLevelNum] = useState(1);
  const [ready, setReady] = useState(false);
  const [showEndOverlay, setShowEndOverlay] = useState(false);
  const [spawnToast, setSpawnToast] = useState<string | null>(null);
  const [breachFlash, setBreachFlash] = useState(false);
  const [streakToast, setStreakToast] = useState<string | null>(null);
  const [neutralizedToast, setNeutralizedToast] = useState<string | null>(null);
  const [showROE, setShowROE] = useState(false);
  const [satellite, setSatellite] = useState(true);
  const [activeEngagement, setActiveEngagement] = useState<{ lat: number; lng: number; cm: CountermeasureType } | null>(null);
  const [bdaProof, setBdaProof] = useState<{ cm: CountermeasureType; modelName?: string; correct: boolean } | null>(null);
  const [deployEffects, setDeployEffects] = useState<Array<{ id: string; type: string }>>([]);
  const prevActiveRef = useRef(0);
  const prevBreachRef = useRef(0);
  const prevStreakRef = useRef(0);
  const prevDecisionsLenRef = useRef(0);
  const startedAt = useRef(Date.now());
  const [autoCoverMap, setAutoCoverMap] = useState(true);
  const [showTacticalManual, setShowTacticalManual] = useState(false);

  const [levelOverride, setLevelOverride] = useState<Partial<Level> | undefined>(undefined);

  // ── Instructor inject states ───────────────────────────────────────────────
  const [showInjectPanel, setShowInjectPanel] = useState(false);
  const [injectCooldowns, setInjectCooldowns] = useState<Record<string, number>>({});
  const [mutedState, setMutedState] = useState(false);
  const [ammo, setAmmo] = useState({ interceptor: 6, ew: 4 });
  const [roeWarning, setRoeWarning] = useState<string | null>(null);
  const [radioLogs, setRadioLogs] = useState<Array<{ id: string; time: string; msg: string; color: string }>>([]);
  const seenThreatIds = useRef<Set<string>>(new Set());
  const seenSprints   = useRef<Set<string>>(new Set());

  useEffect(() => {
    const stored = sessionStorage.getItem('level');
    if (stored) setLevelNum(Number(stored));
    const custom = sessionStorage.getItem('custom-scenario');
    if (custom) {
      try { setLevelOverride(JSON.parse(custom)); } catch {}
      sessionStorage.removeItem('custom-scenario');
    }
    if (sessionStorage.getItem('demo-mode') === '1') {
      setShowTacticalManual(true);
      sessionStorage.removeItem('demo-mode');
    }
    setReady(true);
  }, []);

  const {
    threats, decisions, timeLeft, phase,
    selectedThreat, neutralizedCount, score, totalTime, threatQuota,
    baseHealth, breachCount, streak,
    nightMode, targetLat, targetLng, targetName, threatDirection,
    sensorDegradation, degradedFields, environment, weather, spawnSectors,
    injectSensorJam, injectSpeedBoost,
    injectJamming, injectDecoy, injectEvasion, injectTimeCompress,
    handleDetect, handleClassifyAndDeploy, dismiss,
    paused, togglePause,
  } = useGameState(levelNum, levelOverride);

  const activeThreatCount = useMemo(() => threats.filter(t => !t.neutralized).length, [threats]);

  // ROE card for this mission's tier
  const roe = useMemo(() => getROE(levelNum), [levelNum]);

  // Decision timeout: scales down from 22s at level 1 to 8s minimum
  const classifyTimeout = Math.max(8, 22 - Math.floor(levelNum / 100));

  // Effector deploy with ammo decrement + ROE collateral warning + military audio
  const handleDeployWithFeedback = (...args: Parameters<typeof handleClassifyAndDeploy>) => {
    const [type, , cm] = args;
    playEffectorLaunch(cm);
    const urbanNuclear = environment === 'urban' ||
      targetName.includes('Atomic') || targetName.includes('Nuclear') ||
      targetName.includes('Golden Temple') || targetName.includes('Central Vista');
    if (urbanNuclear && cm === 'interceptor' && type === 'commercial') {
      setRoeWarning('⚠ ROE CAUTION: Kinetic SAM debris hazard over restricted Urban/Nuclear zone — prefer Soft-Kill [Q]/[T] or Laser DEW [Y]!');
      setTimeout(() => setRoeWarning(null), 5000);
    }
    if (cm === 'interceptor') setAmmo(a => ({ ...a, interceptor: Math.max(0, a.interceptor - 1) }));
    if (cm === 'ew')          setAmmo(a => ({ ...a, ew: Math.max(0, a.ew - 1) }));
    handleClassifyAndDeploy(...args);
  };

  const handleDetectWithFeedback = (threat: any) => {
    playLockAcquired();
    playRadioSquelch();
    handleDetect(threat);
  };

  // Priority threat: highest urgency (threat rating / ETA) undetected threat
  const priorityThreat = useMemo(() => {
    const undetected = threats.filter(t => !t.neutralized && !t.detected);
    if (!undetected.length) return null;
    const WEIGHT: Record<string, number> = { LOW: 1, MEDIUM: 1.5, HIGH: 2, CRITICAL: 3 };
    return undetected.reduce((best, t) => {
      const distT = Math.sqrt((t.targetLat - t.lat) ** 2 + (t.targetLng - t.lng) ** 2);
      const etaT = (distT / Math.max(t.speed, 0.0001)) * 0.2;
      const urgencyT = (WEIGHT[t.threatRating] ?? 1) / etaT;
      const distB = Math.sqrt((best.targetLat - best.lat) ** 2 + (best.targetLng - best.lng) ** 2);
      const etaB = (distB / Math.max(best.speed, 0.0001)) * 0.2;
      const urgencyB = (WEIGHT[best.threatRating] ?? 1) / etaB;
      return urgencyT > urgencyB ? t : best;
    });
  }, [threats]);

  const priorityThreatData = useMemo(() => {
    if (!priorityThreat) return null;
    const dist = Math.sqrt(
      (priorityThreat.targetLat - priorityThreat.lat) ** 2 +
      (priorityThreat.targetLng - priorityThreat.lng) ** 2
    );
    const etaSec = Math.max(1, Math.round((dist / Math.max(priorityThreat.speed, 0.0001)) * 0.2));
    return { type: priorityThreat.type, threatRating: priorityThreat.threatRating, etaSec };
  }, [priorityThreat]);

  // ── Document title updates with mission name ───────────────────────────────
  useEffect(() => {
    if (!ready) return;
    const lvl = getLevel(levelNum);
    document.title = `Mission ${String(levelNum).padStart(2, '0')} — ${lvl.name} | DroneShield`;
    return () => { document.title = 'DroneShield — AI-Enabled Counter-Drone Trainer | IDAS-C4I'; };
  }, [ready, levelNum]);

  // ── Breach flash (red screen when base takes damage) ─────────────────────
  useEffect(() => {
    if (breachCount > prevBreachRef.current && phase === 'playing') {
      setBreachFlash(true);
      playBreachKlaxon();
      speak('Breach detected. Base integrity reduced.');
      const t = setTimeout(() => setBreachFlash(false), 700);
      prevBreachRef.current = breachCount;
      return () => clearTimeout(t);
    }
    prevBreachRef.current = breachCount;
  }, [breachCount, phase]);

  // ── Streak milestone toast ─────────────────────────────────────────────────
  useEffect(() => {
    const prev = prevStreakRef.current;
    prevStreakRef.current = streak;
    if (streak > prev && [5, 10, 20].includes(streak)) {
      const msg = streak >= 20 ? '20 CONSECUTIVE — ELITE OPERATOR' : streak >= 10 ? '10 CONSECUTIVE — EXCEPTIONAL PERFORMANCE' : '5 CONSECUTIVE — CONSISTENT PERFORMANCE';
      setStreakToast(msg);
      speak(msg.toLowerCase().replace(/—/g, '.'));
      const t = setTimeout(() => setStreakToast(null), 2500);
      return () => clearTimeout(t);
    }
  }, [streak]);

  // ── Neutralization feedback toast ─────────────────────────────────────────
  useEffect(() => {
    if (decisions.length > prevDecisionsLenRef.current) {
      const last = decisions[decisions.length - 1];
      let toastTimer: ReturnType<typeof setTimeout> | undefined;

      if (last?.correct) {
        playSuccessChime();
        setNeutralizedToast(last.countermeasure.toUpperCase().replace(/-/g, ' ') + ' DEPLOYED');
        speak(last.countermeasure.replace(/-/g, ' ') + ' deployed. Threat neutralized.');
        toastTimer = setTimeout(() => setNeutralizedToast(null), 1800);
        const effectId = `${Date.now()}`;
        setDeployEffects(prev => [...prev, { id: effectId, type: last.countermeasure }]);
        setTimeout(() => setDeployEffects(prev => prev.filter(e => e.id !== effectId)), 2000);
      } else if (last && !last.correct) {
        playErrorBuzz();
        speak('Engagement error. Review doctrine.');
      }

      // Always draw weapon beam on map from defending battery to intercept coordinates
      if (last) {
        const engPt = last.path?.length
          ? last.path[last.path.length - 1]
          : { lat: last.spawnLat, lng: last.spawnLng };
        setActiveEngagement({
          lat: engPt.lat, lng: engPt.lng,
          cm: last.countermeasure,
          batLat: last.batteryLat,
          batLng: last.batteryLng,
          batName: last.batteryName,
        } as any);
        setTimeout(() => setActiveEngagement(null), 2600);
        // BDA visual proof feed
        setBdaProof({ cm: last.countermeasure, modelName: last.modelName, correct: last.correct });
        setTimeout(() => setBdaProof(null), 3800);
      }

      // Push engagement entry to radio log with authentic launch battery callout
      if (last) {
        const now = new Date();
        const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}Z`;
        const cm = last.countermeasure.toUpperCase().replace(/-/g,' ');
        const outcome = last.correct ? 'NEUTRALIZED' : 'MISS — DOCTRINE REVIEW';
        const batStr = last.batteryName ? `${last.batteryName.split(' ')[0]} → ` : '';
        setRadioLogs(prev => [{
          id: `eng-${Date.now()}`, time: ts,
          msg: `C2 CTRL: ${batStr}TRK #${last.threatId?.slice(-3).toUpperCase() ?? 'UNK'} ${cm} → ${outcome}`,
          color: last.correct ? '#f59e0b' : '#ff3344',
        }, ...prev].slice(0, 5));
      }

      prevDecisionsLenRef.current = decisions.length;
      return () => { if (toastTimer) clearTimeout(toastTimer); };
    }
    prevDecisionsLenRef.current = decisions.length;
  }, [decisions]);

  // ── Spawn toast notification ──────────────────────────────────────────────
  useEffect(() => {
    const activeUndetected = threats.filter(t => !t.neutralized && !t.detected).length;
    if (activeUndetected > prevActiveRef.current && phase === 'playing') {
      if (activeThreatCount >= 3) playAlertTone();
      else playRadarChirp();
      setSpawnToast('NEW THREAT DETECTED ON RADAR');
      speak('New contact on radar. Classify and engage.');
      const t = setTimeout(() => setSpawnToast(null), 2200);
      prevActiveRef.current = activeUndetected;
      return () => clearTimeout(t);
    }
    prevActiveRef.current = activeUndetected;
  }, [threats, phase]);

  // ── IACCS Radio log: new tracks + sprint alerts ───────────────────────────
  useEffect(() => {
    const now = new Date();
    const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}Z`;
    const newEntries: Array<{ id: string; time: string; msg: string; color: string }> = [];
    threats.forEach(t => {
      if (!seenThreatIds.current.has(t.id)) {
        seenThreatIds.current.add(t.id);
        const profile = (t.flightProfile ?? 'standard').toUpperCase().replace(/-/g,' ');
        newEntries.push({ id: `spawn-${t.id}`, time: ts,
          msg: `AWACS LINK: NEW TRACK #${t.id.slice(-3).toUpperCase()} BRG ${t.heading}° ALT ${t.altitude}M (${profile})`,
          color: '#00ff88' });
      }
      if (t.sprintActive && !seenSprints.current.has(t.id)) {
        seenSprints.current.add(t.id);
        newEntries.push({ id: `sprint-${t.id}`, time: ts,
          msg: `⚠ TWR ALERT: TRACK #${t.id.slice(-3).toUpperCase()} EXECUTING 1.9x KAMIKAZE TERMINAL DIVE!`,
          color: '#ff3344' });
      }
    });
    if (newEntries.length > 0) setRadioLogs(prev => [...newEntries, ...prev].slice(0, 4));
  }, [threats]);



  // ── Keyboard shortcuts: [M] manual, [I] inject panel, [U] mute, [P] pause ────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'm' || e.key === 'M') setShowTacticalManual(v => !v);
      if (e.key === 'i' || e.key === 'I') setShowInjectPanel(v => !v);
      if (e.key === 'u' || e.key === 'U') {
        setMutedState(v => {
          const next = !v;
          setMuted(next);
          if (next && typeof window !== 'undefined') window.speechSynthesis?.cancel();
          return next;
        });
      }
      if (e.key === 'p' || e.key === 'P') togglePause();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePause]);

  // ── Alert state (ROUTINE → ALERT → SCRAMBLE) ──────────────────────────────
  const alertState = useMemo((): 'ROUTINE' | 'ALERT' | 'SCRAMBLE' => {
    const active = threats.filter(t => !t.neutralized).length;
    if (active === 0) return 'ROUTINE';
    const closest = threats
      .filter(t => !t.neutralized)
      .map(t => {
        const dLat = t.lat - targetLat, dLng = t.lng - targetLng;
        return Math.sqrt(dLat * dLat + dLng * dLng);
      })
      .reduce((min, d) => Math.min(min, d), Infinity);
    if (closest < 0.8) return 'SCRAMBLE';
    if (closest < 2.0 || active >= 3) return 'ALERT';
    return 'ROUTINE';
  }, [threats, targetLat, targetLng]);

  // ── Breach proximity warning ──────────────────────────────────────────────
  const breachWarning = alertState === 'SCRAMBLE';

  const savedRef = useRef(false);
  useEffect(() => {
    if (phase !== 'ended' || savedRef.current) return;
    savedRef.current = true;
    const activeProfileId = getActiveProfileId();
    const currentProfile = getProfile();
    const session = {
      id: Math.random().toString(36).slice(2),
      difficulty: 'easy' as const,
      level: levelNum,
      score,
      startedAt: startedAt.current,
      endedAt: Date.now(),
      decisions,
      breachCount,
      baseHealth,
      profileId: activeProfileId ?? undefined,
      operatorName: currentProfile.name || undefined,
      unit: currentProfile.unit || undefined,
    };
    saveSession(session);
    sessionStorage.setItem('last-session', JSON.stringify(session));
    setShowEndOverlay(true);
    setTimeout(() => router.push('/aar'), 2800);
  }, [phase, levelNum, score, decisions, breachCount, baseHealth, router]);

  // ── Reset inject panel when mission ends ──────────────────────────────────
  useEffect(() => {
    if (phase === 'ended') {
      setShowInjectPanel(false);
      setInjectCooldowns({});
    }
  }, [phase]);

  // ── Inject helper ──────────────────────────────────────────────────────────
  function triggerInject(key: string, fn: () => void, cooldownMs: number) {
    if (injectCooldowns[key] && Date.now() < injectCooldowns[key]) return;
    fn();
    setInjectCooldowns(prev => ({ ...prev, [key]: Date.now() + cooldownMs }));
  }

  if (!ready) return null;

  const missionSuccess = neutralizedCount >= threatQuota;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#0a0a0f', display: 'flex', flexDirection: 'column' }}>
      <HUDBar
        score={score}
        timeLeft={timeLeft}
        totalTime={totalTime}
        threatsNeutralized={neutralizedCount}
        threatQuota={threatQuota}
        targetName={targetName}
        levelNum={levelNum}
        baseHealth={baseHealth}
        streak={streak}
        alertState={alertState}
        activeThreats={activeThreatCount}
        priorityThreat={priorityThreatData}
        muted={mutedState}
        onToggleMute={() => {
          setMutedState(v => {
            const next = !v;
            setMuted(next);
            if (next && typeof window !== 'undefined') window.speechSynthesis?.cancel();
            return next;
          });
        }}
        paused={paused}
        onTogglePause={togglePause}
      />
      {/* ── HIGH-DENSITY MILITARY C2 CONSOLE LAYOUT ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0, position: 'relative' }}>

        {/* ── ZONE 1: LEFT DOCKED TACTICAL TELEMETRY RAIL ── */}
        {phase !== 'ended' && (
          <aside style={{
            width: '320px', flexShrink: 0,
            backgroundColor: '#060a14',
            borderRight: '1px solid rgba(56, 189, 248, 0.22)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden', zIndex: 100,
          }}>
            {/* 1.1 Tactical Quick Toolbar */}
            <div style={{
              padding: '8px 10px',
              backgroundColor: '#040711',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap',
            }}>
              <button
                onClick={() => setShowROE(v => !v)}
                style={{
                  backgroundColor: showROE ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${showROE ? 'rgba(245,158,11,0.6)' : 'rgba(255,255,255,0.12)'}`,
                  color: showROE ? '#fbbf24' : '#94a3b8', fontSize: '9px', fontWeight: 800,
                  padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'monospace',
                  letterSpacing: '0.04em',
                }}
              >
                ROE {showROE ? '▲' : '▼'}
              </button>
              <button
                onClick={() => setShowTacticalManual(v => !v)}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#94a3b8', fontSize: '9px', fontWeight: 800,
                  padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'monospace',
                }}
              >
                MANUAL [M]
              </button>
              <button
                onClick={() => setSatellite(s => !s)}
                style={{
                  backgroundColor: satellite ? 'rgba(56,189,248,0.18)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${satellite ? 'rgba(56,189,248,0.5)' : 'rgba(255,255,255,0.12)'}`,
                  color: satellite ? '#38bdf8' : '#94a3b8', fontSize: '9px', fontWeight: 800,
                  padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'monospace',
                }}
              >
                {satellite ? '🛰 SAT' : '🗺 VEC'}
              </button>
              <button
                onClick={() => router.push('/presentation')}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#94a3b8', fontSize: '9px', fontWeight: 800,
                  padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'monospace',
                }}
              >
                DECK
              </button>
            </div>

            {/* 1.2 Collapsible ROE Sub-Panel */}
            {showROE && (
              <div style={{
                padding: '10px 12px',
                backgroundColor: 'rgba(245,158,11,0.05)',
                borderBottom: '1px solid rgba(245,158,11,0.25)',
                fontSize: '9px', fontFamily: 'monospace',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 800, color: '#f59e0b' }}>ROE: {roe.sector}</span>
                  <span style={{ color: roe.alertLevel === 'RED' ? '#ef4444' : '#f59e0b', fontWeight: 800 }}>[{roe.alertLevel}]</span>
                </div>
                <div style={{ color: '#22c55e', margin: '2px 0' }}>✓ AUTH: {roe.authorized.join(', ')}</div>
                <div style={{ color: '#ef4444', margin: '2px 0' }}>✗ RESTRICT: {roe.restricted.join(', ')}</div>
              </div>
            )}

            {/* 1.3 C2 Air Picture Track Table */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
              <div style={{
                padding: '6px 10px',
                backgroundColor: '#040812',
                borderBottom: '1px solid rgba(0,255,136,0.15)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
              }}>
                <span style={{ fontSize: '9px', fontWeight: 800, color: '#00ff88', fontFamily: 'monospace', letterSpacing: '0.08em' }}>
                  ● RADAR CONTACTS ({activeThreatCount})
                </span>
                <span style={{ fontSize: '8px', color: '#64748b', fontFamily: 'monospace' }}>
                  IFF STATUS
                </span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {threats.filter(t => !t.neutralized).length === 0 ? (
                  <div style={{ padding: '24px 12px', textAlign: 'center', color: '#475569', fontSize: '10px', fontFamily: 'monospace' }}>
                    NO UNCORRELATED TRACKS IN AIRSPACE
                  </div>
                ) : (
                  threats
                    .filter(t => !t.neutralized)
                    .sort((a, b) => {
                      const dA = Math.sqrt((a.targetLat - a.lat) ** 2 + (a.targetLng - a.lng) ** 2);
                      const dB = Math.sqrt((b.targetLat - b.lat) ** 2 + (b.targetLng - b.lng) ** 2);
                      return dA - dB;
                    })
                    .map(t => {
                      const distDeg = Math.sqrt((t.targetLat - t.lat) ** 2 + (t.targetLng - t.lng) ** 2);
                      const distKm  = (distDeg * 111).toFixed(1);
                      const etaSec  = t.speed > 0 ? Math.max(1, Math.round((distDeg / t.speed) * 0.2)) : 99;
                      const toRad   = (x: number) => (x * Math.PI) / 180;
                      const y = Math.sin(toRad(t.lng - targetLng)) * Math.cos(toRad(t.lat));
                      const x = Math.cos(toRad(targetLat)) * Math.sin(toRad(t.lat)) -
                                Math.sin(toRad(targetLat)) * Math.cos(toRad(t.lat)) * Math.cos(toRad(t.lng - targetLng));
                      const brg = Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
                      const isSelected   = t.id === selectedThreat?.id;
                      const urgencyColor = isSelected ? '#00e5ff' : etaSec < 12 ? '#ff3344' : t.detected ? '#00e5ff' : '#00ff88';
                      const trackCode    = `TRK-${t.id.slice(-3).toUpperCase()}`;
                      const statusLabel  = t.detected ? (isSelected ? 'LOCKED' : 'ACQUIRED') : 'BOGEY';
                      return (
                        <div
                          key={t.id}
                          onClick={() => !paused && handleDetectWithFeedback(t)}
                          style={{
                            display: 'flex', alignItems: 'stretch',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            cursor: paused ? 'not-allowed' : 'pointer',
                            backgroundColor: isSelected ? 'rgba(0,229,255,0.12)' : 'transparent',
                            transition: 'background 0.1s',
                          }}
                        >
                          <div style={{ width: '3px', flexShrink: 0, backgroundColor: urgencyColor }} />
                          <div style={{ flex: 1, padding: '6px 8px', fontFamily: 'monospace', fontSize: '9px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 800, color: urgencyColor }}>{trackCode}</span>
                              <span style={{
                                fontSize: '8px', fontWeight: 800, padding: '1px 4px', borderRadius: '2px',
                                backgroundColor: isSelected ? 'rgba(0,229,255,0.2)' : 'rgba(255,255,255,0.06)',
                                color: urgencyColor,
                              }}>
                                [{statusLabel}]
                              </span>
                            </div>
                            <div style={{ color: '#94a3b8', marginTop: '2px', lineHeight: 1.3 }}>
                              BRG {String(brg).padStart(3, '0')}° · {distKm}KM · ALT {t.altitude}M
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', marginTop: '1px' }}>
                              <span>ETA: <b style={{ color: etaSec < 12 ? '#ff3344' : '#e2e8f0' }}>{etaSec}s</b></span>
                              <span style={{ color: '#38bdf8' }}>{t.payload ? t.payload.slice(0, 16) : 'ORDNANCE'}</span>
                            </div>
                            {/* Special Warfare Indicators */}
                            {(t.isMaskedAsCivilian || t.isFiberOptic || t.unmasked) && (
                              <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginTop: '2px' }}>
                                {t.isMaskedAsCivilian && !t.unmasked && (
                                  <span style={{ fontSize: '7.5px', color: '#fbbf24', background: 'rgba(245,158,11,0.2)', padding: '1px 3px', borderRadius: '2px' }}>
                                    ✈ MASK: {t.maskedCallsign?.split(' ')[0] ?? 'CIVIL'}
                                  </span>
                                )}
                                {t.isFiberOptic && (
                                  <span style={{ fontSize: '7.5px', color: '#f59e0b', background: 'rgba(245,158,11,0.2)', padding: '1px 3px', borderRadius: '2px' }}>
                                    ⚡ FO-FPV (RF IMMUNE)
                                  </span>
                                )}
                                {t.unmasked && (
                                  <span style={{ fontSize: '7.5px', color: '#ef4444', background: 'rgba(239,68,68,0.2)', padding: '1px 3px', borderRadius: '2px' }}>
                                    ⚠ UNMASKED SWARM
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            {/* 1.4 Integrated IACCS Tactical Data-Link Stream */}
            <div style={{
              height: '140px', flexShrink: 0,
              backgroundColor: '#03060c',
              borderTop: '1px solid rgba(56, 189, 248, 0.22)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '4px 8px',
                backgroundColor: '#020408',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
              }}>
                <span style={{ fontSize: '8px', fontWeight: 800, color: 'rgba(0,255,136,0.7)', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                  ● IACCS DATA-LINK FEED
                </span>
                <span style={{ fontSize: '7.5px', color: '#475569', fontFamily: 'monospace' }}>SECURE LINK</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '4px 6px' }}>
                {radioLogs.length === 0 ? (
                  <div style={{ color: '#334155', fontSize: '8.5px', fontFamily: 'monospace', padding: '6px' }}>
                    Standby for telemetry broadcast...
                  </div>
                ) : (
                  radioLogs.map(entry => (
                    <div key={entry.id} style={{ fontFamily: 'monospace', fontSize: '8.5px', lineHeight: '1.4', marginBottom: '3px' }}>
                      <span style={{ color: '#475569', marginRight: '4px' }}>[{entry.time}]</span>
                      <span style={{ color: entry.color }}>{entry.msg}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        )}

        {/* ── ZONE 2: CENTER TACTICAL AIR PICTURE (LEAFLET MAP) ── */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <SimulationMap
            threats={threats}
            onThreatClick={handleDetectWithFeedback}
            nightMode={nightMode}
            targetLat={targetLat}
            targetLng={targetLng}
            targetName={targetName}
            weather={weather}
            environment={environment}
            satellite={satellite}
            spawnSectors={spawnSectors}
            selectedThreatId={selectedThreat?.id ?? null}
            activeEngagement={activeEngagement}
          />

          {/* Priority Threat Ingress Alert Banner (Centered Top of Map) */}
          {phase === 'playing' && priorityThreat && !selectedThreat && (
            <div style={{
              position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)',
              zIndex: 900, display: 'flex', alignItems: 'center', gap: '10px',
              backgroundColor: 'rgba(8, 12, 22, 0.95)',
              border: '1.5px solid rgba(239, 68, 68, 0.7)',
              borderRadius: '6px', padding: '6px 14px',
              boxShadow: '0 4px 24px rgba(239, 68, 68, 0.35)',
              animation: 'hudPulse 0.8s infinite',
            }}>
              <span style={{ fontSize: '13px' }}>🚨</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 900, color: '#f87171', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                    INGRESS ALERT: {priorityThreat.modelName || priorityThreat.type.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '8.5px', fontWeight: 800, color: '#fca5a5', background: 'rgba(239,68,68,0.2)', padding: '1px 5px', borderRadius: '2px' }}>
                    {priorityThreat.threatRating}
                  </span>
                </div>
                <div style={{ fontSize: '9px', color: '#94a3b8', fontFamily: 'monospace' }}>
                  Payload: <b style={{ color: '#fca5a5' }}>{priorityThreat.payload}</b> · Origin: <span style={{ color: '#93c5fd' }}>{priorityThreat.origin}</span>
                </div>
              </div>
              <button
                onClick={() => !paused && handleDetectWithFeedback(priorityThreat)}
                disabled={paused}
                style={{
                  backgroundColor: paused ? '#4b5563' : '#ef4444', color: '#fff', border: 'none',
                  borderRadius: '4px', padding: '5px 12px', fontSize: '9.5px', fontWeight: 800,
                  cursor: paused ? 'not-allowed' : 'pointer', letterSpacing: '0.05em', whiteSpace: 'nowrap',
                  fontFamily: 'monospace',
                }}
              >
                {paused ? '⏸ PAUSED' : 'SLEW &amp; ENGAGE →'}
              </button>
            </div>
          )}

          {/* BDA Visual Proof Feed (Docked at Bottom-Right of Center Map) */}
          {bdaProof && (
            <div style={{
              position: 'absolute', bottom: '16px', right: '16px',
              width: '320px', zIndex: 950,
              backgroundColor: 'rgba(4,8,18,0.96)',
              border: `1px solid ${bdaProof.correct ? 'rgba(34,197,94,0.45)' : 'rgba(239,68,68,0.45)'}`,
              borderRadius: '6px',
              boxShadow: '0 4px 30px rgba(0,0,0,0.8)',
              pointerEvents: 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 8px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block', animation: 'hudPulse 0.8s infinite' }} />
                <span style={{ fontSize: '8.5px', fontWeight: 800, color: '#ef4444', fontFamily: 'monospace', letterSpacing: '0.1em' }}>REC ● FLIR BDA HIT FEED</span>
              </div>
              <div style={{ padding: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <p style={{ margin: 0, fontSize: '9.5px', fontWeight: 800, fontFamily: 'monospace', color: bdaProof.correct ? '#22c55e' : '#ef4444' }}>
                    {bdaProof.correct ? '✓ BDA: THREAT NEUTRALIZED' : '✗ BDA: ENGAGEMENT MISS'}
                  </p>
                  <p style={{ margin: 0, fontSize: '8.5px', color: '#94a3b8', fontFamily: 'monospace' }}>
                    EFFECTOR: {bdaProof.cm.toUpperCase().replace(/-/g, ' ')}
                  </p>
                  {bdaProof.modelName && (
                    <p style={{ margin: 0, fontSize: '8.5px', color: '#f59e0b', fontFamily: 'monospace' }}>
                      TARGET: {bdaProof.modelName}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Abort Mission Button (Bottom-Left of Center Map) */}
          {phase !== 'ended' && (
            <button
              onClick={() => router.push('/')}
              style={{
                position: 'absolute', bottom: '16px', left: '16px', zIndex: 900,
                backgroundColor: 'rgba(6,10,20,0.85)', border: '1px solid rgba(255,255,255,0.12)',
                color: '#94a3b8', fontSize: '9.5px', fontWeight: 800,
                padding: '5px 10px', borderRadius: '4px', cursor: 'pointer',
                letterSpacing: '0.06em', fontFamily: 'monospace',
              }}
            >
              ↩ ABORT MISSION
            </button>
          )}

          {/* Pause Action Freeze Overlay */}
          {paused && phase === 'playing' && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 1100,
              backgroundColor: 'rgba(3, 10, 20, 0.65)',
              backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'not-allowed',
            }}>
              <div style={{
                backgroundColor: 'rgba(9, 14, 26, 0.98)',
                border: '1.5px solid rgba(59, 130, 246, 0.6)',
                borderRadius: '8px', padding: '18px 30px',
                textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
              }}>
                <p style={{ margin: 0, fontSize: '10.5px', color: '#60a5fa', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                  ⏸ SIMULATION PAUSED &middot; INSTRUCTOR DEBRIEF MODE
                </p>
                <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#fff', fontWeight: 800 }}>
                  All Operator Actions Frozen — Press [P] or Click RESUME in HUD to Continue
                </p>
              </div>
            </div>
          )}

          {/* Breach Damage Flash */}
          {breachFlash && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 1800,
              backgroundColor: 'rgba(239,68,68,0.22)',
              pointerEvents: 'none',
              animation: 'breachFlash 0.7s ease forwards',
            }} />
          )}

          {/* Sensor Jam Overlay */}
          {injectSensorJam && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(245,158,11,0.03)',
              pointerEvents: 'none', zIndex: 10,
              display: 'flex', alignItems: 'flex-end', padding: '8px',
            }}>
              <span style={{ fontSize: '9px', color: '#f59e0b', fontWeight: 700, letterSpacing: '0.1em', background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>
                RF DEGRADED — SENSOR JAMMING ACTIVE
              </span>
            </div>
          )}

          {/* Streak Milestone Toast */}
          {streakToast && (
            <div style={{
              position: 'absolute', bottom: '60px', left: '50%',
              transform: 'translateX(-50%)', zIndex: 900,
              backgroundColor: 'rgba(245,158,11,0.15)',
              border: '1px solid rgba(245,158,11,0.5)',
              borderRadius: '4px', padding: '6px 16px',
              color: '#f59e0b', fontWeight: 800, fontSize: '11px',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              pointerEvents: 'none', animation: 'fadeIn 0.2s ease', fontFamily: 'monospace',
            }}>
              ⚡ {streakToast}
            </div>
          )}

          {/* Time Critical Glow (last 10s) */}
          {timeLeft <= 10 && phase === 'playing' && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 1500,
              boxShadow: 'inset 0 0 80px 20px rgba(239,68,68,0.22)',
              pointerEvents: 'none', animation: 'timePulse 0.5s infinite',
            }} />
          )}

          {/* ROE Warning Toast */}
          {roeWarning && phase !== 'ended' && (
            <div style={{
              position: 'absolute', bottom: '70px', left: '50%', transform: 'translateX(-50%)',
              zIndex: 1000, backgroundColor: 'rgba(239,68,68,0.18)',
              border: '1px solid rgba(239,68,68,0.6)', borderRadius: '6px',
              padding: '6px 14px', maxWidth: '480px', textAlign: 'center',
              pointerEvents: 'none',
            }}>
              <p style={{ margin: 0, fontSize: '10.5px', fontWeight: 700, color: '#fca5a5', fontFamily: 'monospace' }}>
                {roeWarning}
              </p>
            </div>
          )}
        </div>

        {/* ── ZONE 3: RIGHT DOCKED FIRE CONTROL STATION ── */}
        <AnimatePresence>
          {phase === 'classifying' && selectedThreat && (
            <ClassificationPanel
              key={selectedThreat.id}
              threat={selectedThreat}
              targetName={targetName}
              approachFrom={threatDirection}
              sensorDegradation={sensorDegradation}
              degradedFields={degradedFields ?? []}
              classifyTimeout={classifyTimeout}
              ammo={ammo}
              paused={paused}
              onClassify={handleDeployWithFeedback}
              onDismiss={dismiss}
            />
          )}
        </AnimatePresence>
      </div>

        {/* Mission End overlay */}
        {showEndOverlay && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(10,10,15,0.93)',
          }}>
            <div style={{
              textAlign: 'center', padding: '48px 56px',
              border: `1px solid ${missionSuccess ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              borderRadius: '24px',
              background: missionSuccess ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
            }}>
              <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', color: missionSuccess ? '#22c55e' : '#ef4444', textTransform: 'uppercase' }}>
                {missionSuccess ? 'MISSION COMPLETE' : baseHealth <= 0 ? 'BASE COMPROMISED' : 'TIME EXPIRED'}
              </p>
              <p style={{ margin: '0 0 4px', fontSize: '52px', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{score}</p>
              <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                pts &nbsp;&middot;&nbsp; {neutralizedCount}/{threatQuota} neutralized &nbsp;&middot;&nbsp; base {baseHealth}%
              </p>
              <p style={{ margin: '20px 0 0', fontSize: '12px', color: '#4b5563' }}>Loading after-action review…</p>
            </div>
          </div>
        )}



        {/* Tactical C-UAS Operator Manual Modal */}
        <TacticalManualModal isOpen={showTacticalManual} onClose={() => setShowTacticalManual(false)} />

      {/* Instructor Inject Console */}
      {phase !== 'ended' && (
        <div style={{ position: 'fixed', bottom: '80px', right: '16px', zIndex: 200 }}>
          {/* Toggle button */}
          <button
            onClick={() => setShowInjectPanel(v => !v)}
            style={{
              display: 'block', marginLeft: 'auto',
              backgroundColor: showInjectPanel ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${showInjectPanel ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.12)'}`,
              color: showInjectPanel ? '#a78bfa' : '#6b7280',
              fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em',
              padding: '4px 10px', borderRadius: '6px', cursor: 'pointer',
            }}
          >
            INSTRUCTOR [I]
          </button>

          {showInjectPanel && (
            <div style={{
              marginTop: '6px',
              backgroundColor: 'rgba(10,10,15,0.96)',
              border: '1px solid rgba(139,92,246,0.3)',
              borderRadius: '10px', padding: '12px', width: '220px',
              backdropFilter: 'blur(8px)',
            }}>
              <p style={{ margin: '0 0 10px', fontSize: '9px', color: '#6b7280', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                INJECT — MID-MISSION
              </p>

              {([
                {
                  key: 'jam', label: 'RF JAMMING', sub: 'Degrade all RF sensors 20s',
                  color: '#f59e0b', fn: injectJamming, cooldown: 25_000,
                  active: injectSensorJam,
                },
                {
                  key: 'decoy', label: 'DECOY SPAWN', sub: 'Inject neutral contact now',
                  color: '#22c55e', fn: injectDecoy, cooldown: 10_000,
                  active: false,
                },
                {
                  key: 'evasion', label: 'EVASION MODE', sub: 'All threats speed ×1.5 for 15s',
                  color: '#ef4444', fn: injectEvasion, cooldown: 30_000,
                  active: injectSpeedBoost,
                },
                {
                  key: 'time', label: 'TIME COMPRESS', sub: 'Remove 30s from clock',
                  color: '#8b5cf6', fn: injectTimeCompress, cooldown: 20_000,
                  active: false,
                },
              ] as Array<{ key: string; label: string; sub: string; color: string; fn: () => void; cooldown: number; active: boolean }>).map(item => {
                const cooldownUntil = injectCooldowns[item.key] ?? 0;
                const onCooldown = Date.now() < cooldownUntil;
                return (
                  <button
                    key={item.key}
                    onClick={() => triggerInject(item.key, item.fn, item.cooldown)}
                    disabled={onCooldown}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '8px 10px', marginBottom: '6px',
                      backgroundColor: item.active ? `${item.color}22` : onCooldown ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${item.active ? item.color + '55' : onCooldown ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: '8px', cursor: onCooldown ? 'not-allowed' : 'pointer',
                      opacity: onCooldown ? 0.45 : 1,
                    }}
                  >
                    <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, color: item.active ? item.color : onCooldown ? '#374151' : '#e5e7eb', letterSpacing: '0.06em' }}>
                      {item.label}{item.active ? ' \u25cf' : ''}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: '9px', color: '#4b5563' }}>{item.sub}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes hudPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
        @keyframes streakPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes breachFlash { 0%{opacity:1;} 100%{opacity:0;} }
        @keyframes timePulse { 0%,100%{opacity:0.6;} 50%{opacity:1;} }
        @keyframes deployExpand {
          from { transform: translate(-50%, -50%) scale(0.1); opacity: 0.8; }
          to   { transform: translate(-50%, -50%) scale(4); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
