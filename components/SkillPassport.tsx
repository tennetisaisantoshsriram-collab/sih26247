'use client';
import { useMemo } from 'react';
import { Session, Decision } from '@/types';
import { getCorrectCountermeasure } from '@/lib/scenario';

interface Props { sessions: Session[] }

const AXES = [
  'Detection\nSpeed',
  'Classification\nAccuracy',
  'Engagement\nDecision',
  'Response\nTime',
  'Fratricide\nAvoidance',
] as const;

const N = 5;
const CX = 110, CY = 110, R = 80;

function angleOf(i: number) {
  return (Math.PI * 2 * i) / N - Math.PI / 2;
}
function point(ratio: number, i: number) {
  const a = angleOf(i);
  return { x: CX + R * ratio * Math.cos(a), y: CY + R * ratio * Math.sin(a) };
}

export default function SkillPassport({ sessions }: Props) {
  const scores = useMemo(() => {
    const decisions: Decision[] = sessions.flatMap(s => s.decisions);
    if (decisions.length === 0) return [0, 0, 0, 0, 100];

    const avgDetMs = decisions.reduce((s, d) => s + (d.detectionTimeMs ?? 15000), 0) / decisions.length;
    const avgRespMs = decisions.reduce((s, d) => s + d.responseTimeMs, 0) / decisions.length;
    const classAccurate = decisions.filter(d => d.classifiedAs === d.threatType && d.classifiedIntent === d.intent).length;
    const engCorrect = decisions.filter(d => d.countermeasure === getCorrectCountermeasure(d.threatType, d.intent)).length;
    const fratricideCount = decisions.filter(d => d.intent !== 'hostile' && d.classifiedIntent === 'hostile').length;

    return [
      Math.round(Math.max(0, Math.min(100, (1 - avgDetMs / 15000) * 100))),         // Detection Speed
      Math.round((classAccurate / decisions.length) * 100),                          // Classification Accuracy
      Math.round((engCorrect / decisions.length) * 100),                             // Engagement Decision
      Math.round(Math.max(0, Math.min(100, (1 - avgRespMs / 10000) * 100))),         // Response Time
      Math.round(Math.max(0, 100 - (fratricideCount / decisions.length) * 100)),     // Fratricide Avoidance
    ];
  }, [sessions]);

  // Build polygon points string from scores
  const polyPoints = scores.map((s, i) => {
    const p = point(s / 100, i);
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(' ');

  // Axis label positions (slightly outside R)
  const labelPositions = AXES.map((label, i) => {
    const a = angleOf(i);
    const r = R + 22;
    return {
      x: CX + r * Math.cos(a),
      y: CY + r * Math.sin(a),
      lines: label.split('\n'),
    };
  });

  // Ring lines at 25%, 50%, 75%, 100%
  const rings = [0.25, 0.5, 0.75, 1.0].map(ratio => {
    return Array.from({ length: N }, (_, i) => point(ratio, i))
      .map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  });

  // Axis lines from center to edge
  const axisLines = Array.from({ length: N }, (_, i) => {
    const p = point(1, i);
    return { x2: p.x, y2: p.y };
  });

  if (sessions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0', color: '#374151', fontSize: '12px' }}>
        No sessions recorded — complete a mission to populate the Skill Passport.
      </div>
    );
  }

  return (
    <div>
      <p style={{ margin: '0 0 10px', fontSize: '10px', color: '#f59e0b', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        SKILL PASSPORT — COMPETENCY RADAR
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
        <svg width={220} height={220} viewBox="0 0 220 220">
          {/* Rings */}
          {rings.map((pts, ri) => (
            <polygon key={ri} points={pts} fill="none"
              stroke={ri === 3 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}
              strokeWidth={ri === 3 ? 1.5 : 1} />
          ))}
          {/* Axis lines */}
          {axisLines.map((l, i) => (
            <line key={i} x1={CX} y1={CY} x2={l.x2.toFixed(1)} y2={l.y2.toFixed(1)}
              stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          ))}
          {/* Score polygon */}
          <polygon points={polyPoints}
            fill="rgba(245,158,11,0.15)"
            stroke="#f59e0b"
            strokeWidth="2"
            strokeLinejoin="round" />
          {/* Score dots */}
          {scores.map((s, i) => {
            const p = point(s / 100, i);
            return <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={4}
              fill="#f59e0b" stroke="#0a0a0f" strokeWidth="2" />;
          })}
          {/* Axis labels */}
          {labelPositions.map((lp, i) => (
            <text key={i} x={lp.x.toFixed(1)} y={lp.y.toFixed(1)}
              textAnchor="middle" dominantBaseline="middle"
              fontSize="8" fill="#6b7280" fontFamily="monospace" fontWeight="700">
              {lp.lines.map((line, li) => (
                <tspan key={li} x={lp.x.toFixed(1)} dy={li === 0 ? 0 : 10}>{line}</tspan>
              ))}
            </text>
          ))}
          {/* Ring % labels on vertical axis */}
          {[25, 50, 75, 100].map((pct, ri) => {
            const p = point(pct / 100, 0);
            return (
              <text key={ri} x={(p.x + 3).toFixed(1)} y={p.y.toFixed(1)}
                fontSize="6" fill="#374151" fontFamily="monospace"
                textAnchor="start" dominantBaseline="middle">
                {pct}
              </text>
            );
          })}
        </svg>

        {/* Score legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {AXES.map((axis, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', textAlign: 'right', fontSize: '13px', fontWeight: 800,
                color: scores[i] >= 80 ? '#22c55e' : scores[i] >= 60 ? '#f59e0b' : scores[i] >= 40 ? '#f97316' : '#ef4444' }}>
                {scores[i]}
              </div>
              <div style={{ fontSize: '9px', color: '#6b7280', fontFamily: 'monospace', letterSpacing: '0.06em' }}>
                {axis.replace('\n', ' ')}
              </div>
            </div>
          ))}
          <div style={{ marginTop: '4px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '9px', color: '#4b5563' }}>
            {sessions.length} sorties &middot; {sessions.flatMap(s => s.decisions).length} engagements
          </div>
        </div>
      </div>
    </div>
  );
}
