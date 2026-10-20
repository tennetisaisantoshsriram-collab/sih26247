'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ThreatType, Intent, Threat, CountermeasureType } from '@/types';
import { deriveSensorData } from '@/lib/sensors';
import { useVoiceCommand } from '@/hooks/useVoiceCommand';
import { calculatePkAndWez } from '@/lib/ballistics';
import type { AIAssessment } from '@/app/api/assess-threat/route';

interface Props {
  threat: Threat;
  targetName: string;
  approachFrom: string;
  sensorDegradation?: boolean;
  degradedFields?: string[];
  classifyTimeout: number;
  ammo?: { interceptor: number; ew: number };
  paused?: boolean;
  onClassify: (type: ThreatType, intent: Intent, cm: CountermeasureType, ai?: AIAssessment) => void;
  onDismiss: () => void;
}

const TYPES: { value: ThreatType; label: string; key: string; sub: string; color: string }[] = [
  { value: 'commercial', label: 'COMM UAS',  key: '1', sub: 'DJI / FPV / T30', color: '#f59e0b' },
  { value: 'military',   label: 'MIL UCAV',  key: '2', sub: 'Burraq / GJ-2 / Harop', color: '#ef4444' },
  { value: 'swarm',      label: 'SWARM',     key: '3', sub: 'Mesh TDMA Cluster', color: '#a855f7' },
];
const INTENTS: { value: Intent; label: string; key: string; sub: string }[] = [
  { value: 'hostile',  label: '◆ HOSTILE',  key: 'H', sub: 'CBDR Attack Vector' },
  { value: 'neutral',  label: '□ NEUTRAL',  key: 'N', sub: 'Civilian / Decoy' },
  { value: 'friendly', label: '● FRIENDLY', key: 'F', sub: 'Mode-5 Valid IFF' },
];
const CMS: { value: CountermeasureType; label: string; key: string; sub: string; color: string }[] = [
  { value: 'rf-jammer',      label: 'DIR. RF JAMMER',  key: 'Q', sub: 'Soft-Kill: 2.4/5.8G ISM', color: '#3b82f6' },
  { value: 'gnss-spoof',     label: 'GNSS SPOOF / LZ', key: 'T', sub: 'Cyber Hijack → Quarantine LZ', color: '#06b6d4' },
  { value: 'interceptor',    label: 'KINETIC SAM',      key: 'W', sub: 'Hard-Kill: Outer Envelope', color: '#ef4444' },
  { value: 'laser-dew',      label: '10kW LASER DEW',   key: 'Y', sub: 'Directed Energy Thermal Kill', color: '#f97316' },
  { value: 'ew',             label: 'EMP / EW SUITE',   key: 'E', sub: 'Wide-Area Swarm Denial', color: '#a855f7' },
  { value: 'alert-evacuate', label: 'HOLD FIRE / LOG',  key: 'R', sub: 'Fratricide Protection Mode', color: '#22c55e' },
];
const RATING_COLOR: Record<string, string> = {
  LOW: '#22c55e', MEDIUM: '#f59e0b', HIGH: '#f97316', CRITICAL: '#ef4444',
};
const OODA_STAGES = ['OBSERVE', 'ORIENT', 'DECIDE', 'ACT'];

export default function ClassificationPanel({
  threat,
  targetName,
  approachFrom,
  sensorDegradation = false,
  degradedFields = [],
  classifyTimeout,
  ammo,
  paused = false,
  onClassify,
  onDismiss,
}: Props) {
  function fieldVal(key: string, val: string) {
    if (sensorDegradation && degradedFields.includes(key)) return '--- DEGRADED';
    return val;
  }

  const [selectedType, setSelectedType]     = useState<ThreatType | null>(null);
  const [selectedIntent, setSelectedIntent] = useState<Intent | null>(null);
  const [selectedCm, setSelectedCm]         = useState<CountermeasureType | null>(null);
  const [ai, setAi] = useState<AIAssessment | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [sensorTab, setSensorTab] = useState<'radar' | 'rf' | 'eo' | 'acoustic' | 'manual'>('radar');
  const [timerLeft, setTimerLeft] = useState(classifyTimeout);
  const [isFullCover, setIsFullCover] = useState(false);

  const voiceActive = useVoiceCommand(
    (t) => setSelectedType(t),
    (i) => setSelectedIntent(i),
    true,
  );

  useEffect(() => { setTimerLeft(classifyTimeout); }, [threat.id, classifyTimeout]);

  useEffect(() => {
    if (paused) return;
    if (timerLeft <= 0) { onDismiss(); return; }
    const t = setInterval(() => setTimerLeft(v => v - 1), 1000);
    return () => clearInterval(t);
  }, [timerLeft, onDismiss, paused]);

  const sensors = deriveSensorData(threat);

  const oodaStage =
    aiLoading                                        ? 0 :
    !selectedType && !selectedIntent                 ? 1 :
    !selectedType || !selectedIntent || !selectedCm  ? 2 :
    3;

  const isDepleted = (val: CountermeasureType) =>
    (val === 'interceptor' && (ammo?.interceptor ?? 6) <= 0) ||
    (val === 'ew' && (ammo?.ew ?? 4) <= 0);

  useEffect(() => {
    if (paused) return;
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      switch (e.key) {
        case '1': setSelectedType('commercial'); break;
        case '2': setSelectedType('military'); break;
        case '3': setSelectedType('swarm'); break;
        case 'h': case 'H': setSelectedIntent('hostile'); break;
        case 'n': case 'N': setSelectedIntent('neutral'); break;
        case 'f': case 'F': setSelectedIntent('friendly'); break;
        case 'q': case 'Q': setSelectedCm('rf-jammer'); break;
        case 't': case 'T': setSelectedCm('gnss-spoof'); break;
        case 'w': case 'W': if (!isDepleted('interceptor')) setSelectedCm('interceptor'); break;
        case 'y': case 'Y': setSelectedCm('laser-dew'); break;
        case 'e': case 'E': if (!isDepleted('ew')) setSelectedCm('ew'); break;
        case 'r': case 'R': setSelectedCm('alert-evacuate'); break;
        case 'Enter': if (selectedType && selectedIntent && selectedCm) handleConfirm(); break;
        case 'Escape': onDismiss(); break;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedType, selectedIntent, selectedCm, paused]);

  useEffect(() => {
    setAiLoading(true);
    setAi(null);
    fetch('/api/assess-threat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...threat, targetName, approachFrom }),
    })
      .then(r => r.json())
      .then((data: AIAssessment) => {
        if (data?.type && data?.intent && data?.countermeasure) setAi(data);
        setAiLoading(false);
      })
      .catch(() => setAiLoading(false));
  }, [threat.id]);

  const canSubmit = selectedType && selectedIntent && selectedCm;
  function handleConfirm() {
    if (!canSubmit) return;
    onClassify(selectedType!, selectedIntent!, selectedCm!, ai ?? undefined);
  }

  // ── SVG silhouettes ─────────────────────────────────────────────────────
  const CommercialSVG = (
    <svg width="100%" height="90" viewBox="0 0 110 64" style={{ display: 'block', margin: 'auto' }}>
      <line x1="55" y1="32" x2="22" y2="12" stroke="#00ff88" strokeWidth="1" />
      <line x1="55" y1="32" x2="88" y2="12" stroke="#00ff88" strokeWidth="1" />
      <line x1="55" y1="32" x2="22" y2="52" stroke="#00ff88" strokeWidth="1" />
      <line x1="55" y1="32" x2="88" y2="52" stroke="#00ff88" strokeWidth="1" />
      <rect x="47" y="25" width="16" height="14" rx="3" stroke="#00ff88" strokeWidth="1.5" fill="rgba(0,255,136,0.12)" />
      <ellipse cx="22" cy="12" rx="13" ry="6" stroke="#00ff88" strokeWidth="1" fill="none" opacity="0.55" />
      <ellipse cx="88" cy="12" rx="13" ry="6" stroke="#00ff88" strokeWidth="1" fill="none" opacity="0.55" />
      <ellipse cx="22" cy="52" rx="13" ry="6" stroke="#00ff88" strokeWidth="1" fill="none" opacity="0.55" />
      <ellipse cx="88" cy="52" rx="13" ry="6" stroke="#00ff88" strokeWidth="1" fill="none" opacity="0.55" />
      <circle cx="22" cy="12" r="2.5" fill="#00ff88" opacity="0.9" />
      <circle cx="88" cy="12" r="2.5" fill="#00ff88" opacity="0.9" />
      <circle cx="22" cy="52" r="2.5" fill="#00ff88" opacity="0.9" />
      <circle cx="88" cy="52" r="2.5" fill="#00ff88" opacity="0.9" />
    </svg>
  );
  const MilitarySVG = (
    <svg width="100%" height="90" viewBox="0 0 110 64" style={{ display: 'block', margin: 'auto' }}>
      <path d="M55 8 L95 56 L55 48 L15 56 Z" stroke="#00e5ff" strokeWidth="1.5" fill="rgba(0,229,255,0.08)" />
      <ellipse cx="55" cy="22" rx="5" ry="9" stroke="#00e5ff" strokeWidth="1" fill="rgba(0,229,255,0.18)" />
      <path d="M51 52 L59 52 L62 64 L55 60 L48 64 Z" stroke="#00e5ff" strokeWidth="1" fill="rgba(0,229,255,0.45)" />
      <ellipse cx="55" cy="58" rx="5" ry="4" fill="rgba(0,229,255,0.25)" />
    </svg>
  );
  const swarmNodes: [number, number][] = [[55,6],[28,22],[82,22],[12,38],[98,38],[35,54],[75,54]];
  const SwarmSVG = (
    <svg width="100%" height="90" viewBox="0 0 110 64" style={{ display: 'block', margin: 'auto' }}>
      <line x1="55" y1="6" x2="28" y2="22" stroke="#a78bfa" strokeWidth="0.8" strokeDasharray="2,3" opacity="0.6" />
      <line x1="55" y1="6" x2="82" y2="22" stroke="#a78bfa" strokeWidth="0.8" strokeDasharray="2,3" opacity="0.6" />
      <line x1="28" y1="22" x2="12" y2="38" stroke="#a78bfa" strokeWidth="0.8" strokeDasharray="2,3" opacity="0.6" />
      <line x1="82" y1="22" x2="98" y2="38" stroke="#a78bfa" strokeWidth="0.8" strokeDasharray="2,3" opacity="0.6" />
      <line x1="12" y1="38" x2="35" y2="54" stroke="#a78bfa" strokeWidth="0.8" strokeDasharray="2,3" opacity="0.6" />
      <line x1="98" y1="38" x2="75" y2="54" stroke="#a78bfa" strokeWidth="0.8" strokeDasharray="2,3" opacity="0.6" />
      <line x1="28" y1="22" x2="82" y2="22" stroke="#a78bfa" strokeWidth="0.5" strokeDasharray="2,3" opacity="0.4" />
      {swarmNodes.map(([cx, cy], i) => (
        <g key={i}>
          <polygon
            points={`${cx},${cy-5} ${cx+5},${cy} ${cx},${cy+5} ${cx-5},${cy}`}
            stroke="#a78bfa" strokeWidth="1" fill="rgba(167,139,250,0.2)"
          />
          <circle cx={cx} cy={cy} r="1.5" fill="#a78bfa" />
        </g>
      ))}
    </svg>
  );
  const silhouette = threat.type === 'commercial' ? CommercialSVG : threat.type === 'military' ? MilitarySVG : SwarmSVG;

  // ── RF spectrum bars by type ─────────────────────────────────────────────
  const RFSpectrum = (
    <svg width="100%" height="34" viewBox="0 0 200 34" style={{ overflow: 'visible' }}>
      <line x1="0" y1="33" x2="200" y2="33" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      {threat.type === 'commercial' ? (
        <>
          <rect x="8"  y="28" width="14" height="5"  fill="rgba(0,255,136,0.35)" />
          <rect x="55" y="5"  width="16" height="28" fill="rgba(0,255,136,0.85)" />
          <rect x="72" y="12" width="8"  height="21" fill="rgba(0,255,136,0.45)" />
          <rect x="118" y="28" width="30" height="5" fill="rgba(0,255,136,0.20)" />
          <rect x="168" y="12" width="16" height="21" fill="rgba(0,255,136,0.80)" />
          <text x="15"  y="9"  fontSize="5" fill="rgba(0,255,136,0.45)" textAnchor="middle">868M</text>
          <text x="63"  y="4"  fontSize="5" fill="rgba(0,255,136,0.85)" textAnchor="middle">2.4G ISM ▲</text>
          <text x="133" y="27" fontSize="5" fill="rgba(0,255,136,0.35)" textAnchor="middle">4.4-4.9G</text>
          <text x="176" y="11" fontSize="5" fill="rgba(0,255,136,0.75)" textAnchor="middle">5.8G ISM</text>
        </>
      ) : threat.type === 'military' ? (
        <>
          <rect x="8"   y="27" width="14" height="6"  fill="rgba(0,229,255,0.25)" />
          <rect x="55"  y="26" width="16" height="7"  fill="rgba(0,229,255,0.25)" />
          <rect x="108" y="15" width="7"  height="18" fill="rgba(0,229,255,0.75)" />
          <rect x="118" y="11" width="7"  height="22" fill="rgba(0,229,255,0.90)" />
          <rect x="128" y="13" width="7"  height="20" fill="rgba(0,229,255,0.80)" />
          <rect x="138" y="17" width="7"  height="16" fill="rgba(0,229,255,0.70)" />
          <rect x="148" y="14" width="7"  height="19" fill="rgba(0,229,255,0.75)" />
          <rect x="168" y="27" width="16" height="6"  fill="rgba(0,229,255,0.25)" />
          <text x="15"  y="26" fontSize="5" fill="rgba(0,229,255,0.40)" textAnchor="middle">868M</text>
          <text x="63"  y="25" fontSize="5" fill="rgba(0,229,255,0.40)" textAnchor="middle">2.4G</text>
          <text x="128" y="10" fontSize="5" fill="rgba(0,229,255,0.90)" textAnchor="middle">4.4-4.9G AES FHSS ▲</text>
          <text x="176" y="26" fontSize="5" fill="rgba(0,229,255,0.40)" textAnchor="middle">5.8G</text>
        </>
      ) : (
        <>
          <rect x="8"  y="7"  width="18" height="26" fill="rgba(167,139,250,0.85)" />
          <rect x="27" y="14" width="8"  height="19" fill="rgba(167,139,250,0.55)" />
          <rect x="55" y="28" width="16" height="5"  fill="rgba(167,139,250,0.25)" />
          <rect x="118" y="29" width="30" height="4" fill="rgba(167,139,250,0.20)" />
          <rect x="168" y="28" width="16" height="5" fill="rgba(167,139,250,0.25)" />
          <text x="17"  y="6"  fontSize="5" fill="rgba(167,139,250,0.90)" textAnchor="middle">868M TDMA ▲</text>
          <text x="63"  y="27" fontSize="5" fill="rgba(167,139,250,0.40)" textAnchor="middle">2.4G</text>
          <text x="133" y="28" fontSize="5" fill="rgba(167,139,250,0.35)" textAnchor="middle">4.4-4.9G</text>
          <text x="176" y="27" fontSize="5" fill="rgba(167,139,250,0.40)" textAnchor="middle">5.8G</text>
        </>
      )}
    </svg>
  );

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: isFullCover ? '100%' : '560px', opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      style={{
        position: isFullCover ? 'absolute' : 'relative',
        inset: isFullCover ? 0 : undefined,
        width: isFullCover ? '100%' : '560px',
        flexShrink: 0,
        height: '100%',
        zIndex: isFullCover ? 1200 : 250,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-12px 0 40px rgba(0,0,0,0.85)',
        borderLeft: '2px solid rgba(245,158,11,0.5)',
        backgroundColor: '#070c18',
        overflow: 'hidden',
      }}
    >
      <div style={{
        display: 'flex', flexDirection: 'column', height: '100%',
        backgroundColor: '#070c18',
      }}>

        {/* ── PINNED TOP BAR ──────────────────────────────────────────────── */}
        <div style={{ flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#050a14', padding: '12px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>🎯</span>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '14px', color: '#f59e0b', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    TRACK #{threat.id.slice(-4).toUpperCase()} — {threat.modelName || 'UNIDENTIFIED CONTACT'}
                  </h3>
                  <span style={{
                    fontSize: '9.5px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px',
                    backgroundColor: `${RATING_COLOR[threat.threatRating]}22`,
                    color: RATING_COLOR[threat.threatRating],
                    border: `1px solid ${RATING_COLOR[threat.threatRating]}66`,
                  }}>
                    {threat.threatRating} PRIORITY
                  </span>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: '10.5px', color: '#94a3b8', fontFamily: 'monospace' }}>
                  HOTKEYS: [1/2/3] Type · [H/N/F] Intent · [Q/T/W/Y/E/R] Effector · [Enter] Confirm · [Esc] Dismiss
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Cover toggle button */}
              <button
                onClick={() => setIsFullCover(v => !v)}
                title="Toggle between 50% split view and full-screen cover"
                style={{
                  background: isFullCover ? 'rgba(245,158,11,0.22)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${isFullCover ? 'rgba(245,158,11,0.6)' : 'rgba(255,255,255,0.15)'}`,
                  color: isFullCover ? '#fbbf24' : '#cbd5e1',
                  borderRadius: '6px', padding: '5px 12px', fontSize: '10px', fontWeight: 800,
                  cursor: 'pointer', fontFamily: 'monospace', letterSpacing: '0.05em',
                }}
              >
                {isFullCover ? '⛶ 50% COVER' : '⛶ 100% COVER'}
              </button>

              {/* Dismiss button */}
              <button
                onClick={onDismiss}
                style={{
                  background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)',
                  color: '#f87171', borderRadius: '6px', padding: '5px 12px',
                  cursor: 'pointer', fontSize: '11px', fontWeight: 800,
                }}
              >
                CLOSE ✕
              </button>
            </div>
          </div>

          {/* OODA Stage Tracker + Countdown Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {OODA_STAGES.map((stage, i) => {
                const isActive = i === oodaStage;
                const isDone   = i < oodaStage;
                return (
                  <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      padding: '3px 8px', borderRadius: '4px',
                      backgroundColor: isActive ? 'rgba(245,158,11,0.15)' : isDone ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)',
                      border: isActive ? '1px solid rgba(245,158,11,0.5)' : isDone ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(255,255,255,0.06)',
                    }}>
                      <span style={{ fontSize: '9px', fontWeight: 800, color: isActive ? '#f59e0b' : isDone ? '#22c55e' : '#475569' }}>
                        {isDone ? '✓' : i + 1}
                      </span>
                      <span style={{ fontSize: '9px', fontWeight: 700, color: isActive ? '#f59e0b' : isDone ? '#22c55e' : '#64748b', letterSpacing: '0.04em' }}>
                        {stage}
                      </span>
                    </div>
                    {i < 3 && <span style={{ fontSize: '10px', color: isDone ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)' }}>›</span>}
                  </div>
                );
              })}
            </div>

            {/* Timer display */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '160px' }}>
              <div style={{ flex: 1, height: '4px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.max(0, (timerLeft / classifyTimeout) * 100)}%`,
                  backgroundColor: timerLeft > classifyTimeout * 0.5 ? '#22c55e' : timerLeft > classifyTimeout * 0.25 ? '#f59e0b' : '#ef4444',
                  transition: 'width 1s linear, background-color 0.3s',
                }} />
              </div>
              <span style={{
                fontSize: '11px', fontFamily: 'monospace', fontWeight: 800,
                color: timerLeft <= 5 ? '#ef4444' : timerLeft <= 10 ? '#f59e0b' : '#64748b',
              }}>
                {timerLeft}s LEFT
              </span>
            </div>
          </div>
        </div>

        {/* ── SCROLLABLE INTEL & FIRE CONTROL BODY ───────────────── */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: isFullCover ? '16px 20px' : '14px 16px',
          display: 'grid', gridTemplateColumns: isFullCover ? '1.05fr 0.95fr' : '1fr', gap: isFullCover ? '18px' : '14px',
        }}>

          {/* ════ LEFT COLUMN: DRONE IDENTITY, PAYLOAD & THREAT SOURCE ════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* 1. HERO CARD: EXACT PAYLOAD CARRIED (CLEARLY PROMINENT) */}
            <div style={{
              backgroundColor: 'rgba(239,68,68,0.08)',
              border: '1.5px solid rgba(239,68,68,0.45)',
              borderRadius: '12px', padding: '14px 16px',
              boxShadow: '0 4px 20px rgba(239,68,68,0.1)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '16px' }}>📦</span>
                  <span style={{ fontSize: '10.5px', fontWeight: 900, color: '#f87171', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    PAYLOAD CARRIED (ACTIVE ORDNANCE / CARGO)
                  </span>
                </div>
                <span style={{ fontSize: '9px', fontWeight: 800, color: '#fca5a5', background: 'rgba(239,68,68,0.2)', padding: '2px 8px', borderRadius: '4px' }}>
                  VERIFIED INTELLIGENCE
                </span>
              </div>
              <p style={{
                margin: '0 0 6px', fontSize: '14px', fontWeight: 900,
                color: '#fff', letterSpacing: '-0.01em', lineHeight: '1.3',
              }}>
                {fieldVal('payload', threat.payload)}
              </p>
              <p style={{ margin: 0, fontSize: '10.5px', color: '#cbd5e1', lineHeight: '1.4' }}>
                {threat.intent === 'hostile' && !threat.isDecoy ? (
                  <span style={{ color: '#fca5a5' }}>
                    ⚠ <b>Critical Hazard:</b> Direct lethal payload configured for kinetic detonation or facility sabotage upon arrival. Neutralize before target reaches base perimeter!
                  </span>
                ) : threat.intent === 'friendly' ? (
                  <span style={{ color: '#86efac' }}>
                    🟢 <b>Civilian / Friendly:</b> Certified non-weaponized payload (passengers / legal survey equipment). <b>Strict ROE Hold Fire applies.</b>
                  </span>
                ) : (
                  <span style={{ color: '#fde047' }}>
                    🟡 <b>Contraband / Infiltration:</b> Low-mass cargo drop or synthetic decoy payload. Employ soft-kill capture or GNSS spoofing.
                  </span>
                )}
              </p>
            </div>

            {/* 2. HERO CARD: THREAT SOURCE & INVASION ORIGIN (CLEARLY PROMINENT) */}
            <div style={{
              backgroundColor: 'rgba(59,130,246,0.08)',
              border: '1.5px solid rgba(59,130,246,0.45)',
              borderRadius: '12px', padding: '14px 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '16px' }}>🌐</span>
                  <span style={{ fontSize: '10.5px', fontWeight: 900, color: '#60a5fa', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    THREAT SOURCE &amp; INVASION LAUNCH POINT
                  </span>
                </div>
                <span style={{ fontSize: '9px', fontWeight: 800, color: '#93c5fd', background: 'rgba(59,130,246,0.2)', padding: '2px 8px', borderRadius: '4px' }}>
                  BORDER SECTOR TRACK
                </span>
              </div>
              <p style={{
                margin: '0 0 4px', fontSize: '13px', fontWeight: 800,
                color: '#e0f2fe', letterSpacing: '0.01em',
              }}>
                {threat.origin}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginTop: '8px' }}>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 8px', borderRadius: '6px' }}>
                  <span style={{ fontSize: '8px', color: '#64748b', fontWeight: 700, display: 'block' }}>AZIMUTH / HDG</span>
                  <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 800 }}>{threat.heading}°</span>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 8px', borderRadius: '6px' }}>
                  <span style={{ fontSize: '8px', color: '#64748b', fontWeight: 700, display: 'block' }}>ALTITUDE AGL</span>
                  <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 800 }}>{threat.altitude}m</span>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 8px', borderRadius: '6px' }}>
                  <span style={{ fontSize: '8px', color: '#64748b', fontWeight: 700, display: 'block' }}>AIRFRAME SPAN</span>
                  <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 800 }}>{threat.wingspan}</span>
                </div>
              </div>
            </div>

            {/* 2.5 SPECIAL WARFARE TECHNIQUES: RADAR MASKING / FIBER-OPTIC DIAGNOSTICS */}
            {threat.isMaskedAsCivilian && (
              <div style={{
                backgroundColor: threat.unmasked ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.12)',
                border: `1.5px solid ${threat.unmasked ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)'}`,
                borderRadius: '8px', padding: '10px 12px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '9px', fontWeight: 900, color: threat.unmasked ? '#4ade80' : '#f87171', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                    {threat.unmasked ? '✓ DE-MASKED: CLUSTER PROFILE CONFIRMED' : '⚠ SSR AIR CORRIDOR RADAR MASK ACTIVE'}
                  </span>
                  <span style={{ fontSize: '8px', fontWeight: 800, color: '#fbbf24', background: 'rgba(245,158,11,0.2)', padding: '1px 5px', borderRadius: '3px', fontFamily: 'monospace' }}>
                    CIVIL CORRIDOR
                  </span>
                </div>
                <p style={{ margin: '4px 0 2px', fontSize: '11px', color: '#fff', fontWeight: 700, fontFamily: 'monospace' }}>
                  SPOOFED SQUAWK: <span style={{ color: '#38bdf8' }}>{threat.maskedCallsign || 'Airliner B777 Cargo'}</span>
                </p>
                <div style={{ display: 'flex', gap: '8px', fontSize: '8.5px', color: '#94a3b8', fontFamily: 'monospace' }}>
                  <span>APPARENT RCS: <b style={{ color: '#e2e8f0' }}>{threat.apparentRCS || '32.0 m²'}</b></span>
                  <span>MICRO-DOPPLER: <b style={{ color: '#fca5a5' }}>{threat.trueMicroDoppler || 'Propeller Modulation'}</b></span>
                </div>
                {!threat.unmasked && (
                  <button
                    onClick={() => { threat.unmasked = true; setSensorTab('eo'); }}
                    style={{
                      marginTop: '6px', width: '100%', padding: '6px 8px', borderRadius: '4px',
                      backgroundColor: 'rgba(239,68,68,0.25)', border: '1px solid rgba(239,68,68,0.6)',
                      color: '#fca5a5', fontSize: '9px', fontWeight: 800, cursor: 'pointer', fontFamily: 'monospace',
                    }}
                  >
                    ⚡ INTERROGATE MICRO-DOPPLER &amp; PEEL OFF CIVILIAN MASK →
                  </button>
                )}
              </div>
            )}

            {threat.isFiberOptic && (
              <div style={{
                backgroundColor: 'rgba(245,158,11,0.12)', border: '1.5px solid rgba(245,158,11,0.5)',
                borderRadius: '8px', padding: '8px 10px',
              }}>
                <span style={{ fontSize: '9px', fontWeight: 900, color: '#fbbf24', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                  ⚡ 10km FIBER-OPTIC SPOOL GUIDED FPV DETECTED
                </span>
                <p style={{ margin: '2px 0 0', fontSize: '8.5px', color: '#cbd5e1', lineHeight: '1.3' }}>
                  Target is guided via spooled micro-optical fiber. <b>100% immune to all RF Jammers and GNSS Spoofing!</b> Deploy Kinetic SAM [W] or 10kW Laser DEW [Y] to burn tether and chassis!
                </p>
              </div>
            )}

            {/* 3. CROSS-SECTOR TRANSIT ALERT (IF APPLICABLE) */}
            {threat.isTransit && (
              <div style={{
                backgroundColor: 'rgba(245,158,11,0.12)',
                border: '1.5px dashed rgba(245,158,11,0.6)',
                borderRadius: '10px', padding: '10px 14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px' }}>✈</span>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#fbbf24', letterSpacing: '0.06em' }}>
                    CROSS-SECTOR TRANSIT IN PROGRESS
                  </span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#fef08a', fontWeight: 700 }}>
                  En route to: {threat.transitDestinationName ?? 'Adjacent Strategic Base'}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '9.5px', color: '#cbd5e1' }}>
                  Target is driving across our coverage corridor. Intercept before target passes radial sector exit!
                </p>
              </div>
            )}

            {/* 4. EO/IR FLIR THERMAL TARGETING POD VIEWPORT */}
            <div style={{
              background: 'radial-gradient(circle, #0a1f1c 0%, #03090c 100%)',
              border: '1px solid rgba(0,255,136,0.35)', borderRadius: '10px',
              position: 'relative', overflow: 'hidden', padding: '12px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8.5px', color: '#00ff88', fontFamily: 'monospace' }}>
                <span>EO/IR POD: SLEW LOCKED · MWIR WHOT 8.0X</span>
                <span>ALT {threat.altitude}M · HDG {threat.heading}°</span>
              </div>

              <div style={{ height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                  <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'rgba(0,255,136,0.3)' }} />
                  <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', background: 'rgba(0,255,136,0.3)' }} />
                  <div style={{ position: 'absolute', top: '10%', left: '20%', width: '12px', height: '12px', borderTop: '1.5px solid #00ff88', borderLeft: '1.5px solid #00ff88' }} />
                  <div style={{ position: 'absolute', top: '10%', right: '20%', width: '12px', height: '12px', borderTop: '1.5px solid #00ff88', borderRight: '1.5px solid #00ff88' }} />
                  <div style={{ position: 'absolute', bottom: '10%', left: '20%', width: '12px', height: '12px', borderBottom: '1.5px solid #00ff88', borderLeft: '1.5px solid #00ff88' }} />
                  <div style={{ position: 'absolute', bottom: '10%', right: '20%', width: '12px', height: '12px', borderBottom: '1.5px solid #00ff88', borderRight: '1.5px solid #00ff88' }} />
                </div>
                {silhouette}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0,255,136,0.2)', paddingTop: '6px' }}>
                <span style={{ fontSize: '9px', color: '#00ff88', fontFamily: 'monospace' }}>
                  MODEL: {threat.modelName || threat.type.toUpperCase()}
                </span>
                <span style={{
                  fontSize: '9px', fontFamily: 'monospace', fontWeight: 700,
                  color: threat.intent === 'hostile' ? '#ef4444' : threat.intent === 'friendly' ? '#22c55e' : '#f59e0b',
                }}>
                  {threat.intent === 'hostile' ? '🔴 HIGH THERMAL HEAT PLUME' : threat.intent === 'friendly' ? '🟢 NORMAL ENGINE IR' : '🟡 AMBIENT THERMAL INERT'}
                </span>
              </div>
            </div>

            {/* 5. MULTI-SENSOR DIAGNOSTICS TABS */}
            <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                {([
                  { key: 'radar',    label: '📡 RADAR' },
                  { key: 'rf',       label: '📶 RF' },
                  { key: 'eo',       label: '📷 EO/IR' },
                  { key: 'acoustic', label: '🔊 ACST' },
                  { key: 'manual',   label: '📖 MANUAL' },
                ] as const).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setSensorTab(tab.key)}
                    style={{
                      flex: 1, padding: '8px 4px', border: 'none', cursor: 'pointer',
                      fontSize: '9.5px', fontWeight: 800, letterSpacing: '0.04em',
                      backgroundColor: sensorTab === tab.key ? 'rgba(245,158,11,0.2)' : 'transparent',
                      color: sensorTab === tab.key ? '#fbbf24' : '#64748b',
                      borderBottom: sensorTab === tab.key ? '2px solid #fbbf24' : '2px solid transparent',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div style={{ padding: '12px', fontSize: '11px' }}>
                {sensorTab === 'radar' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {[
                      { label: 'RCS', val: fieldVal('rcs', sensors.radar.rcs) },
                      { label: 'ALTITUDE', val: `${threat.altitude}m` },
                      { label: 'SNR', val: fieldVal('snr', sensors.radar.snr) },
                      { label: 'IFF SQUAWK', val: fieldVal('iff', sensors.radar.iff) },
                    ].map(f => (
                      <div key={f.label} style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 8px', borderRadius: '6px' }}>
                        <span style={{ fontSize: '8px', color: '#64748b', fontWeight: 700 }}>{f.label}</span>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#cbd5e1', fontWeight: 600 }}>{f.val}</p>
                      </div>
                    ))}
                  </div>
                )}

                {sensorTab === 'rf' && (
                  <div>
                    <div style={{ marginBottom: '8px' }}>
                      <span style={{ fontSize: '8px', color: '#64748b', fontWeight: 700 }}>LIVE RF SPECTRUM WATERFALL</span>
                      {sensorDegradation && degradedFields.includes('rf') ? (
                        <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#fbbf24', fontFamily: 'monospace' }}>⚠ RF SENSORS JAMMED</p>
                      ) : RFSpectrum}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                      {[
                        { label: 'FREQ', val: fieldVal('frequency', sensors.rf.frequency) },
                        { label: 'POWER', val: fieldVal('power', sensors.rf.power) },
                        { label: 'ENCRYPTION', val: sensors.rf.encrypted ? '⚠ ENCRYPTED' : 'Clear' },
                      ].map(f => (
                        <div key={f.label} style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 8px', borderRadius: '6px' }}>
                          <span style={{ fontSize: '8px', color: '#64748b', fontWeight: 700 }}>{f.label}</span>
                          <p style={{ margin: '2px 0 0', fontSize: '10.5px', color: '#cbd5e1', fontWeight: 600 }}>{f.val}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {sensorTab === 'eo' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    {[
                      { label: 'FRAME', val: fieldVal('frameType', sensors.eoIr.frameType) },
                      { label: 'THERMAL', val: fieldVal('thermal', sensors.eoIr.thermal) },
                      { label: 'IR SUPPRESSION', val: fieldVal('irSuppression', sensors.eoIr.irSuppression) },
                    ].map(f => (
                      <div key={f.label} style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 8px', borderRadius: '6px' }}>
                        <span style={{ fontSize: '8px', color: '#64748b', fontWeight: 700 }}>{f.label}</span>
                        <p style={{ margin: '2px 0 0', fontSize: '10.5px', color: '#cbd5e1', fontWeight: 600 }}>{f.val}</p>
                      </div>
                    ))}
                  </div>
                )}

                {sensorTab === 'acoustic' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    {[
                      { label: 'FREQ RANGE', val: fieldVal('freqHz', sensors.acoustic.freqHz) },
                      { label: 'SPL LEVEL', val: fieldVal('dbLevel', sensors.acoustic.dbLevel) },
                      { label: 'ROTOR COUNT', val: fieldVal('rotorCount', sensors.acoustic.rotorCount) },
                    ].map(f => (
                      <div key={f.label} style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 8px', borderRadius: '6px' }}>
                        <span style={{ fontSize: '8px', color: '#64748b', fontWeight: 700 }}>{f.label}</span>
                        <p style={{ margin: '2px 0 0', fontSize: '10.5px', color: '#cbd5e1', fontWeight: 600 }}>{f.val}</p>
                      </div>
                    ))}
                  </div>
                )}

                {sensorTab === 'manual' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                    <div style={{ padding: '6px 10px', borderRadius: '6px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
                      <p style={{ margin: 0, fontSize: '9.5px', fontWeight: 800, color: '#fbbf24' }}>🟡 COMMERCIAL UAS (DJI, FPV, T30)</p>
                      <p style={{ margin: '2px 0 0', fontSize: '9px', color: '#cbd5e1' }}>
                        Micro-RCS (&lt;0.03 m²), 2.4/5.8 GHz ISM band. Counter: <b>[Q] DIR. RF JAMMER</b> or <b>[T] GNSS SPOOF</b>.
                      </p>
                    </div>
                    <div style={{ padding: '6px 10px', borderRadius: '6px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
                      <p style={{ margin: 0, fontSize: '9.5px', fontWeight: 800, color: '#f87171' }}>🔴 MILITARY UCAV (Burraq, GJ-2, CH-4, Harop)</p>
                      <p style={{ margin: '2px 0 0', fontSize: '9px', color: '#cbd5e1' }}>
                        Fixed-wing RCS (&gt;0.15 m²), high-heat engine plume. Counter: <b>[W] KINETIC SAM</b> or <b>[Y] 10kW LASER DEW</b>.
                      </p>
                    </div>
                    <div style={{ padding: '6px 10px', borderRadius: '6px', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)' }}>
                      <p style={{ margin: 0, fontSize: '9.5px', fontWeight: 800, color: '#c084fc' }}>🟣 AUTONOMOUS SWARM (Mesh TDMA Cluster)</p>
                      <p style={{ margin: '2px 0 0', fontSize: '9px', color: '#cbd5e1' }}>
                        Time-synchronized saturation dive. Counter: <b>[E] EMP / EW SUITE</b> wide-area microwave burst.
                      </p>
                    </div>
                    <div style={{ padding: '6px 10px', borderRadius: '6px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}>
                      <p style={{ margin: 0, fontSize: '9.5px', fontWeight: 800, color: '#4ade80' }}>🟢 NEUTRAL / FRIENDLY IFF (Airliners)</p>
                      <p style={{ margin: '2px 0 0', fontSize: '9px', color: '#cbd5e1' }}>
                        Mode-5 cryptographic IFF squawk. Counter: <b>[R] HOLD FIRE / LOG</b> (avoid −25 pt fratricide).
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* ════ RIGHT COLUMN: OODA DECISIONS & COUNTERMEASURES ════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* 1. GROQ LIVE AI THREAT ASSESSMENT */}
            <div style={{
              backgroundColor: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.25)',
              borderRadius: '12px', padding: '12px 14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    backgroundColor: aiLoading ? '#6366f1' : '#22c55e',
                    boxShadow: aiLoading ? '0 0 8px #6366f1' : '0 0 6px #22c55e',
                  }} />
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#a5b4fc', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {aiLoading ? 'GROQ LLM INFERENCE IN PROGRESS...' : 'GROQ LLM LIVE ASSESSMENT'}
                  </span>
                </div>
                {ai && (
                  <span style={{ fontSize: '9.5px', fontWeight: 800, color: RATING_COLOR[ai.urgency] ?? '#fff' }}>
                    {ai.urgency} URGENCY
                  </span>
                )}
              </div>

              {ai && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '6px 10px' }}>
                      <span style={{ fontSize: '8px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>SUGGESTED INTENT</span>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', fontWeight: 800, color: ai.intent === 'hostile' ? '#ef4444' : ai.intent === 'neutral' ? '#f59e0b' : '#22c55e' }}>
                        {ai.intent.toUpperCase()} ({ai.intentConfidence}%)
                      </p>
                    </div>
                    <div style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '6px 10px' }}>
                      <span style={{ fontSize: '8px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>SUGGESTED EFFECTOR</span>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', fontWeight: 800, color: '#a5b4fc' }}>
                        {ai.countermeasure.toUpperCase().replace(/-/g, ' ')}
                      </p>
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: '10.5px', color: '#cbd5e1', lineHeight: '1.4', borderLeft: '2px solid rgba(99,102,241,0.4)', paddingLeft: '8px' }}>
                    {ai.reasoning}
                  </p>
                </div>
              )}
            </div>

            {/* 2. OODA STEP 1: TARGET CLASS DESIGNATION */}
            <div>
              <p style={{ margin: '0 0 6px', fontSize: '9px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>
                STEP 1: DESIGNATE AIRFRAME CLASS [HOTKEYS: 1 / 2 / 3]
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setSelectedType(t.value)}
                    style={{
                      padding: '10px 8px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.15s',
                      border: selectedType === t.value ? `2px solid ${t.color}` : '1.5px solid rgba(255,255,255,0.1)',
                      backgroundColor: selectedType === t.value ? `${t.color}22` : 'rgba(255,255,255,0.03)',
                      color: selectedType === t.value ? t.color : '#94a3b8',
                      textAlign: 'center',
                    }}
                  >
                    <span style={{ display: 'block', fontSize: '9px', color: selectedType === t.value ? t.color : '#475569', fontFamily: 'monospace', fontWeight: 800 }}>
                      [{t.key}]
                    </span>
                    <span style={{ display: 'block', fontSize: '11px', fontWeight: 800, marginTop: '2px' }}>
                      {t.label}
                    </span>
                    <span style={{ display: 'block', fontSize: '8.5px', color: selectedType === t.value ? '#cbd5e1' : '#475569', marginTop: '2px' }}>
                      {t.sub}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. OODA STEP 2: THREAT INTENT CLASSIFICATION */}
            <div>
              <p style={{ margin: '0 0 6px', fontSize: '9px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>
                STEP 2: CLASSIFY THREAT INTENT [HOTKEYS: H / N / F]
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {INTENTS.map(intent => {
                  const ic = intent.value === 'hostile' ? '#ef4444' : intent.value === 'neutral' ? '#f59e0b' : '#22c55e';
                  return (
                    <button
                      key={intent.value}
                      onClick={() => setSelectedIntent(intent.value)}
                      style={{
                        padding: '10px 8px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.15s',
                        border: selectedIntent === intent.value ? `2px solid ${ic}` : '1.5px solid rgba(255,255,255,0.1)',
                        backgroundColor: selectedIntent === intent.value ? `${ic}22` : 'rgba(255,255,255,0.03)',
                        color: selectedIntent === intent.value ? ic : '#94a3b8',
                        textAlign: 'center',
                      }}
                    >
                      <span style={{ display: 'block', fontSize: '9px', color: selectedIntent === intent.value ? ic : '#475569', fontFamily: 'monospace', fontWeight: 800 }}>
                        [{intent.key}]
                      </span>
                      <span style={{ display: 'block', fontSize: '11px', fontWeight: 800, marginTop: '2px' }}>
                        {intent.label}
                      </span>
                      <span style={{ display: 'block', fontSize: '8.5px', color: selectedIntent === intent.value ? '#cbd5e1' : '#475569', marginTop: '2px' }}>
                        {intent.sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. OODA STEP 3: SELECT COUNTERMEASURE EFFECTOR */}
            <div>
              <p style={{ margin: '0 0 6px', fontSize: '9px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>
                STEP 3: DEPLOY AUTHORIZED C-UAS EFFECTOR [HOTKEYS: Q / T / W / Y / E / R]
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {CMS.map(cm => {
                  const depleted = isDepleted(cm.value);
                  const isSelected = selectedCm === cm.value;
                  const ammoText =
                    cm.value === 'interceptor' ? ` (${ammo?.interceptor ?? 6} SAM)` :
                    cm.value === 'ew' ? ` (${ammo?.ew ?? 4} EW)` : '';
                  const solution = calculatePkAndWez(cm.value, threat);
                  return (
                    <button
                      key={cm.value}
                      onClick={() => !depleted && setSelectedCm(cm.value)}
                      disabled={depleted}
                      style={{
                        padding: '10px 10px', borderRadius: '10px', cursor: depleted ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s', textAlign: 'left',
                        border: isSelected ? `2px solid ${cm.color}` : '1.5px solid rgba(255,255,255,0.09)',
                        backgroundColor: isSelected ? `${cm.color}22` : 'rgba(255,255,255,0.03)',
                        opacity: depleted ? 0.35 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '9px', color: isSelected ? cm.color : '#475569', fontFamily: 'monospace', fontWeight: 800 }}>
                          [{cm.key}] {ammoText}
                        </span>
                        {/* Dynamic Pk Pill */}
                        <span style={{
                          fontSize: '8px', fontWeight: 800, padding: '1px 5px', borderRadius: '4px',
                          backgroundColor: `${solution.color}22`, color: solution.color,
                          border: `1px solid ${solution.color}44`,
                        }}>
                          Pk: {solution.pk}%
                        </span>
                      </div>
                      <span style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: isSelected ? cm.color : '#e2e8f0', marginTop: '3px' }}>
                        {cm.label}
                      </span>
                      <span style={{ display: 'block', fontSize: '8.5px', color: isSelected ? '#cbd5e1' : '#64748b', marginTop: '2px' }}>
                        {cm.sub}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* DYNAMIC BALLISTIC SOLUTION & WEZ CARD */}
              {selectedCm && (() => {
                const sol = calculatePkAndWez(selectedCm, threat);
                return (
                  <div style={{
                    marginTop: '10px', padding: '10px 12px', borderRadius: '10px',
                    backgroundColor: 'rgba(15, 23, 42, 0.85)',
                    border: `1.5px solid ${sol.color}55`,
                    boxShadow: `0 0 16px ${sol.color}18`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '8.5px', fontWeight: 800, color: sol.color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        🎯 WEZ BALLISTIC SOLUTION &middot; {sol.status}
                      </span>
                      <span style={{ fontSize: '9px', fontWeight: 900, color: sol.color, fontFamily: 'monospace' }}>
                        PROBABILITY OF KILL (Pk): {sol.pk}%
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '9px', color: '#94a3b8', marginBottom: '4px', fontFamily: 'monospace' }}>
                      <span>RNG: <strong style={{ color: '#fff' }}>{sol.distanceKm} km</strong></span>
                      <span>TTI: <strong style={{ color: '#f59e0b' }}>{sol.ttiSec}s</strong></span>
                      <span>ENV: <strong style={{ color: '#38bdf8' }}>{sol.wezEnvelope}</strong></span>
                    </div>
                    <p style={{ margin: 0, fontSize: '9.5px', color: '#cbd5e1', lineHeight: '1.35', borderLeft: `2px solid ${sol.color}`, paddingLeft: '8px' }}>
                      {sol.tacticalNote}
                    </p>

                    {/* Defense System Firing Station & Intercept Coordinates */}
                    <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', fontSize: '8.5px', fontFamily: 'monospace' }}>
                      <div>
                        <span style={{ color: '#64748b', display: 'block' }}>🚀 FIRING BATTERY:</span>
                        <span style={{ color: '#38bdf8', fontWeight: 800 }}>{sol.batteryStation?.name}</span>
                        <span style={{ color: '#94a3b8', display: 'block' }}>[{sol.batteryStation?.lat.toFixed(4)}°N, {sol.batteryStation?.lng.toFixed(4)}°E]</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', display: 'block' }}>🎯 INTERCEPT COORD:</span>
                        <span style={{ color: '#f59e0b', fontWeight: 800 }}>[{sol.targetCoords?.lat.toFixed(4)}°N, {sol.targetCoords?.lng.toFixed(4)}°E]</span>
                        <span style={{ color: '#94a3b8', display: 'block' }}>ALT {sol.targetCoords?.altM}M · SLANT {sol.slantRangeKm}KM · TOF {sol.timeOfFlightSec}s</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 5. CONFIRM & EXECUTE ENGAGEMENT BUTTON */}
            <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
              <button
                onClick={handleConfirm}
                disabled={!canSubmit}
                style={{
                  width: '100%',
                  padding: '14px', borderRadius: '12px',
                  backgroundColor: canSubmit ? '#f59e0b' : 'rgba(255,255,255,0.05)',
                  color: canSubmit ? '#090d16' : '#475569',
                  border: 'none', cursor: canSubmit ? 'pointer' : 'not-allowed',
                  fontSize: '13px', fontWeight: 900, letterSpacing: '0.04em',
                  boxShadow: canSubmit ? '0 0 24px rgba(245,158,11,0.35)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {paused
                  ? '⏸ SIMULATION PAUSED — ALL AIR DEFENCE ACTIONS FROZEN (RESUME TO ENGAGE)'
                  : canSubmit
                    ? `⚡ CONFIRM & DEPLOY ${selectedCm?.toUpperCase().replace(/-/g, ' ')} [ENTER] →`
                    : 'COMPLETE OODA CLASSIFICATION (TYPE + INTENT + EFFECTOR) TO ENGAGE'}
              </button>
            </div>

          </div>

        </div>

      </div>
    </motion.div>
  );
}
