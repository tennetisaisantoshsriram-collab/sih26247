'use client';

interface Props {
  operatorName: string;
  tierNumber: number;
  tierName: string;
  sectorName: string;
  missionsCompleted: number;
  date: string;
  onClose: () => void;
}

export default function CertificateOverlay({
  operatorName, tierNumber, tierName, sectorName,
  missionsCompleted, date, onClose,
}: Props) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      backgroundColor: 'rgba(0,0,0,0.92)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        maxWidth: '580px', width: '100%',
        background: 'linear-gradient(135deg, #0f1729 0%, #1a2744 50%, #0f1729 100%)',
        border: '2px solid rgba(245,158,11,0.5)',
        borderRadius: '24px', padding: '48px 52px',
        textAlign: 'center',
        boxShadow: '0 0 80px rgba(245,158,11,0.12), inset 0 0 60px rgba(245,158,11,0.03)',
      }}>
        <p style={{ margin: 0, fontSize: '9px', color: '#f59e0b', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase' }}>
          Ministry of Defence &mdash; Indian Armed Forces
        </p>
        <p style={{ margin: '2px 0 0', fontSize: '9px', color: '#374151', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          IDAS-C4I &mdash; AI-Enabled Counter-Drone Tactical Defense System
        </p>

        <div style={{ margin: '24px 0 20px', fontSize: '36px' }}>&#127942;</div>

        <p style={{ margin: 0, fontSize: '11px', color: '#6b7280', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          Certificate of Operational Competency
        </p>

        <h2 style={{ margin: '14px 0 4px', fontSize: '30px', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
          {operatorName || 'Operator'}
        </h2>

        <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#9ca3af' }}>
          has successfully completed all training objectives for
        </p>

        <div style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '16px', padding: '16px 24px', marginBottom: '20px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Tier {tierNumber} &mdash; {tierName}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 800, color: '#fff' }}>
            {sectorName}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#6b7280' }}>
            {missionsCompleted} training sorties completed
          </p>
        </div>

        <p style={{ margin: '0 0 24px', fontSize: '12px', color: '#6b7280', lineHeight: '1.6' }}>
          This operator is certified for air defence operations in the{' '}
          <strong style={{ color: '#9ca3af' }}>{sectorName}</strong> sector and is
          cleared to progress to the next training tier.
        </p>

        <div style={{ paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ textAlign: 'left' }}>
            <p style={{ margin: 0, fontSize: '9px', color: '#374151', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Date Issued</p>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#6b7280' }}>{date}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: '9px', color: '#374151', letterSpacing: '0.08em', textTransform: 'uppercase' }}>DroneShield Defense System</p>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#6b7280', fontFamily: 'monospace' }}>IDAS-C4I / MoD / IAF Air Defence Command</p>
          </div>
        </div>
      </div>

      <div className="no-print" style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
        <button
          onClick={() => window.print()}
          style={{ backgroundColor: '#f59e0b', color: '#0a0a0f', fontWeight: 800, padding: '12px 28px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: '14px', letterSpacing: '-0.01em' }}
        >
          Print Certificate
        </button>
        <button
          onClick={onClose}
          style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#9ca3af', fontWeight: 700, padding: '12px 24px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: '14px' }}
        >
          Continue Training
        </button>
      </div>
    </div>
  );
}
