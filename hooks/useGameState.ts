'use client';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Threat, Decision, GamePhase, ThreatType, Intent, CountermeasureType } from '@/types';
import { spawnThreatFromLevel, isValidCountermeasure } from '@/lib/scenario';
import { computeSessionScore } from '@/lib/scoring';
import { getLevel } from '@/lib/levels';
import type { AIAssessment } from '@/app/api/assess-threat/route';
import { getWeaknessProfile, getAdaptiveTypeWeights } from '@/lib/adaptiveEngine';
import type { Level } from '@/lib/levels';

export function getDroneBreachDamage(t: Threat): number {
  if (t.intent !== 'hostile' || t.isDecoy) return 0;
  if (t.type === 'military') {
    if (t.payload && (t.payload.includes('AR-1') || t.payload.includes('HJ-10') || t.payload.includes('Missile') || t.payload.includes('Bomb'))) {
      return 35;
    }
    return 25;
  }
  if (t.type === 'swarm') {
    return 15;
  }
  // Commercial
  if (t.payload && (t.payload.includes('RDX') || t.payload.includes('Grenade') || t.payload.includes('IED'))) {
    return 15;
  }
  if (t.payload && (t.payload.includes('Pistol') || t.payload.includes('Smuggle') || t.payload.includes('Contraband'))) {
    return 6;
  }
  return 10;
}

export function useGameState(levelNum: number, levelOverride?: Partial<Level>) {
  const level = levelOverride ? { ...getLevel(levelNum), ...levelOverride } : getLevel(levelNum);
  const [threats, setThreats]                   = useState<Threat[]>([]);
  const [decisions, setDecisions]               = useState<Decision[]>([]);
  const [timeLeft, setTimeLeft]                 = useState(() => getLevel(levelNum).timeLimit);
  const [phase, setPhase]                       = useState<GamePhase>('playing');
  const [selectedThreat, setSelectedThreat]     = useState<Threat | null>(null);
  const [neutralizedCount, setNeutralizedCount] = useState(0);
  const [score, setScore]                       = useState(0);
  const [streak, setStreak]                     = useState(0); // consecutive correct decisions
  const spawnedAt  = useRef<Map<string, number>>(new Map());
  const detectedAt = useRef<Map<string, number>>(new Map());
  const missionStartRef = useRef(Date.now());
  const scriptedFiredRef = useRef<Set<number>>(new Set());
  const selectedThreatRef = useRef<Threat | null>(null);
  const [injectSensorJam, setInjectSensorJam] = useState(false);
  const [injectSpeedBoost, setInjectSpeedBoost] = useState(false);
  const [paused, setPaused] = useState(false);
  const togglePause = useCallback(() => setPaused(v => !v), []);

  // Derived: breach count and dynamic asset health depending on drone type & payload
  const breachCount = useMemo(() =>
    threats.filter(t => t.breached).length, [threats]);
  const totalBreachDamage = useMemo(() =>
    threats.filter(t => t.breached).reduce((sum, t) => sum + getDroneBreachDamage(t), 0), [threats]);
  // 0% base destruction (100% health) is fully achievable when all threats are neutralized in valid time
  const baseHealth = Math.max(0, 100 - totalBreachDamage);

  // Keep ref in sync for use inside intervals
  useEffect(() => { selectedThreatRef.current = selectedThreat; }, [selectedThreat]);

  // Reset everything when level changes
  useEffect(() => {
    setTimeLeft(level.timeLimit);
    setThreats([]); setDecisions([]);
    setNeutralizedCount(0); setScore(0); setStreak(0);
    setPhase('playing'); setSelectedThreat(null);
    spawnedAt.current.clear(); detectedAt.current.clear();
    missionStartRef.current = Date.now();
    scriptedFiredRef.current.clear();
  }, [levelNum]);

  // ── Countdown ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'ended' || paused) return;
    const t = setInterval(() => {
      setTimeLeft(v => { if (v <= 1) { setPhase('ended'); return 0; } return v - 1; });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, paused]);

  // ── Quota check ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (neutralizedCount >= level.threatQuota) setPhase('ended');
  }, [neutralizedCount, level.threatQuota]);

  // ── Base destroyed check ───────────────────────────────────────────────────
  useEffect(() => {
    if (baseHealth <= 0 && phase !== 'ended') setPhase('ended');
  }, [baseHealth, phase]);

  // ── Move threats + record path + breach detection ─────────────────────────
  useEffect(() => {
    if (phase === 'ended' || paused) return;
    const m = setInterval(() => {
      setThreats(prev => prev.map(t => {
        if (t.neutralized) return t;
        const dLat = t.targetLat - t.lat, dLng = t.targetLng - t.lng;
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);
        if (dist < 0.05) {
          // Auto-dismiss classification panel if this threat was being classified
          if (selectedThreatRef.current?.id === t.id) {
            setSelectedThreat(null);
            setPhase('playing');
          }
          // If cross-sector transit threat reaches its exit point without being intercepted,
          // it escaped our radar umbrella towards secondary base!
          return {
            ...t,
            neutralized: true,
            breached: t.intent === 'hostile',
          };
        }

        // ── Flight profile physics ───────────────────────────────────────────
        let profileMult = injectSpeedBoost ? 1.5 : 1;

        // stealth-ghost: blink in/out on radar until detected
        const isGhosting = t.flightProfile === 'stealth-ghost' && !t.detected
          ? Math.floor(Date.now() / 1800) % 2 === 1
          : false;

        // kamikaze-sprint: 1.9× speed inside 1.0° distance
        const sprintActive = t.flightProfile === 'kamikaze-sprint' && dist < 1.0;
        if (sprintActive) profileMult *= 1.9;

        const speedMultiplier = profileMult;
        let newLat = t.lat + (dLat / dist) * t.speed * speedMultiplier;
        let newLng = t.lng + (dLng / dist) * t.speed * speedMultiplier;

        // zigzag-evasive: lateral weave perpendicular to flight path
        if (t.flightProfile === 'zigzag-evasive') {
          const weave = Math.sin(Date.now() / 600) * 0.35 * t.speed;
          // perpendicular direction: rotate 90° (swap dLat/dLng, negate one)
          newLat += (-dLng / dist) * weave;
          newLng += (dLat / dist) * weave;
        }
        const newPath = t.path.length === 0 || t.path.length % 5 === 0
          ? [...t.path, { lat: newLat, lng: newLng, t: Date.now() }]
          : t.path;
        return { ...t, lat: newLat, lng: newLng, path: newPath, isGhosting, sprintActive };
      }));
    }, 200);
    return () => clearInterval(m);
  }, [phase, paused, injectSpeedBoost]);

  // ── Initial threat spawn at 600ms (non-scripted levels only) ─────────────
  useEffect(() => {
    const hasScripted = level.scriptedEvents && level.scriptedEvents.length > 0;
    if (hasScripted) return;
    const t = setTimeout(() => {
      setThreats(prev => {
        if (prev.length >= level.threatQuota) return prev;
        const active = prev.filter(t => !t.neutralized).length;
        if (active >= level.maxConcurrent) return prev;
        const profile = getWeaknessProfile();
        const adaptiveType = getAdaptiveTypeWeights(level.types, profile);
        const threat = spawnThreatFromLevel(levelNum, false, adaptiveType);
        spawnedAt.current.set(threat.id, Date.now());
        return [...prev, threat];
      });
    }, 600);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelNum]);

  // ── Spawn: Strictly bounded by threatQuota (Strategic Fixed Waves, No Endless Spawning) ──
  useEffect(() => {
    if (phase === 'ended' || paused) return;
    const s = setInterval(() => {
      setThreats(prev => {
        // Strict Strategic Quota: Do NOT spawn more than level.threatQuota total threats
        if (prev.length >= level.threatQuota) return prev;
        const active = prev.filter(t => !t.neutralized).length;
        if (active >= level.maxConcurrent) return prev;

        const isDecoy = level.decoys && Math.random() < 0.2;
        const profile = getWeaknessProfile();
        const adaptiveType = isDecoy ? undefined : getAdaptiveTypeWeights(level.types, profile);

        // Cross-sector transit threat: e.g. at Pathankot, a UCAV heading towards Adampur or Halwara
        const isTransitThreat = !isDecoy && Math.random() < 0.28;
        const transitTarget = isTransitThreat ? {
          name: 'Adampur AFS (S-400 Radar Core)',
          lat: 31.4338,
          lng: 75.7588,
        } : undefined;

        const threat = spawnThreatFromLevel(levelNum, isDecoy, adaptiveType, isTransitThreat, transitTarget);
        spawnedAt.current.set(threat.id, Date.now());
        return [...prev, threat];
      });
    }, level.spawnInterval);
    return () => clearInterval(s);
  }, [phase, paused, levelNum, level]);

  // ── Scripted events ────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'ended') return;
    const events = level.scriptedEvents;
    if (!events || events.length === 0) return;

    const timers = events.map((evt, idx) => {
      if (scriptedFiredRef.current.has(idx)) return null;
      const elapsed = Date.now() - missionStartRef.current;
      const remaining = evt.delayMs - elapsed;

      return setTimeout(() => {
        if (scriptedFiredRef.current.has(idx)) return;
        scriptedFiredRef.current.add(idx);
        const threat = spawnThreatFromLevel(levelNum, evt.intent === 'neutral', evt.type);
        // Override bearing-based spawn position
        const bearingRad = evt.bearing * (Math.PI / 180);
        const spawnLat = level.targetLat + Math.cos(bearingRad) * level.spawnRadius;
        const spawnLng = level.targetLng + Math.sin(bearingRad) * level.spawnRadius;
        const dLat = level.targetLat - spawnLat;
        const dLng = level.targetLng - spawnLng;
        const headingRad = Math.atan2(dLng, dLat);
        const heading = Math.round(((headingRad * 180 / Math.PI) + 360) % 360);
        const scriptedThreat = {
          ...threat,
          lat: spawnLat, lng: spawnLng,
          altitude: evt.altitudeM,
          heading,
          type: evt.type,
          intent: evt.intent,
        };
        spawnedAt.current.set(scriptedThreat.id, Date.now());
        setThreats(prev => [...prev, scriptedThreat]);
      }, Math.max(0, remaining));
    }).filter(Boolean);

    return () => timers.forEach(t => t && clearTimeout(t));
  }, [phase, levelNum]);

  // ── STEP 1: DETECT — single click opens classification panel immediately ──
  // phase === 'classifying' is allowed so operator can switch lock to a new track
  const handleDetect = useCallback((threat: Threat) => {
    if (phase === 'ended' || paused) return;
    if (!threat.detected) {
      detectedAt.current.set(threat.id, Date.now());
    }
    const detected = { ...threat, detected: true };
    setThreats(prev => prev.map(t => t.id === threat.id ? detected : t));
    setSelectedThreat(detected);
    setPhase('classifying');
  }, [phase]);

  // ── STEP 2: CLASSIFY + DEPLOY ──────────────────────────────────────────────
  const handleClassifyAndDeploy = useCallback((
    type: ThreatType,
    intent: Intent,
    cm: CountermeasureType,
    ai?: AIAssessment,
  ) => {
    if (!selectedThreat || paused) return;
    const threat = selectedThreat;
    const correct = type === threat.type && intent === threat.intent && isValidCountermeasure(threat.type, threat.intent, cm);

    const spawnTs        = spawnedAt.current.get(threat.id) ?? Date.now();
    const detectTs       = detectedAt.current.get(threat.id) ?? spawnTs;
    const responseTimeMs  = Date.now() - detectTs;
    const detectionTimeMs = detectTs - spawnTs;

    const decision: Decision = {
      threatId: threat.id,
      threatType: threat.type, intent: threat.intent,
      classifiedAs: type, classifiedIntent: intent,
      countermeasure: cm,
      correct, responseTimeMs, detectionTimeMs,
      timestamp: Date.now(),
      modelName: threat.modelName,
      path: threat.path.slice(-30),           // last 30 waypoints for trajectory replay
      spawnLat: threat.path[0]?.lat ?? threat.lat,
      spawnLng: threat.path[0]?.lng ?? threat.lng,
      batteryLat: threat.batteryStation?.lat,
      batteryLng: threat.batteryStation?.lng,
      batteryName: threat.batteryStation?.name,
      interceptLat: threat.lat,
      interceptLng: threat.lng,
      slantRangeKm: parseFloat((Math.sqrt((threat.targetLat - threat.lat)**2 + (threat.targetLng - threat.lng)**2) * 111).toFixed(2)),
      aiSuggestedType: ai?.type,
      aiSuggestedIntent: ai?.intent,
      aiSuggestedCountermeasure: ai?.countermeasure,
      followedAI: ai ? (type === ai.type && intent === ai.intent) : undefined,
    };

    setDecisions(prev => {
      const updated = [...prev, decision];
      setScore(computeSessionScore(updated));
      return updated;
    });
    setThreats(prev => prev.map(t =>
      t.id === threat.id ? { ...t, neutralized: true } : t
    ));
    if (correct) {
      setNeutralizedCount(n => n + 1);
      setStreak(s => s + 1);
    } else {
      setStreak(0);
      // Wrong countermeasure on hostile → failed intercept → base damage
      if (threat.intent === 'hostile') {
        setThreats(prev => prev.map(t =>
          t.id === threat.id ? { ...t, breached: true } : t
        ));
      }
    }
    setSelectedThreat(null);
    setPhase('playing');
  }, [selectedThreat, paused, threats]);

  const dismiss = useCallback(() => {
    setSelectedThreat(null);
    setPhase('playing');
  }, []);

  // Keep selectedThreat telemetry live as the threat moves
  const liveSelectedThreat = useMemo(() => {
    if (!selectedThreat) return null;
    return threats.find(t => t.id === selectedThreat.id) ?? selectedThreat;
  }, [selectedThreat, threats]);

  // Inject: RF/sensor jamming — degrades sensor readings for 20s
  const injectJamming = useCallback(() => {
    setInjectSensorJam(true);
    setTimeout(() => setInjectSensorJam(false), 20_000);
  }, []);

  // Inject: spawn a decoy (neutral threat) immediately
  const injectDecoy = useCallback(() => {
    const decoy = spawnThreatFromLevel(levelNum, true, undefined);
    spawnedAt.current.set(decoy.id, Date.now());
    setThreats(prev => [...prev, decoy]);
  }, [levelNum]);

  // Inject: evasion mode — all active threats speed up 1.5× for 15s
  const injectEvasion = useCallback(() => {
    setInjectSpeedBoost(true);
    setTimeout(() => setInjectSpeedBoost(false), 15_000);
  }, []);

  // Inject: time compression — remove 30s from mission clock
  const injectTimeCompress = useCallback(() => {
    setTimeLeft(v => Math.max(1, v - 30));
  }, []);

  return {
    threats, decisions, timeLeft, phase,
    selectedThreat: liveSelectedThreat, neutralizedCount, score,
    baseHealth, breachCount, streak,
    nightMode:   level.nightMode,
    threatQuota: level.threatQuota,
    totalTime:   level.timeLimit,
    targetLat:   level.targetLat,
    targetLng:   level.targetLng,
    targetName:  level.targetName,
    threatDirection: level.threatDirection,
    sensorDegradation: level.sensorDegradation || injectSensorJam,
    degradedFields: injectSensorJam
      ? [...(level.degradedFields ?? []), 'rf', 'frequency', 'power', 'modulation', 'protocol', 'hopRate', 'encryption']
      : level.degradedFields,
    environment:  level.environment,
    weather:      level.weather,
    spawnSectors: level.spawnSectors,
    injectSensorJam, injectSpeedBoost,
    injectJamming, injectDecoy, injectEvasion, injectTimeCompress,
    handleDetect, handleClassifyAndDeploy, dismiss,
    paused, togglePause,
  };
}
