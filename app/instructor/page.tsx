'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Session } from '@/types';
import type { ThreatType, Weather } from '@/types';
import { getSessions, clearSessions, getProfile, getProfiles, type TraineeProfile } from '@/lib/storage';
import { getCustomScenarios, saveCustomScenario, deleteCustomScenario, type CustomScenario } from '@/lib/customScenarios';
import { getMissionGrade } from '@/lib/scoring';
import SkillPassport from '@/components/SkillPassport';

// SVG performance trend chart (last 10 sessions)
function TrendChart({ sessions }: { sessions: Session[] }) {
  if (sessions.length < 2) return <p style={{ color: '#374151', fontSize: '12px' }}>Need 2+ sessions for trend.</p>;
  const data = sessions.slice(-10);
  const maxS = Math.max(...data.map(s => s.score), 1);
  const W = 500, H = 80, PAD = 16;
  const cx = (i: number) => PAD + (i / (data.length - 1)) * (W - PAD * 2);
  const cy = (s: number) => H - PAD - (s / maxS) * (H - PAD * 2);
  const pts = data.map((s, i) => `${cx(i)},${cy(s.score)}`).join(' ');
  return (
    <div>
      <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>SCORE TREND — last {data.length} sessions</p>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map(f => (
          <line key={f} x1={PAD} y1={cy(maxS * f)} x2={W - PAD} y2={cy(maxS * f)}
            stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        ))}
        {/* Area fill */}
        <polygon
          points={`${cx(0)},${H - PAD} ${pts} ${cx(data.length - 1)},${H - PAD}`}
          fill="rgba(245,158,11,0.08)" />
        {/* Line */}
        <polyline points={pts} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinejoin="round" />
        {/* Dots */}
        {data.map((s, i) => (
          <circle key={i} cx={cx(i)} cy={cy(s.score)} r={3} fill="#f59e0b" />
        ))}
      </svg>
    </div>
  );
}

function SectorDistChart({ sessions }: { sessions: Session[] }) {
  const SECTORS = [
    { label: 'Punjab (1–25)',     lo: 1,   hi: 25,  color: '#22c55e' },
    { label: 'J&K (26–50)',      lo: 26,  hi: 50,  color: '#3b82f6' },
    { label: 'Ladakh (51–75)',   lo: 51,  hi: 75,  color: '#f59e0b' },
    { label: 'Coast (76–100)',   lo: 76,  hi: 100, color: '#f97316' },
    { label: 'NCR (101–125)',    lo: 101, hi: 125, color: '#ef4444' },
  ];
  const counts = SECTORS.map(s => ({
    ...s,
    count: sessions.filter(sess => {
      const lvl = sess.level ?? 1;
      return lvl >= s.lo && lvl <= s.hi;
    }).length,
  }));
  const maxCount = Math.max(...counts.map(c => c.count), 1);
  return (
    <div>
      <p style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>SORTIES BY SECTOR</p>
      {counts.map(s => (
        <div key={s.label} style={{ marginBottom: '9px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
            <span style={{ fontSize: '11px', color: '#9ca3af' }}>{s.label}</span>
            <span style={{ fontSize: '11px', color: s.color, fontWeight: 700 }}>{s.count}</span>
          </div>
          <div style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${(s.count / maxCount) * 100}%`, height: '100%', backgroundColor: s.color, borderRadius: '2px', transition: 'width 0.8s ease' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function avgScore(sessions: Session[]) {
  if (!sessions.length) return 0;
  return Math.round(sessions.reduce((a, s) => a + s.score, 0) / sessions.length);
}

function accuracy(sessions: Session[]) {
  const decisions = sessions.flatMap(s => s.decisions);
  if (!decisions.length) return 0;
  return Math.round((decisions.filter(d => d.correct).length / decisions.length) * 100);
}

function aiAlignment(sessions: Session[]) {
  const withAI = sessions.flatMap(s => s.decisions).filter(d => d.followedAI !== undefined);
  if (!withAI.length) return null;
  return Math.round((withAI.filter(d => d.followedAI).length / withAI.length) * 100);
}

function avgResponseMs(sessions: Session[]) {
  const decisions = sessions.flatMap(s => s.decisions);
  if (!decisions.length) return 0;
  return Math.round(decisions.reduce((a, d) => a + d.responseTimeMs, 0) / decisions.length);
}

function levelRange(sessions: Session[]) {
  if (!sessions.length) return '—';
  const levels = sessions.map(s => s.level ?? 1);
  const min = Math.min(...levels), max = Math.max(...levels);
  return min === max ? `${min}` : `${min}–${max}`;
}

function threatBreakdown(sessions: Session[]) {
  const decisions = sessions.flatMap(s => s.decisions);
  const byType = (t: string) => {
    const ds = decisions.filter(d => d.threatType === t);
    return { total: ds.length, correct: ds.filter(d => d.correct).length };
  };
  return {
    commercial: byType('commercial'),
    military: byType('military'),
    swarm: byType('swarm'),
  };
}

export default function InstructorPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [operatorName, setOperatorName] = useState('');
  const [profile, setProfile] = useState<TraineeProfile>({ name: '', rank: '', serviceNo: '', unit: '', base: '' });
  const [filterOperator, setFilterOperator] = useState<string>('all');
  const [allProfiles, setAllProfiles] = useState<ReturnType<typeof getProfiles>>([]);
  const [customScenarios, setCustomScenarios] = useState<CustomScenario[]>([]);
  const [showDrillBuilder, setShowDrillBuilder] = useState(false);
  const [drill, setDrill] = useState<{
    name: string; description: string;
    baseLevel: 1|26|51|76|101;
    timeLimit: number; threatQuota: number;
    types: ThreatType[];
    nightMode: boolean; decoys: boolean;
    weather: Weather; sensorDegradation: boolean;
  }>({
    name: '', description: '',
    baseLevel: 1, timeLimit: 120, threatQuota: 5,
    types: ['commercial', 'military'],
    nightMode: false, decoys: false,
    weather: 'clear', sensorDegradation: false,
  });

  useEffect(() => {
    const s = getSessions();
    setSessions(s);
    const name = localStorage.getItem('droneshield-operator');
    if (name) setOperatorName(name);
    setProfile(getProfile());
    setAllProfiles(getProfiles());
    setCustomScenarios(getCustomScenarios());
  }, []);

  const filteredSessions = filterOperator === 'all'
    ? sessions
    : sessions.filter(s => (s.profileId ?? s.operatorName ?? 'anonymous') === filterOperator);

  const recent = [...filteredSessions].reverse().slice(0, 10);
  const breakdown = threatBreakdown(filteredSessions);
  const align = aiAlignment(filteredSessions);
  const totalEngagements = filteredSessions.reduce((a, s) => a + s.decisions.length, 0);
  const totalScore = filteredSessions.reduce((a, s) => a + s.score, 0);
  const bestScore = filteredSessions.length ? Math.max(...filteredSessions.map(s => s.score)) : 0;
  const activeSince = filteredSessions.length
    ? new Date(Math.min(...filteredSessions.map(s => s.startedAt))).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  const statCard = (label: string, value: string, sub?: string, color = '#fff') => (
    <div style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '16px 20px' }}>
      <p style={{ margin: 0, fontSize: '9px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>{label}</p>
      <p style={{ margin: '4px 0 0', fontSize: '26px', fontWeight: 900, color, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#4b5563' }}>{sub}</p>}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff', fontFamily: 'inherit' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '13px', padding: 0 }}>&#8592; Briefing</button>
          <span style={{ color: '#374151' }}>|</span>
          <div>
            <p style={{ margin: 0, fontSize: '10px', color: '#f59e0b', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>INSTRUCTOR VIEW</p>
            <p style={{ margin: 0, fontSize: '18px', fontWeight: 900, letterSpacing: '-0.02em' }}>Training Dashboard</p>
          </div>
        </div>
        {sessions.length > 0 && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                const rows = [
                  'SessionID,Date,Operator,Unit,Level,Score,AccuracyPct,Engagements,Breaches,Fratricides',
                  ...sessions.map(s => {
                    const dec = s.decisions;
                    const acc = dec.length ? Math.round((dec.filter(d => d.correct).length / dec.length) * 100) : 0;
                    const fratr = dec.filter(d => d.intent !== 'hostile' && d.classifiedIntent === 'hostile').length;
                    const date = new Date(s.startedAt).toISOString().slice(0, 10);
                    const op = (s.operatorName ?? '').replace(/,/g, ' ');
                    const unit = (s.unit ?? '').replace(/,/g, ' ');
                    return [s.id, date, op, unit, s.level ?? 1, s.score, acc, dec.length, s.breachCount ?? 0, fratr].join(',');
                  }),
                ].join('\n');
                const blob = new Blob([rows], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'droneshield-unit-report.csv';
                a.click(); URL.revokeObjectURL(url);
              }}
              style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
            >
              &#8595; Export CSV
            </button>
            <button
              onClick={() => { clearSessions(); setSessions([]); }}
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
            >
              Clear Data
            </button>
          </div>
        )}
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {sessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ color: '#374151', fontSize: '14px' }}>No sessions recorded yet.</p>
            <p style={{ color: '#4b5563', fontSize: '12px', marginTop: '8px' }}>Complete a simulation mission to see data here.</p>
            <button onClick={() => router.push('/')} style={{ marginTop: '24px', background: '#f59e0b', color: '#0a0a0f', border: 'none', borderRadius: '999px', padding: '12px 28px', fontWeight: 800, cursor: 'pointer' }}>
              Start Training
            </button>
          </div>
        ) : (
          <>
            {/* Trainee filter selector */}
            {allProfiles.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '10px', color: '#6b7280', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>View:</span>
                <select
                  value={filterOperator}
                  onChange={e => setFilterOperator(e.target.value)}
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#e5e7eb', fontSize: '12px', padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <option value="all" style={{ background: '#1f2937' }}>All trainees</option>
                  {allProfiles.map(p => (
                    <option key={p.id} value={p.id} style={{ background: '#1f2937' }}>
                      {p.rank ? `${p.rank} ` : ''}{p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Unit Performance Summary */}
            {filteredSessions.length > 0 && (() => {
              const perfLabel = filterOperator === 'all' ? 'UNIT PERFORMANCE — ALL TRAINEES' : 'TRAINEE PERFORMANCE SUMMARY';
              const allDecisions = filteredSessions.flatMap(s => s.decisions);
              const unitAccuracy = allDecisions.length
                ? Math.round((allDecisions.filter(d => d.correct).length / allDecisions.length) * 100)
                : 0;
              const avgResponseMs = allDecisions.length
                ? Math.round(allDecisions.reduce((s, d) => s + d.responseTimeMs, 0) / allDecisions.length)
                : 0;
              const fratricideCount = allDecisions.filter(d => d.intent !== 'hostile' && d.classifiedIntent === 'hostile').length;
              const byType: Record<string, { correct: number; total: number }> = { commercial: { correct: 0, total: 0 }, military: { correct: 0, total: 0 }, swarm: { correct: 0, total: 0 } };
              allDecisions.forEach(d => {
                if (byType[d.threatType]) {
                  byType[d.threatType].total++;
                  if (d.correct) byType[d.threatType].correct++;
                }
              });
              return (
                <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
                  <p style={{ margin: '0 0 12px', fontSize: '10px', color: '#f59e0b', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{perfLabel}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '12px' }}>
                    {[
                      { label: 'TOTAL SORTIES', value: String(filteredSessions.length), color: '#fff' },
                      { label: 'UNIT ACCURACY', value: `${unitAccuracy}%`, color: unitAccuracy >= 80 ? '#22c55e' : unitAccuracy >= 60 ? '#f59e0b' : '#ef4444' },
                      { label: 'AVG RESPONSE', value: `${(avgResponseMs / 1000).toFixed(1)}s`, color: avgResponseMs < 3000 ? '#22c55e' : avgResponseMs < 6000 ? '#f59e0b' : '#ef4444' },
                      { label: 'FRATRICIDE INCIDENTS', value: String(fratricideCount), color: fratricideCount === 0 ? '#22c55e' : '#ef4444' },
                    ].map(m => (
                      <div key={m.label} style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '10px 12px' }}>
                        <p style={{ margin: '0 0 4px', fontSize: '8px', color: '#4b5563', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>{m.label}</p>
                        <p style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: m.color }}>{m.value}</p>
                      </div>
                    ))}
                  </div>
                  {/* Per-type accuracy */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {(['commercial', 'military', 'swarm'] as const).map(type => {
                      const d = byType[type];
                      const acc = d.total ? Math.round((d.correct / d.total) * 100) : null;
                      const color = type === 'commercial' ? '#f59e0b' : type === 'military' ? '#ef4444' : '#8b5cf6';
                      return (
                        <div key={type} style={{ flex: 1, backgroundColor: `${color}11`, border: `1px solid ${color}33`, borderRadius: '8px', padding: '8px 10px' }}>
                          <p style={{ margin: '0 0 2px', fontSize: '8px', color, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{type}</p>
                          <p style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: acc === null ? '#374151' : acc >= 70 ? '#22c55e' : '#ef4444' }}>
                            {acc === null ? '—' : `${acc}%`}
                          </p>
                          <p style={{ margin: 0, fontSize: '9px', color: '#4b5563' }}>{d.total} engagements</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* UNIT PERSONNEL ROSTER */}
            {allProfiles.length > 0 && (() => {
              // Group sessions by profileId (fall back to operatorName)
              const rosterMap: Record<string, { name: string; unit: string; sorties: Session[] }> = {};
              // Seed with all known profiles (including 0-sortie)
              for (const p of allProfiles) {
                rosterMap[p.id] = { name: `${p.rank ? p.rank + ' ' : ''}${p.name}`, unit: p.unit || '—', sorties: [] };
              }
              for (const s of sessions) {
                const key = s.profileId ?? s.operatorName ?? 'anonymous';
                if (!rosterMap[key]) rosterMap[key] = { name: s.operatorName ?? key, unit: s.unit ?? '—', sorties: [] };
                rosterMap[key].sorties.push(s);
              }
              const roster = Object.values(rosterMap).sort((a, b) => b.sorties.length - a.sorties.length);
              return (
                <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
                  <p style={{ margin: '0 0 12px', fontSize: '10px', color: '#f59e0b', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>UNIT PERSONNEL ROSTER</p>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                          {['OPERATOR', 'UNIT', 'SORTIES', 'ACCURACY', 'FRATRICIDES', 'READINESS'].map(h => (
                            <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: '9px', color: '#4b5563', fontWeight: 700, letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {roster.map((op, i) => {
                          const decisions = op.sorties.flatMap(s => s.decisions);
                          const acc = decisions.length ? Math.round((decisions.filter(d => d.correct).length / decisions.length) * 100) : 0;
                          const fratr = decisions.filter(d => d.intent !== 'hostile' && d.classifiedIntent === 'hostile').length;
                          const ready = acc >= 75;
                          return (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <td style={{ padding: '8px 10px', color: '#e5e7eb', fontWeight: 600 }}>{op.name || '—'}</td>
                              <td style={{ padding: '8px 10px', color: '#9ca3af' }}>{op.unit}</td>
                              <td style={{ padding: '8px 10px', color: '#f59e0b', fontWeight: 700, fontFamily: 'monospace' }}>{op.sorties.length}</td>
                              <td style={{ padding: '8px 10px', color: acc >= 75 ? '#22c55e' : acc >= 60 ? '#f59e0b' : '#ef4444', fontWeight: 700 }}>{acc}%</td>
                              <td style={{ padding: '8px 10px', color: fratr === 0 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>{fratr}</td>
                              <td style={{ padding: '8px 10px' }}>
                                <span style={{ fontSize: '9px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', backgroundColor: ready ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)', color: ready ? '#22c55e' : '#f59e0b', letterSpacing: '0.06em' }}>
                                  {ready ? 'READY' : 'IN TRAINING'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* Unit / Operator Record (PS26247: unit performance tracking) */}
            {(() => {
              const selectedProfile = filterOperator !== 'all'
                ? allProfiles.find(p => p.id === filterOperator)
                : null;
              const displayName = selectedProfile
                ? `${selectedProfile.rank ? selectedProfile.rank + ' ' : ''}${selectedProfile.name}`
                : (profile.rank ? `${profile.rank} ` : '') + (profile.name || operatorName) || 'All Unit Personnel';
              const displaySvc  = selectedProfile?.serviceNo || profile.serviceNo;
              const displayUnit = selectedProfile?.unit || profile.unit;
              const displayBase = selectedProfile?.base || profile.base;
              return (
            <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '20px', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <p style={{ margin: 0, fontSize: '9px', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
                  UNIT / OPERATOR RECORD &mdash; COMBAT READINESS AUDIT
                </p>
                <p style={{ margin: '4px 0 2px', fontSize: '22px', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
                  {displayName}
                </p>
                {(displayUnit || displaySvc || displayBase) && (
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>
                    {[displaySvc && `Svc: ${displaySvc}`, displayUnit && `Unit: ${displayUnit}`, displayBase].filter(Boolean).join(' · ')}
                  </p>
                )}
                {activeSince && (
                  <p style={{ margin: 0, fontSize: '11px', color: '#4b5563' }}>Active since {activeSince}</p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '24px', textAlign: 'center' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: '#f59e0b', fontVariantNumeric: 'tabular-nums' }}>{filteredSessions.length}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '9px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Missions</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: '#e5e7eb', fontVariantNumeric: 'tabular-nums' }}>{totalEngagements}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '9px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Engagements</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: '#22c55e', fontVariantNumeric: 'tabular-nums' }}>{bestScore}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '9px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Best Score</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: '#3b82f6', fontVariantNumeric: 'tabular-nums' }}>{totalScore}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '9px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Score</p>
                </div>
              </div>
            </div>
              );
            })()}

            {/* Summary stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              {statCard('Sessions', String(filteredSessions.length))}
              {statCard('Avg Score', String(avgScore(filteredSessions)), 'points per session', '#f59e0b')}
              {statCard('Accuracy', `${accuracy(filteredSessions)}%`, 'correct classifications', accuracy(filteredSessions) >= 70 ? '#22c55e' : '#ef4444')}
              {statCard('Avg Response', `${(avgResponseMs(filteredSessions) / 1000).toFixed(1)}s`, 'detect to deploy')}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {statCard('Mission Levels', levelRange(filteredSessions), `across ${filteredSessions.length} sorties`)}
              {align !== null
                ? statCard('AI Alignment', `${align}%`, 'trainee agreed with AI assessment', align >= 70 ? '#818cf8' : '#f59e0b')
                : statCard('AI Alignment', '—', 'No AI data recorded')
              }
            </div>

            {/* Threat type breakdown */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '20px 24px' }}>
              <p style={{ margin: '0 0 16px', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>THREAT TYPE ACCURACY</p>
              {([
                { key: 'commercial', label: 'Commercial', color: '#f59e0b', data: breakdown.commercial },
                { key: 'military',   label: 'Military UCAV', color: '#ef4444', data: breakdown.military },
                { key: 'swarm',      label: 'Swarm',       color: '#8b5cf6', data: breakdown.swarm },
              ] as const).map(({ key, label, color, data }) => {
                const pct = data.total ? Math.round((data.correct / data.total) * 100) : 0;
                return (
                  <div key={key} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontSize: '12px', color: '#e5e7eb', fontWeight: 600 }}>{label}</span>
                      <span style={{ fontSize: '12px', color, fontWeight: 700 }}>
                        {data.total ? `${pct}%` : '—'} {data.total ? <span style={{ color: '#4b5563', fontWeight: 400, fontSize: '10px' }}>({data.correct}/{data.total})</span> : null}
                      </span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: '4px' }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Score trend chart */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '20px 24px' }}>
              <TrendChart sessions={filteredSessions} />
            </div>

            {/* Sector distribution */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '20px 24px' }}>
              <SectorDistChart sessions={filteredSessions} />
            </div>

            {/* Session log */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '20px 24px' }}>
              <p style={{ margin: '0 0 14px', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>RECENT SORTIES</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {recent.map((s, i) => {
                  const dec = s.decisions;
                  const acc = dec.length ? Math.round((dec.filter(d => d.correct).length / dec.length) * 100) : 0;
                  const date = new Date(s.endedAt).toLocaleString();
                  return (
                    <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 60px 60px 80px', alignItems: 'center', gap: '12px', padding: '9px 12px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                      <span style={{ fontSize: '11px', color: '#4b5563', fontFamily: 'monospace' }}>#{filteredSessions.length - i}</span>
                      <div>
                        <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af' }}>Lvl {s.level ?? '?'} &middot; {dec.length} engagements</p>
                        <p style={{ margin: 0, fontSize: '10px', color: '#374151' }}>{date}</p>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b', textAlign: 'right' }}>{s.score}pts</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: acc >= 70 ? '#22c55e' : '#ef4444', textAlign: 'right' }}>{acc}%</span>
                      <span style={{ fontSize: '10px', color: '#4b5563', textAlign: 'right' }}>
                        {((s.endedAt - s.startedAt) / 1000 / 60).toFixed(1)}min
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Audit Log */}
            {filteredSessions.length > 0 && (() => {
              const recentDecisions = [...filteredSessions].reverse()
                .flatMap(s => s.decisions.map(d => ({ ...d, sessionLevel: s.level ?? 1, sessionDate: s.startedAt })))
                .slice(0, 20);
              if (!recentDecisions.length) return null;
              return (
                <div style={{ marginTop: '32px' }}>
                  <p style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>RECENT ACTIVITY — Last 20 Engagements</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {recentDecisions.map((d, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '6px', borderLeft: `2px solid ${d.correct ? '#22c55e' : '#ef4444'}` }}>
                        <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#374151', flexShrink: 0 }}>LVL {String(d.sessionLevel).padStart(3, '0')}</span>
                        <span style={{ fontSize: '10px', color: d.correct ? '#22c55e' : '#ef4444', fontWeight: 700, flexShrink: 0 }}>{d.correct ? '✓' : '✗'}</span>
                        <span style={{ fontSize: '10px', color: '#9ca3af' }}>{d.classifiedAs.toUpperCase()} / {d.classifiedIntent.toUpperCase()}</span>
                        <span style={{ fontSize: '9px', color: '#4b5563' }}>→ {d.countermeasure.replace(/-/g, ' ').toUpperCase()}</span>
                        <span style={{ fontSize: '9px', color: '#374151', marginLeft: 'auto', flexShrink: 0 }}>{Math.round(d.responseTimeMs / 1000)}s</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Skill Passport */}
            <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px' }}>
              <SkillPassport sessions={filteredSessions} />
            </div>

            {/* Training History */}
            {filteredSessions.length > 0 && (
              <div style={{ marginTop: '32px' }}>
                <p style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>TRAINING HISTORY — All Sorties</p>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        {['#', 'Level', 'Date', 'Score', 'Accuracy', 'Grade', 'Engagements', 'Breaches'].map(h => (
                          <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: '#4b5563', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...filteredSessions].reverse().map((s, i) => {
                        const acc = s.decisions.length ? Math.round((s.decisions.filter(d => d.correct).length / s.decisions.length) * 100) : 0;
                        const { grade } = getMissionGrade(s.decisions, s.breachCount ?? 0);
                        const gradeColor: Record<string, string> = { S: '#f59e0b', A: '#22c55e', B: '#3b82f6', C: '#6b7280', D: '#f97316', F: '#ef4444' };
                        const date = new Date(s.startedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '7px 10px', color: '#374151', fontFamily: 'monospace' }}>{filteredSessions.length - i}</td>
                            <td style={{ padding: '7px 10px', color: '#9ca3af', fontFamily: 'monospace' }}>{String(s.level ?? 1).padStart(3, '0')}</td>
                            <td style={{ padding: '7px 10px', color: '#6b7280', whiteSpace: 'nowrap' }}>{date}</td>
                            <td style={{ padding: '7px 10px', color: '#fff', fontWeight: 700 }}>{s.score}</td>
                            <td style={{ padding: '7px 10px', color: acc >= 70 ? '#22c55e' : acc >= 50 ? '#f59e0b' : '#ef4444', fontWeight: 700 }}>{acc}%</td>
                            <td style={{ padding: '7px 10px', fontWeight: 900, color: gradeColor[grade] ?? '#fff' }}>{grade}</td>
                            <td style={{ padding: '7px 10px', color: '#6b7280' }}>{s.decisions.length}</td>
                            <td style={{ padding: '7px 10px', color: (s.breachCount ?? 0) > 0 ? '#ef4444' : '#22c55e', fontWeight: 700 }}>{s.breachCount ?? 0}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {/* ── Custom Drills ─────────────────────────────────────────── */}
            <div style={{ marginTop: '40px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  CUSTOM DRILLS — {customScenarios.length} saved
                </p>
                <button
                  onClick={() => setShowDrillBuilder(v => !v)}
                  style={{
                    background: showDrillBuilder ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${showDrillBuilder ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.1)'}`,
                    color: showDrillBuilder ? '#a78bfa' : '#6b7280',
                    borderRadius: '8px', padding: '5px 12px', cursor: 'pointer',
                    fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em',
                  }}
                >
                  {showDrillBuilder ? '✕ Cancel' : '+ New Drill'}
                </button>
              </div>

              {/* Builder form */}
              {showDrillBuilder && (
                <div style={{
                  backgroundColor: 'rgba(139,92,246,0.05)',
                  border: '1px solid rgba(139,92,246,0.2)',
                  borderRadius: '16px', padding: '20px', marginBottom: '20px',
                }}>
                  <p style={{ margin: '0 0 14px', fontSize: '10px', fontWeight: 800, color: '#a78bfa', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    DRILL CONFIGURATION
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {/* Name */}
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'block', fontSize: '9px', color: '#6b7280', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Drill Name *</label>
                      <input
                        type="text" value={drill.name} maxLength={60}
                        onChange={e => setDrill(d => ({ ...d, name: e.target.value }))}
                        placeholder="e.g., SCRAMBLE — Pathankot Night Swarm"
                        style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 10px', color: '#fff', fontSize: '12px', fontFamily: 'inherit', boxSizing: 'border-box' }}
                      />
                    </div>
                    {/* Description */}
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'block', fontSize: '9px', color: '#6b7280', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Briefing / Description</label>
                      <textarea
                        value={drill.description} rows={2} maxLength={200}
                        onChange={e => setDrill(d => ({ ...d, description: e.target.value }))}
                        placeholder="Optional: describe the scenario context…"
                        style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 10px', color: '#e5e7eb', fontSize: '11px', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                      />
                    </div>
                    {/* Sector */}
                    <div>
                      <label style={{ display: 'block', fontSize: '9px', color: '#6b7280', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Sector / Target</label>
                      <select
                        value={drill.baseLevel}
                        onChange={e => setDrill(d => ({ ...d, baseLevel: Number(e.target.value) as 1|26|51|76|101 }))}
                        style={{ width: '100%', background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 10px', color: '#fff', fontSize: '11px', fontFamily: 'inherit' }}
                      >
                        <option value={1}>Punjab — Pathankot AFB (L1)</option>
                        <option value={26}>J&K — Jammu AFS / LoC (L26)</option>
                        <option value={51}>Ladakh — Leh AFS / LAC (L51)</option>
                        <option value={76}>Coast/West — INS Dwarka / Jaisalmer (L76)</option>
                        <option value={101}>NCR — Delhi Capital Defense (L101)</option>
                      </select>
                    </div>
                    {/* Weather */}
                    <div>
                      <label style={{ display: 'block', fontSize: '9px', color: '#6b7280', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Weather</label>
                      <select
                        value={drill.weather}
                        onChange={e => setDrill(d => ({ ...d, weather: e.target.value as Weather }))}
                        style={{ width: '100%', background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 10px', color: '#fff', fontSize: '11px', fontFamily: 'inherit' }}
                      >
                        <option value="clear">Clear</option>
                        <option value="foggy">Foggy</option>
                        <option value="rainy">Rainy</option>
                        <option value="dust-storm">Dust Storm</option>
                      </select>
                    </div>
                    {/* Time limit */}
                    <div>
                      <label style={{ display: 'block', fontSize: '9px', color: '#6b7280', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Time Limit</label>
                      <select
                        value={drill.timeLimit}
                        onChange={e => setDrill(d => ({ ...d, timeLimit: Number(e.target.value) }))}
                        style={{ width: '100%', background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 10px', color: '#fff', fontSize: '11px', fontFamily: 'inherit' }}
                      >
                        {[60, 90, 120, 150, 180, 240, 300].map(t => (
                          <option key={t} value={t}>{t}s ({Math.floor(t/60)}:{String(t%60).padStart(2,'0')})</option>
                        ))}
                      </select>
                    </div>
                    {/* Quota */}
                    <div>
                      <label style={{ display: 'block', fontSize: '9px', color: '#6b7280', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Threat Quota</label>
                      <select
                        value={drill.threatQuota}
                        onChange={e => setDrill(d => ({ ...d, threatQuota: Number(e.target.value) }))}
                        style={{ width: '100%', background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 10px', color: '#fff', fontSize: '11px', fontFamily: 'inherit' }}
                      >
                        {[3,4,5,6,7,8,10,12,15,20].map(q => <option key={q} value={q}>{q} threats</option>)}
                      </select>
                    </div>
                    {/* Threat types */}
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'block', fontSize: '9px', color: '#6b7280', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Threat Types</label>
                      <div style={{ display: 'flex', gap: '16px' }}>
                        {(['commercial', 'military', 'swarm'] as ThreatType[]).map(type => (
                          <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '11px', color: '#9ca3af' }}>
                            <input
                              type="checkbox"
                              checked={drill.types.includes(type)}
                              onChange={e => setDrill(d => ({
                                ...d,
                                types: e.target.checked
                                  ? [...d.types, type]
                                  : d.types.filter(t => t !== type).length ? d.types.filter(t => t !== type) : d.types,
                              }))}
                              style={{ accentColor: '#a78bfa' }}
                            />
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </label>
                        ))}
                      </div>
                    </div>
                    {/* Toggles */}
                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                      {([
                        { key: 'nightMode',         label: 'Night Mode' },
                        { key: 'decoys',             label: 'Decoys Active' },
                        { key: 'sensorDegradation',  label: 'Sensor Degradation' },
                      ] as const).map(({ key, label }) => (
                        <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '11px', color: '#9ca3af' }}>
                          <input
                            type="checkbox"
                            checked={drill[key]}
                            onChange={e => setDrill(d => ({ ...d, [key]: e.target.checked }))}
                            style={{ accentColor: '#a78bfa' }}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      disabled={!drill.name.trim()}
                      onClick={() => {
                        if (!drill.name.trim()) return;
                        const scenario: CustomScenario = {
                          id: Math.random().toString(36).slice(2),
                          name: drill.name.trim(),
                          description: drill.description.trim(),
                          createdAt: Date.now(),
                          baseLevel: drill.baseLevel,
                          timeLimit: drill.timeLimit,
                          threatQuota: drill.threatQuota,
                          types: drill.types.length ? drill.types : ['commercial', 'military'],
                          nightMode: drill.nightMode,
                          decoys: drill.decoys,
                          weather: drill.weather,
                          sensorDegradation: drill.sensorDegradation,
                        };
                        saveCustomScenario(scenario);
                        setCustomScenarios(getCustomScenarios());
                        setDrill(d => ({ ...d, name: '', description: '' }));
                        setShowDrillBuilder(false);
                      }}
                      style={{
                        background: drill.name.trim() ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${drill.name.trim() ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.08)'}`,
                        color: drill.name.trim() ? '#a78bfa' : '#374151',
                        borderRadius: '8px', padding: '8px 20px', cursor: drill.name.trim() ? 'pointer' : 'not-allowed',
                        fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em',
                      }}
                    >
                      SAVE DRILL
                    </button>
                  </div>
                </div>
              )}

              {/* Saved scenarios list */}
              {customScenarios.length === 0 && !showDrillBuilder && (
                <p style={{ fontSize: '12px', color: '#374151', textAlign: 'center', padding: '24px 0' }}>
                  No custom drills saved. Click &ldquo;+ New Drill&rdquo; to create one.
                </p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {customScenarios.map(s => {
                  const SECTOR_LABELS: Record<number, string> = {
                    1: 'Punjab', 26: 'J&K', 51: 'Ladakh', 76: 'Coast', 101: 'NCR',
                  };
                  return (
                    <div key={s.id} style={{
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(139,92,246,0.15)',
                      borderRadius: '12px', padding: '12px 16px',
                      display: 'flex', alignItems: 'center', gap: '12px',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 700, color: '#e5e7eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.name}
                        </p>
                        <p style={{ margin: 0, fontSize: '10px', color: '#6b7280' }}>
                          {SECTOR_LABELS[s.baseLevel] ?? 'Unknown'} &middot; {s.timeLimit}s &middot; {s.threatQuota} threats &middot; {s.weather} &middot; {s.types.join('+')}
                          {s.nightMode ? ' &middot; night' : ''}
                          {s.decoys ? ' &middot; decoys' : ''}
                          {s.sensorDegradation ? ' &middot; sensor-deg' : ''}
                        </p>
                        {s.description && <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.description}</p>}
                      </div>
                      <button
                        onClick={() => {
                          sessionStorage.setItem('level', String(s.baseLevel));
                          sessionStorage.setItem('custom-scenario', JSON.stringify({
                            timeLimit: s.timeLimit,
                            threatQuota: s.threatQuota,
                            types: s.types,
                            nightMode: s.nightMode,
                            decoys: s.decoys,
                            weather: s.weather,
                            sensorDegradation: s.sensorDegradation,
                            degradedFields: s.sensorDegradation ? ['rf', 'frequency', 'power'] : [],
                            name: s.name,
                            scenario: s.description || s.name,
                          }));
                          router.push('/simulation');
                        }}
                        style={{
                          background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)',
                          color: '#a78bfa', borderRadius: '8px', padding: '6px 14px',
                          cursor: 'pointer', fontSize: '11px', fontWeight: 700, flexShrink: 0,
                        }}
                      >
                        &#9654; Launch
                      </button>
                      <button
                        onClick={() => {
                          deleteCustomScenario(s.id);
                          setCustomScenarios(getCustomScenarios());
                        }}
                        style={{
                          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                          color: '#f87171', borderRadius: '8px', padding: '6px 10px',
                          cursor: 'pointer', fontSize: '11px', fontWeight: 700, flexShrink: 0,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
