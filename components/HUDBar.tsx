interface Props {
  score: number;
  timeLeft: number;
  totalTime: number;
  threatsNeutralized: number;
  threatQuota: number;
  targetName: string;
  levelNum: number;
  baseHealth: number;
  streak: number;
  alertState: 'ROUTINE' | 'ALERT' | 'SCRAMBLE';
  activeThreats: number;
  priorityThreat: { type: string; threatRating: string; etaSec: number } | null;
  muted: boolean;
  onToggleMute: () => void;
  paused: boolean;
  onTogglePause: () => void;
}

const ALERT_STYLES = {
  ROUTINE:  { color: '#22c55e', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.25)' },
  ALERT:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.3)' },
  SCRAMBLE: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.4)' },
};

export default function HUDBar({ score, timeLeft, totalTime, threatsNeutralized, threatQuota, targetName, levelNum, baseHealth, streak, alertState, activeThreats, priorityThreat, muted, onToggleMute, paused, onTogglePause }: Props) {
  const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const secs = (timeLeft % 60).toString().padStart(2, '0');
  const timeColor = timeLeft < 30 ? '#ef4444' : timeLeft < 60 ? '#f59e0b' : '#ffffff';
  const timePct  = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;
  const quotaPct = threatQuota > 0 ? (threatsNeutralized / threatQuota) * 100 : 0;
  const healthColor = baseHealth >= 70 ? '#22c55e' : baseHealth >= 40 ? '#f59e0b' : '#ef4444';
  const alertStyle = ALERT_STYLES[alertState];

  return (
    <div style={{ flexShrink: 0 }}>
      {/* Pause banner */}
      {paused && (
        <div style={{
          backgroundColor: 'rgba(59,130,246,0.15)', borderBottom: '1px solid rgba(59,130,246,0.4)',
          textAlign: 'center', padding: '5px',
          fontSize: '10px', fontWeight: 800, color: '#93c5fd', letterSpacing: '0.12em', textTransform: 'uppercase',
        }}>
          &#9646;&#9646; SIMULATION PAUSED &mdash; INSTRUCTOR DEBRIEF MODE
        </div>
      )}
      {/* Time progress strip */}
      <div style={{ height: '3px', backgroundColor: 'rgba(255,255,255,0.06)' }}>
        <div style={{
          height: '100%', width: `${timePct}%`,
          backgroundColor: timeLeft < 30 ? '#ef4444' : timeLeft < 60 ? '#f59e0b' : '#22c55e',
          transition: 'width 1s linear, background-color 0.5s',
        }} />
      </div>

      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '10px 20px', backgroundColor: 'rgba(9, 14, 26, 0.88)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        gap: '12px',
      }}>
        {/* Left: logo + mission */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <span style={{
              width: '28px', height: '28px', borderRadius: '8px',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              border: '1.5px solid rgba(59, 130, 246, 0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', color: '#60a5fa',
              boxShadow: '0 0 10px rgba(59, 130, 246, 0.25)',
            }}>
              🛡
            </span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: '13px', letterSpacing: '-0.02em', lineHeight: 1 }}>DroneShield</span>
              <span style={{ color: '#64748b', fontSize: '8px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>C-UAS TACTICAL</span>
            </div>
          </div>
          <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '8.5px', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>DEFENDING ASSET</p>
            <p style={{ margin: 0, fontSize: '11px', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px', fontWeight: 600 }}>{targetName}</p>
          </div>
        </div>

        {/* Center: metrics */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Neutralized quota */}
          <div style={{ textAlign: 'center', minWidth: '80px' }}>
            <p style={{ margin: 0, fontSize: '9px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>NEUTRALISED</p>
            <p style={{ margin: '1px 0 3px', fontSize: '18px', fontWeight: 800, color: '#22c55e', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {threatsNeutralized}<span style={{ fontSize: '12px', color: '#4b5563', fontWeight: 500 }}>/{threatQuota}</span>
            </p>
            <div style={{ height: '3px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${quotaPct}%`, backgroundColor: '#22c55e', borderRadius: '2px', transition: 'width 0.3s ease' }} />
            </div>
          </div>

          {/* Active threats */}
          <div style={{ textAlign: 'center', minWidth: '52px' }}>
            <p style={{ margin: 0, fontSize: '9px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>ACTIVE</p>
            <p style={{ margin: '1px 0 3px', fontSize: '18px', fontWeight: 800, color: activeThreats > 0 ? '#ef4444' : '#22c55e', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {activeThreats}
            </p>
            <div style={{ height: '3px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '2px' }} />
          </div>

          {/* Base health & Destruction */}
          <div style={{ textAlign: 'center', minWidth: '78px' }}>
            <p style={{ margin: 0, fontSize: '8.5px', color: baseHealth === 100 ? '#22c55e' : '#f59e0b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {baseHealth === 100 ? '0% BASE DMG' : `${100 - baseHealth}% BASE DMG`}
            </p>
            <p style={{ margin: '1px 0 3px', fontSize: '18px', fontWeight: 800, color: healthColor, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {baseHealth}<span style={{ fontSize: '11px', color: '#4b5563', fontWeight: 500 }}>% HP</span>
            </p>
            <div style={{ height: '3px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${baseHealth}%`, backgroundColor: healthColor, borderRadius: '2px', transition: 'width 0.4s ease' }} />
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '9px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>SCORE</p>
            <p style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#f59e0b', fontVariantNumeric: 'tabular-nums' }}>{score}</p>
          </div>

          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '9px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>TIME</p>
            <p style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: timeColor, fontVariantNumeric: 'tabular-nums' }}>{mins}:{secs}</p>
          </div>
        </div>

        {/* Right: priority threat + alert state + streak + level */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
          {priorityThreat && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              fontSize: '10px', fontWeight: 700, padding: '4px 10px',
              borderRadius: '999px',
              backgroundColor: priorityThreat.threatRating === 'CRITICAL' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.12)',
              color: priorityThreat.threatRating === 'CRITICAL' ? '#ef4444' : '#f59e0b',
              border: `1px solid ${priorityThreat.threatRating === 'CRITICAL' ? 'rgba(239,68,68,0.35)' : 'rgba(245,158,11,0.3)'}`,
              letterSpacing: '0.04em', flexShrink: 0,
              animation: priorityThreat.etaSec < 30 ? 'hudPulse 0.8s infinite' : 'none',
            }}>
              &#8593; ENGAGE: {priorityThreat.type.toUpperCase().slice(0, 4)} {priorityThreat.etaSec}s
            </div>
          )}
          {streak >= 3 && (
            <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '999px', backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', animation: 'streakPulse 1s infinite' }}>
              ×{streak} STREAK
            </span>
          )}
          <span style={{ fontSize: '10px', fontWeight: 800, padding: '4px 10px', borderRadius: '999px', backgroundColor: alertStyle.bg, color: alertStyle.color, border: `1px solid ${alertStyle.border}`, flexShrink: 0, letterSpacing: '0.05em', animation: alertState === 'SCRAMBLE' ? 'hudPulse 0.8s infinite' : 'none' }}>
            {alertState}
          </span>
          <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)', flexShrink: 0 }}>
            LVL {String(levelNum).padStart(2, '0')}
          </span>
          <button
            onClick={onTogglePause}
            title={paused ? 'Resume [P]' : 'Pause [P]'}
            style={{ fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '999px', backgroundColor: paused ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)', color: paused ? '#93c5fd' : '#6b7280', border: `1px solid ${paused ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.1)'}`, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit', letterSpacing: '0.04em' }}
          >
            {paused ? '▶ RESUME' : '⏸ PAUSE'}
          </button>
          <button
            onClick={onToggleMute}
            title={muted ? 'Unmute [M]' : 'Mute [M]'}
            style={{ fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '999px', backgroundColor: muted ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.06)', color: muted ? '#f87171' : '#6b7280', border: `1px solid ${muted ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)'}`, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit', letterSpacing: '0.04em' }}
          >
            {muted ? '🔇 MUTED' : '🔊 AUDIO'}
          </button>
        </div>
      </div>
    </div>
  );
}
