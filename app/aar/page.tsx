'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Session, Decision } from '@/types';
import { getActiveProfileSessions, getProfile, isTierUnlocked, type TraineeProfile } from '@/lib/storage';
import { getLevel } from '@/lib/levels';
import { scoreDecision, getMissionGrade } from '@/lib/scoring';
import { getDoctrine } from '@/lib/doctrine';
import { checkAndEarnAchievements, ACHIEVEMENT_DEFS, type AchievementDef } from '@/lib/achievements';
import CertificateOverlay from '@/components/CertificateOverlay';
import SkillPassport from '@/components/SkillPassport';
import TrainingRecordOverlay from '@/components/TrainingRecordOverlay';
import MilitarySitrepModal from '@/components/MilitarySitrepModal';
import { updateWeaknessProfile, getWeakAreas, type CoachingReport } from '@/lib/adaptiveEngine';
import { getCorrectCountermeasure, isValidCountermeasure } from '@/lib/scenario';

function pct(n: number, d: number) { return d === 0 ? 0 : Math.round((n / d) * 100); }

const BDA_OUTCOMES: Record<string, { label: string; color: string }> = {
  'rf-jammer':      { label: 'RF JAMMED — COMMS SEVERED',        color: '#3b82f6' },
  'gnss-spoof':     { label: 'GNSS HIJACKED — DIVERTED TO LZ',   color: '#06b6d4' },
  'interceptor':    { label: 'KINETIC KILL — TARGET DESTROYED',  color: '#ef4444' },
  'laser-dew':      { label: '10kW DEW HIT — AIRFRAME DESTROYED', color: '#f97316' },
  'ew':             { label: 'EMP BURST — SWARM DENIED',          color: '#8b5cf6' },
  'alert-evacuate': { label: 'HOLD FIRE — LOGGED, EVACUATING',   color: '#22c55e' },
};

// ── Trajectory mini-map SVG ──────────────────────────────────────────────────
function TrajectoryMini({ path, targetLat, targetLng, correct }: {
  path: Array<{ lat: number; lng: number; t: number }>;
  targetLat: number; targetLng: number; correct: boolean;
}) {
  if (path.length < 2) return null;
  const allPts = [...path, { lat: targetLat, lng: targetLng, t: 0 }];
  const lats = allPts.map(p => p.lat), lngs = allPts.map(p => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const dLat = maxLat - minLat || 0.01, dLng = maxLng - minLng || 0.01;
  const W = 72, H = 52, P = 6;
  const x = (lng: number) => P + ((lng - minLng) / dLng) * (W - P * 2);
  const y = (lat: number) => H - P - ((lat - minLat) / dLat) * (H - P * 2);
  const pts = path.map(p => `${x(p.lng).toFixed(1)},${y(p.lat).toFixed(1)}`).join(' ');
  const s = path[0], tgt = { lat: targetLat, lng: targetLng };
  const lineColor = correct ? 'rgba(34,197,94,0.55)' : 'rgba(239,68,68,0.55)';
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ flexShrink: 0 }}>
      <rect width={W} height={H} rx={4} fill="rgba(255,255,255,0.03)" />
      {path.length >= 2 && (
        <polyline points={pts} fill="none" stroke={lineColor} strokeWidth="1.5" strokeDasharray="3 2" />
      )}
      {/* Spawn */}
      <circle cx={x(s.lng)} cy={y(s.lat)} r={2.5} fill="#94a3b8" />
      {/* Intercept */}
      <circle cx={x(path[path.length-1].lng)} cy={y(path[path.length-1].lat)} r={3} fill={correct ? '#22c55e' : '#ef4444'} />
      {/* Target base */}
      <circle cx={x(tgt.lng)} cy={y(tgt.lat)} r={3.5} fill="none" stroke="#ef4444" strokeWidth="1.5" />
    </svg>
  );
}

// ── Competency matrix ────────────────────────────────────────────────────────
interface Competency { label: string; score: number; detail: string; assessed: boolean; }

function buildCompetency(decisions: Decision[]): Competency[] {
  const byType = (t: string) => decisions.filter(d => d.threatType === t);
  const correct = (ds: Decision[]) => ds.filter(d => d.correct).length;
  const comm = byType('commercial'), mil = byType('military'), swrm = byType('swarm');
  const hostile = decisions.filter(d => d.intent === 'hostile');
  const neutral = decisions.filter(d => d.intent !== 'hostile');
  const withAI  = decisions.filter(d => d.followedAI !== undefined);
  const avgMs   = decisions.length ? decisions.reduce((a, d) => a + d.responseTimeMs, 0) / decisions.length : 0;
  const speedScore = Math.max(0, Math.round(100 - (avgMs / 1000 - 3) * 8));

  const dtAll = decisions.map(d => d.detectionTimeMs ?? 0).filter(t => t > 0);
  const detectionScore = dtAll.length
    ? Math.min(100, Math.max(0, Math.round(100 - (dtAll.reduce((a, b) => a + b, 0) / dtAll.length / 1000 - 2) * 10)))
    : 0;

  return [
    { label: 'Commercial Drone ID',      assessed: comm.length > 0,    score: pct(correct(comm), comm.length), detail: `${correct(comm)}/${comm.length} correctly identified` },
    { label: 'Military UCAV ID',         assessed: mil.length > 0,     score: pct(correct(mil),  mil.length),  detail: `${correct(mil)}/${mil.length} correctly identified` },
    { label: 'Swarm Recognition',        assessed: swrm.length > 0,    score: pct(correct(swrm), swrm.length), detail: `${correct(swrm)}/${swrm.length} correctly identified` },
    { label: 'Hostile Intent Assessment', assessed: hostile.length > 0,
      score: pct(hostile.filter(d => d.classifiedIntent === 'hostile').length, hostile.length),
      detail: `${hostile.filter(d => d.classifiedIntent === 'hostile').length}/${hostile.length} correct intent calls` },
    { label: 'Decoy Discrimination', assessed: neutral.length > 0,
      score: pct(neutral.filter(d => d.classifiedIntent !== 'hostile').length, neutral.length),
      detail: `${neutral.filter(d => d.classifiedIntent !== 'hostile').length}/${neutral.length} neutrals correctly spared` },
    { label: 'Countermeasure Doctrine', assessed: decisions.length > 0,
      score: pct(decisions.filter(d => isValidCountermeasure(d.threatType, d.intent, d.countermeasure)).length, decisions.length),
      detail: 'Correct doctrine countermeasure rate' },
    { label: 'AI Alignment Rate', assessed: withAI.length > 0,
      score: withAI.length ? pct(withAI.filter(d => d.followedAI).length, withAI.length) : 0,
      detail: withAI.length ? `Agreed with AI on ${withAI.filter(d => d.followedAI).length}/${withAI.length} assessments` : 'No AI data' },
    { label: 'Classification Speed', assessed: decisions.length > 0,  score: Math.min(100, speedScore), detail: `Avg ${(avgMs / 1000).toFixed(1)}s from detection to deploy` },
    { label: 'Detection Speed', assessed: dtAll.length > 0, score: detectionScore,
      detail: dtAll.length
        ? `Avg ${(dtAll.reduce((a, b) => a + b, 0) / dtAll.length / 1000).toFixed(1)}s from spawn to detection`
        : 'No detection data' },
  ];
}

function getOperatorRating(avgScore: number): { rank: string; color: string; description: string } {
  if (avgScore >= 90) return { rank: 'EXPERT OPERATOR', color: '#f59e0b', description: 'Cleared for independent air defence operations. All countermeasure doctrine mastered.' };
  if (avgScore >= 75) return { rank: 'PROFICIENT',      color: '#22c55e', description: 'Strong classification skills. Minor gaps in edge-case doctrine — continue training.' };
  if (avgScore >= 60) return { rank: 'QUALIFIED',       color: '#3b82f6', description: 'Core skills established. Requires supervised operations and targeted remediation.' };
  if (avgScore >= 40) return { rank: 'CADET',           color: '#8b5cf6', description: 'Basic familiarity established. Significant training required before operational deployment.' };
  return                      { rank: 'RECRUIT',        color: '#6b7280', description: 'Initial training stage. Review all doctrine modules before re-assessment.' };
}

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div style={{ flex: 1, height: '6px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
      <div style={{ width: `${score}%`, height: '100%', backgroundColor: color, borderRadius: '4px', transition: 'width 1s ease' }} />
    </div>
  );
}

function barColor(s: number) {
  return s >= 80 ? '#22c55e' : s >= 60 ? '#f59e0b' : s >= 40 ? '#f97316' : '#ef4444';
}

// ── Adaptive difficulty recommendation ──────────────────────────────────────
function getDifficultyRec(avgCompScore: number, currentLevel: number): { text: string; level: number; color: string } {
  const next = Math.min(currentLevel + 1, 125);
  const easier = Math.max(currentLevel - 2, 1);
  if (avgCompScore >= 80) return { text: `Strong performance — ready for Level ${next}`, level: next, color: '#22c55e' };
  if (avgCompScore >= 60) return { text: `Solid effort — advance to Level ${next} to challenge further`, level: next, color: '#f59e0b' };
  return { text: `Replay Level ${easier} to reinforce foundational skills before advancing`, level: easier, color: '#ef4444' };
}

// ── PS scoring breakdown per decision ───────────────────────────────────────
function ScoringBreakdown({ d }: { d: Decision }) {
  const MAX_DET = 15000, MAX_RESP = 10000;
  const detScore  = Math.round(Math.max(0, 30 * (1 - (d.detectionTimeMs ?? MAX_DET) / MAX_DET)));
  const typeScore = d.classifiedAs === d.threatType ? 15 : 0;
  const intScore  = d.classifiedIntent === d.intent ? 15 : 0;
  const decScore  = isValidCountermeasure(d.threatType, d.intent, d.countermeasure) ? 25 : 0;
  const spdScore  = Math.round(Math.max(0, 15 * (1 - d.responseTimeMs / MAX_RESP)));
  const fratricide = d.intent !== 'hostile' && d.classifiedIntent === 'hostile';
  const total = scoreDecision(d);

  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
      {[
        { label: 'DET', val: detScore,  max: 30 },
        { label: 'CLS', val: typeScore + intScore, max: 30 },
        { label: 'DEC', val: decScore,  max: 25 },
        { label: 'SPD', val: spdScore,  max: 15 },
      ].map(s => (
        <span key={s.label} style={{ fontSize: '9px', fontFamily: 'monospace', color: s.val === s.max ? '#22c55e' : s.val === 0 ? '#ef4444' : '#f59e0b' }}>
          {s.label}:{s.val}
        </span>
      ))}
      {fratricide && <span style={{ fontSize: '9px', color: '#ef4444', fontWeight: 700 }}>FRATRICIDE −25</span>}
      <span style={{ fontSize: '9px', fontWeight: 700, color: '#f59e0b', marginLeft: '2px' }}>={total}pts</span>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function AARPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [history, setHistory] = useState<Session[]>([]);
  const [newAchievements, setNewAchievements] = useState<AchievementDef[]>([]);
  const [showCert, setShowCert] = useState(false);
  const [operatorName, setOperatorName] = useState('');
  const [profile, setProfile] = useState<TraineeProfile>({ name: '', rank: '', serviceNo: '', unit: '', base: '' });
  const [coaching, setCoaching] = useState<CoachingReport | null>(null);
  const [coachingLoading, setCoachingLoading] = useState(false);
  const [showTrainingRecord, setShowTrainingRecord] = useState(false);
  const [showSitrep, setShowSitrep] = useState(false);

  useEffect(() => {
    const name = localStorage.getItem('droneshield-operator');
    if (name) setOperatorName(name);
    setProfile(getProfile());
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem('last-session');
    if (!raw) return;
    const s: Session = JSON.parse(raw);
    setSession(s);
    const all = getActiveProfileSessions();
    setHistory(all);
    const earned = checkAndEarnAchievements(s, all);
    setNewAchievements(earned);
    const lvl = s.level ?? 1;
    const isTierEnd = [25, 50, 75, 100, 125].includes(lvl);
    const { grade } = getMissionGrade(s.decisions, s.breachCount ?? 0);
    if (isTierEnd && ['S', 'A', 'B', 'C'].includes(grade)) {
      setShowCert(true);
    }
    // Update weakness profile + fetch AI coaching
    const profile = updateWeaknessProfile(all);
    const weakAreas = getWeakAreas(profile);
    if (weakAreas.length > 0) {
      setCoachingLoading(true);
      const name = localStorage.getItem('droneshield-operator') ?? '';
      fetch('/api/coaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weakAreas: weakAreas.map(a => a.type),
          sessions: all.length,
          operatorName: name,
        }),
      })
        .then(r => r.json())
        .then((data: CoachingReport) => {
          if (data?.tacticalAdvice) setCoaching(data);
        })
        .catch(() => {})
        .finally(() => setCoachingLoading(false));
    }
  }, []);

  if (!session) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#6b7280', marginBottom: '16px' }}>No session data found.</p>
        <button onClick={() => router.push('/')} style={{ background: '#f59e0b', color: '#0a0a0f', border: 'none', borderRadius: '999px', padding: '10px 24px', fontWeight: 700, cursor: 'pointer' }}>Go Home</button>
      </div>
    </div>
  );

  const decisions = session.decisions;
  const level = getLevel(session.level ?? 1);
  const competencies = buildCompetency(decisions);
  const relevantComps = competencies.filter(c => c.assessed && !(c.label === 'AI Alignment Rate' && !c.assessed));
  const avgCompScore = relevantComps.length ? Math.round(relevantComps.reduce((a, c) => a + c.score, 0) / relevantComps.length) : 0;
  const rating = getOperatorRating(avgCompScore);
  const weakAreas = competencies.filter(c => c.assessed && c.score < 60);
  const diffRec = getDifficultyRec(avgCompScore, session.level ?? 1);
  const sessionBaseHealth = session.baseHealth ?? 100;
  const sessionBreachCount = session.breachCount ?? 0;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff', fontFamily: 'inherit' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(0,0,0,0) 60%)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '32px 40px' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <p style={{ margin: 0, fontSize: '10px', color: '#f59e0b', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>AFTER ACTION REVIEW</p>
            <h1 style={{ margin: '6px 0 2px', fontSize: '24px', fontWeight: 900, letterSpacing: '-0.03em' }}>
              Mission {String(session.level ?? '?').padStart(2, '0')} &mdash; {level.name}
            </h1>
            <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#fca5a5', fontWeight: 500, lineHeight: 1.4 }}>{level.scenario}</p>
            <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
              {profile.rank ? `${profile.rank} ` : ''}{profile.name || operatorName || ''}
              {(profile.rank || profile.name || operatorName) ? ' \u00b7 ' : ''}
              {profile.unit ? `${profile.unit} \u00b7 ` : ''}
              Level {session.level ?? '?'} &nbsp;&middot;&nbsp; {decisions.length} engagements
              &nbsp;&middot;&nbsp; Base integrity {sessionBaseHealth}%
              {sessionBreachCount > 0 && <span style={{ color: '#ef4444' }}> &nbsp;({sessionBreachCount} breaches)</span>}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>
            {(() => {
              const grade = getMissionGrade(decisions, session.breachCount ?? 0);
              return (
                <div style={{ textAlign: 'center', background: `${grade.color}0d`, border: `1px solid ${grade.color}33`, borderRadius: '16px', padding: '12px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ margin: 0, fontSize: '42px', fontWeight: 900, color: grade.color, lineHeight: 1 }}>{grade.grade}</p>
                  <p style={{ margin: '4px 0 0', fontSize: '10px', color: grade.color, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.7 }}>{grade.label}</p>
                </div>
              );
            })()}
            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px 24px' }}>
              <p style={{ margin: 0, fontSize: '36px', fontWeight: 900, color: '#f59e0b', lineHeight: 1 }}>{session.score}</p>
              <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Mission Score</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Operator rating */}
        <div style={{ background: `${rating.color}0d`, border: `1px solid ${rating.color}33`, borderRadius: '20px', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: '10px', color: rating.color, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>OPERATOR RATING</p>
            <p style={{ margin: '4px 0 6px', fontSize: '22px', fontWeight: 900, color: '#fff' }}>{rating.rank}</p>
            <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af', lineHeight: '1.5' }}>{rating.description}</p>
          </div>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <p style={{ margin: 0, fontSize: '42px', fontWeight: 900, color: rating.color, lineHeight: 1 }}>{avgCompScore}%</p>
            <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Composite</p>
          </div>
        </div>

        {/* PS scoring breakdown summary */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '16px 24px' }}>
          <p style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            OPERATIONAL COMBAT READINESS SCORING FORMULA — per engagement
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {[
              { label: 'Detection Speed', pts: 30, desc: 'spawn → detect time' },
              { label: 'Classification',  pts: 30, desc: 'type (15) + intent (15)' },
              { label: 'Engagement Decision', pts: 25, desc: 'correct countermeasure' },
              { label: 'Speed / Consistency', pts: 15, desc: 'classify → deploy time' },
            ].map(s => (
              <div key={s.label} style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '10px 12px' }}>
                <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, color: '#f59e0b' }}>{s.pts} pts</p>
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#e5e7eb', fontWeight: 600 }}>{s.label}</p>
                <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#4b5563' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Competency matrix */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '20px 24px' }}>
          <p style={{ margin: '0 0 16px', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>COMPETENCY MATRIX</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {competencies.map(c => (
              <div key={c.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: !c.assessed ? '#4b5563' : c.score < 60 ? '#f87171' : '#e5e7eb' }}>{c.label}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: !c.assessed ? '#374151' : barColor(c.score), minWidth: '36px', textAlign: 'right' }}>
                    {c.assessed ? `${c.score}%` : 'N/A'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {c.assessed
                    ? <ScoreBar score={c.score} color={barColor(c.score)} />
                    : <div style={{ flex: 1, height: '6px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '4px' }} />
                  }
                  <span style={{ fontSize: '10px', color: '#4b5563', whiteSpace: 'nowrap' }}>{c.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Training gaps + recommendation */}
        {weakAreas.length > 0 && (
          <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '20px', padding: '20px 24px' }}>
            <p style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 700, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.1em' }}>&#9888; TRAINING GAPS IDENTIFIED</p>
            <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {weakAreas.map(w => (
                <li key={w.label} style={{ fontSize: '13px', color: '#fca5a5' }}>
                  <strong>{w.label}</strong>: {w.score}% — {w.detail}
                </li>
              ))}
            </ul>
            <p style={{ margin: '12px 0 0', fontSize: '12px', color: '#9ca3af', lineHeight: '1.5' }}>
              <strong style={{ color: '#f87171' }}>Recommendation:</strong> Review doctrine modules for {weakAreas.map(w => w.label.split(' ').slice(-2).join(' ')).join(', ')} before next sortie.
            </p>
          </div>
        )}

        {/* AI Tactical Coach — PS26247 "AI-Enabled" requirement */}
        {(coachingLoading || coaching) && (
          <div style={{ background: 'rgba(129,140,248,0.06)', border: '1px solid rgba(129,140,248,0.2)', borderRadius: '20px', padding: '20px 24px' }}>
            <p style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              &#129504; AI TACTICAL COACH — Groq LLM Personalized Analysis
            </p>
            {coachingLoading && !coaching && (
              <p style={{ color: '#4b5563', fontSize: '12px' }}>Analysing training data…</p>
            )}
            {coaching && (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                  {coaching.focusAreas.map((area, i) => (
                    <span key={i} style={{ fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', backgroundColor: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.25)', color: '#a5b4fc' }}>
                      {area}
                    </span>
                  ))}
                </div>
                <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#c7d2fe', lineHeight: '1.6' }}>
                  <strong style={{ color: '#818cf8' }}>Tactical Assessment: </strong>{coaching.tacticalAdvice}
                </p>
                <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#9ca3af', lineHeight: '1.5' }}>
                  <strong style={{ color: '#818cf8' }}>Drill: </strong>{coaching.drillRecommendation}
                </p>
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(129,140,248,0.15)', backgroundColor: 'rgba(129,140,248,0.04)', borderRadius: '8px', padding: '8px 12px' }}>
                  <p style={{ margin: 0, fontSize: '11px', color: '#6b7280', fontStyle: 'italic' }}>
                    <strong style={{ color: '#818cf8', fontStyle: 'normal' }}>Mental Model: </strong>{coaching.mentalModel}
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Adaptive difficulty recommendation (PS requirement) */}
        <div style={{ background: `${diffRec.color}0d`, border: `1px solid ${diffRec.color}33`, borderRadius: '16px', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <p style={{ margin: 0, fontSize: '10px', color: diffRec.color, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>ADAPTIVE TRAINING SYSTEM</p>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#e5e7eb' }}>{diffRec.text}</p>
          </div>
          <button
            onClick={() => {
              const targetTier = Math.floor((diffRec.level - 1) / 25);
              if (isTierUnlocked(targetTier)) {
                sessionStorage.setItem('level', String(diffRec.level));
                router.push('/simulation');
              } else {
                router.push('/');
              }
            }}
            style={{ background: diffRec.color, color: '#0a0a0f', fontWeight: 800, padding: '10px 20px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: '12px', flexShrink: 0 }}
          >
            Go Level {diffRec.level}
          </button>
        </div>

        {/* Skill Passport */}
        <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px' }}>
          <SkillPassport sessions={history} />
        </div>

        {/* Achievements earned this session */}
        {newAchievements.length > 0 && (
          <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '20px', padding: '20px 24px' }}>
            <p style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              &#127942; COMPETENCY BADGES EARNED
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {newAchievements.map(a => (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  backgroundColor: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.2)',
                  borderRadius: '12px', padding: '8px 12px',
                }}>
                  <span style={{ fontSize: '16px' }}>{a.icon}</span>
                  <div>
                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#f59e0b' }}>{a.name}</p>
                    <p style={{ margin: 0, fontSize: '10px', color: '#6b7280' }}>{a.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Engagement log with trajectory replay */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '20px 24px' }}>
          <p style={{ margin: '0 0 14px', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>ENGAGEMENT LOG — TRAJECTORY REPLAY</p>
          {decisions.length === 0 && <p style={{ color: '#4b5563', fontSize: '13px' }}>No engagements recorded.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {decisions.map((d, i) => {
              const fratricide = d.intent !== 'hostile' && d.classifiedIntent === 'hostile';
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '12px',
                  padding: '10px 12px', borderRadius: '12px',
                  backgroundColor: fratricide ? 'rgba(239,68,68,0.08)' : d.correct ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)',
                  border: `1px solid ${fratricide ? 'rgba(239,68,68,0.25)' : d.correct ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)'}`,
                }}>
                  {/* Trajectory mini-map */}
                  <TrajectoryMini
                    path={d.path ?? []}
                    targetLat={level.targetLat}
                    targetLng={level.targetLng}
                    correct={d.correct}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#e5e7eb' }}>
                      {d.modelName ? <span style={{ color: '#f59e0b' }}>{d.modelName}</span> : d.threatType.toUpperCase()}
                      {' '}&middot;{' '}{d.intent.toUpperCase()} &rarr; {d.countermeasure.toUpperCase().replace(/-/g, ' ')}
                    </p>
                    {!d.correct && (() => {
                      const optimalCm = getCorrectCountermeasure(d.threatType, d.intent);
                      return (
                        <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ fontSize: '9px', fontWeight: 700, color: '#4b5563', letterSpacing: '0.08em', width: '52px', flexShrink: 0 }}>YOU</span>
                            <span style={{ fontSize: '11px', color: '#f87171' }}>
                              {d.classifiedAs.toUpperCase()} / {d.classifiedIntent.toUpperCase()} → {d.countermeasure.replace(/-/g, ' ').toUpperCase()}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ fontSize: '9px', fontWeight: 700, color: '#22c55e', letterSpacing: '0.08em', width: '52px', flexShrink: 0 }}>EXPERT</span>
                            <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 600 }}>
                              {d.threatType.toUpperCase()} / {d.intent.toUpperCase()} → {optimalCm.replace(/-/g, ' ').toUpperCase()}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                    {fratricide && (
                      <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#ef4444', fontWeight: 700 }}>
                        ⚠ FRATRICIDE: hostile engagement of {d.intent} asset
                      </p>
                    )}
                    {d.batteryName && (
                      <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', fontSize: '9px', color: '#94a3b8', fontFamily: 'monospace', background: 'rgba(255,255,255,0.03)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <span style={{ color: '#38bdf8', fontWeight: 700 }}>🎯 BATTERY:</span>
                        <span>{d.batteryName} [{d.batteryLat?.toFixed(4)}°N, {d.batteryLng?.toFixed(4)}°E]</span>
                        <span style={{ color: '#64748b' }}>➔</span>
                        <span style={{ color: '#4ade80' }}>INTERCEPT: [{d.interceptLat?.toFixed(4)}°N, {d.interceptLng?.toFixed(4)}°E]</span>
                        <span style={{ color: '#f59e0b', fontWeight: 700 }}>({d.slantRangeKm} km)</span>
                      </div>
                    )}
                    <ScoringBreakdown d={d} />
                    {/* BDA proof badge */}
                    {(() => {
                      const bda = BDA_OUTCOMES[d.countermeasure];
                      return bda ? (
                        <div style={{ marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 8px', borderRadius: '4px', backgroundColor: `${bda.color}18`, border: `1px solid ${bda.color}44` }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: bda.color, display: 'inline-block' }} />
                          <span style={{ fontSize: '9px', fontWeight: 700, color: bda.color, fontFamily: 'monospace', letterSpacing: '0.06em' }}>BDA: {bda.label}</span>
                        </div>
                      ) : null;
                    })()}
                    {/* Doctrine citation */}
                    {(() => {
                      const doc = getDoctrine(d.threatType, d.intent);
                      return (
                        <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <p style={{ margin: 0, fontSize: '10px', color: '#6b7280', lineHeight: '1.4' }}>
                            <span style={{ fontWeight: 700, color: d.correct ? '#22c55e' : '#f87171' }}>
                              {d.correct ? 'DOCTRINE ✓' : 'CORRECT DOCTRINE:'}
                            </span>
                            {' '}{doc.why}
                          </p>
                          <p style={{ margin: '2px 0 0', fontSize: '9px', color: '#374151', fontFamily: 'monospace' }}>
                            {doc.reference}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#f59e0b' }}>{scoreDecision(d)}pts</p>
                    <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#6b7280' }}>{(d.responseTimeMs / 1000).toFixed(1)}s</p>
                    {d.followedAI !== undefined && (
                      <p style={{ margin: '2px 0 0', fontSize: '9px', color: d.followedAI ? '#818cf8' : '#f87171' }}>{d.followedAI ? 'AI ✓' : 'AI ✗'}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Session history */}
        {history.length > 1 && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '20px 24px' }}>
            <p style={{ margin: '0 0 14px', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>SESSION HISTORY</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[...history].reverse().slice(0, 8).map((s, i) => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>#{history.length - i} &nbsp;&middot;&nbsp; Level {s.level ?? '?'}</span>
                  <span style={{ fontSize: '11px', color: '#4b5563' }}>{s.baseHealth != null ? `Base ${s.baseHealth}%` : ''}</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b' }}>{s.score} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="no-print" style={{ display: 'flex', gap: '10px', paddingBottom: '32px' }}>
          <button
            onClick={() => {
              const nextLevel = Math.min((session.level ?? 1) + 1, 125);
              const nextTier = Math.floor((nextLevel - 1) / 25);
              if (isTierUnlocked(nextTier)) {
                sessionStorage.setItem('level', String(nextLevel));
                router.push('/simulation');
              } else {
                router.push('/');
              }
            }}
            style={{ flex: 1, backgroundColor: '#f59e0b', color: '#050811', fontWeight: 900, padding: '14px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '13px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}
          >
            NEXT SORTIE (LVL {Math.min((session.level ?? 1) + 1, 125)}) &rarr;
          </button>
          <button
            onClick={() => { sessionStorage.setItem('level', String(session.level ?? 1)); router.push('/simulation'); }}
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#cbd5e1', fontWeight: 800, padding: '14px 20px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', fontSize: '12px', fontFamily: 'monospace', textTransform: 'uppercase' }}
          >
            REPLAY
          </button>
          <button
            onClick={() => router.push('/')}
            style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: '#94a3b8', fontWeight: 800, padding: '14px 18px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', fontSize: '12px', fontFamily: 'monospace', textTransform: 'uppercase' }}
          >
            BRIEFING
          </button>
          <button
            onClick={() => setShowSitrep(true)}
            style={{
              backgroundColor: 'rgba(245,158,11,0.16)', color: '#fbbf24',
              fontWeight: 900, padding: '14px 20px', borderRadius: '4px',
              border: '1.5px solid rgba(245,158,11,0.6)', cursor: 'pointer',
              fontSize: '12.5px', letterSpacing: '0.06em', fontFamily: 'monospace',
              display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: '0 0 16px rgba(245,158,11,0.25)', textTransform: 'uppercase',
            }}
          >
            📑 OFFICIAL SITREP (IAF FORM 114)
          </button>
          <button
            onClick={() => setShowTrainingRecord(true)}
            style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: '#94a3b8', fontWeight: 800, padding: '14px 18px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', fontSize: '12px', fontFamily: 'monospace', textTransform: 'uppercase' }}
          >
            📋 RECORD
          </button>
        </div>
      </div>

      {/* Military SITREP Modal */}
      {showSitrep && session && (
        <MilitarySitrepModal
          session={session}
          profile={profile}
          onClose={() => setShowSitrep(false)}
        />
      )}

      {/* Tier completion certificate */}
      {showCert && session && (() => {
        const lvl = session.level ?? 1;
        const tier = Math.min(4, Math.floor((lvl - 1) / 25));
        const TIER_NAMES = ['RECRUIT', 'CADET', 'OPERATOR', 'SPECIALIST', 'COMMANDER'];
        const TIER_SECTORS = [
          'Punjab Sector (IB)',
          'J&K — Line of Control',
          'Ladakh — Line of Actual Control',
          'Rajasthan / Arabian Sea',
          'NCR Multi-Vector',
        ];
        return (
          <CertificateOverlay
            operatorName={profile.rank ? `${profile.rank} ${profile.name}` : (profile.name || operatorName)}
            tierNumber={tier}
            tierName={TIER_NAMES[tier]}
            sectorName={TIER_SECTORS[tier]}
            missionsCompleted={history.length}
            date={new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
            onClose={() => setShowCert(false)}
          />
        );
      })()}

      {/* Formal MoD Training Record */}
      {showTrainingRecord && session && (
        <TrainingRecordOverlay
          profile={profile}
          sessions={history}
          onClose={() => setShowTrainingRecord(false)}
        />
      )}
    </div>
  );
}
