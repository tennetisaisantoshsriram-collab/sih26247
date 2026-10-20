'use client';
import { Session } from '@/types';
import type { TraineeProfile } from '@/lib/storage';

interface Props {
  profile: TraineeProfile;
  sessions: Session[];
  onClose: () => void;
}

export default function TrainingRecordOverlay({ profile, sessions, onClose }: Props) {
  const decisions = sessions.flatMap(s => s.decisions);
  const totalDecisions = decisions.length;
  const correct = decisions.filter(d => d.correct).length;
  const accuracy = totalDecisions ? Math.round((correct / totalDecisions) * 100) : 0;
  const avgScore = sessions.length
    ? Math.round(sessions.reduce((a, s) => a + s.score, 0) / sessions.length) : 0;
  const bestScore = sessions.length ? Math.max(...sessions.map(s => s.score)) : 0;
  const date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const fratricides = decisions.filter(d => d.intent !== 'hostile' && d.classifiedIntent === 'hostile').length;

  const byType = (t: string) => {
    const ds = decisions.filter(d => d.threatType === t);
    return ds.length ? Math.round((ds.filter(d => d.correct).length / ds.length) * 100) : 0;
  };

  const SECTORS = [
    { label: 'Punjab IB', lo: 1, hi: 200 },
    { label: 'J&K LoC', lo: 201, hi: 400 },
    { label: 'Ladakh LAC', lo: 401, hi: 600 },
    { label: 'Rajasthan/Coast', lo: 601, hi: 800 },
    { label: 'NCR Multi-Vector', lo: 801, hi: 1000 },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      backgroundColor: 'rgba(0,0,0,0.92)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'flex-start',
      overflowY: 'auto', padding: '20px',
    }}>
      <div style={{
        maxWidth: '640px', width: '100%',
        background: '#fff', color: '#111',
        borderRadius: '4px', padding: '48px 52px',
        fontFamily: 'Georgia, serif',
      }}>
        {/* MoD Header */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #111', paddingBottom: '16px', marginBottom: '20px' }}>
          <p style={{ margin: 0, fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#374151' }}>
            Ministry of Defence — Indian Armed Forces
          </p>
          <p style={{ margin: '2px 0 0', fontSize: '9px', color: '#6b7280', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            IDAS-C4I — AI-Enabled Counter-Drone Threat Tactical Training Record
          </p>
          <h1 style={{ margin: '12px 0 4px', fontSize: '20px', fontWeight: 700, letterSpacing: '-0.01em' }}>
            Individual Training Record
          </h1>
          <p style={{ margin: 0, fontSize: '11px', color: '#6b7280' }}>
            Defence Services Staff College — Air Defence Training Division
          </p>
        </div>

        {/* Trainee Identity */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '12px' }}>
          <tbody>
            <tr>
              <td style={{ padding: '5px 8px', border: '1px solid #d1d5db', fontWeight: 700, width: '35%', backgroundColor: '#f9fafb' }}>Name</td>
              <td style={{ padding: '5px 8px', border: '1px solid #d1d5db' }}>{profile.name || '—'}</td>
              <td style={{ padding: '5px 8px', border: '1px solid #d1d5db', fontWeight: 700, width: '25%', backgroundColor: '#f9fafb' }}>Rank</td>
              <td style={{ padding: '5px 8px', border: '1px solid #d1d5db' }}>{profile.rank || '—'}</td>
            </tr>
            <tr>
              <td style={{ padding: '5px 8px', border: '1px solid #d1d5db', fontWeight: 700, backgroundColor: '#f9fafb' }}>Service Number</td>
              <td style={{ padding: '5px 8px', border: '1px solid #d1d5db' }}>{profile.serviceNo || '—'}</td>
              <td style={{ padding: '5px 8px', border: '1px solid #d1d5db', fontWeight: 700, backgroundColor: '#f9fafb' }}>Unit / Squadron</td>
              <td style={{ padding: '5px 8px', border: '1px solid #d1d5db' }}>{profile.unit || '—'}</td>
            </tr>
            <tr>
              <td style={{ padding: '5px 8px', border: '1px solid #d1d5db', fontWeight: 700, backgroundColor: '#f9fafb' }}>Base / Station</td>
              <td style={{ padding: '5px 8px', border: '1px solid #d1d5db' }}>{profile.base || '—'}</td>
              <td style={{ padding: '5px 8px', border: '1px solid #d1d5db', fontWeight: 700, backgroundColor: '#f9fafb' }}>Date</td>
              <td style={{ padding: '5px 8px', border: '1px solid #d1d5db' }}>{date}</td>
            </tr>
          </tbody>
        </table>

        {/* Training Summary */}
        <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#374151' }}>
          Training Performance Summary
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <th style={{ padding: '6px 8px', border: '1px solid #d1d5db', textAlign: 'left', fontWeight: 700 }}>Metric</th>
              <th style={{ padding: '6px 8px', border: '1px solid #d1d5db', textAlign: 'right', fontWeight: 700 }}>Value</th>
              <th style={{ padding: '6px 8px', border: '1px solid #d1d5db', textAlign: 'left', fontWeight: 700 }}>Metric</th>
              <th style={{ padding: '6px 8px', border: '1px solid #d1d5db', textAlign: 'right', fontWeight: 700 }}>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '5px 8px', border: '1px solid #d1d5db' }}>Training Sorties</td>
              <td style={{ padding: '5px 8px', border: '1px solid #d1d5db', textAlign: 'right', fontWeight: 700 }}>{sessions.length}</td>
              <td style={{ padding: '5px 8px', border: '1px solid #d1d5db' }}>Total Engagements</td>
              <td style={{ padding: '5px 8px', border: '1px solid #d1d5db', textAlign: 'right', fontWeight: 700 }}>{totalDecisions}</td>
            </tr>
            <tr>
              <td style={{ padding: '5px 8px', border: '1px solid #d1d5db' }}>Classification Accuracy</td>
              <td style={{ padding: '5px 8px', border: '1px solid #d1d5db', textAlign: 'right', fontWeight: 700, color: accuracy >= 70 ? '#166534' : '#991b1b' }}>{accuracy}%</td>
              <td style={{ padding: '5px 8px', border: '1px solid #d1d5db' }}>Average Mission Score</td>
              <td style={{ padding: '5px 8px', border: '1px solid #d1d5db', textAlign: 'right', fontWeight: 700 }}>{avgScore}</td>
            </tr>
            <tr>
              <td style={{ padding: '5px 8px', border: '1px solid #d1d5db' }}>Best Mission Score</td>
              <td style={{ padding: '5px 8px', border: '1px solid #d1d5db', textAlign: 'right', fontWeight: 700 }}>{bestScore}</td>
              <td style={{ padding: '5px 8px', border: '1px solid #d1d5db', color: fratricides > 0 ? '#991b1b' : undefined }}>Fratricide Incidents</td>
              <td style={{ padding: '5px 8px', border: '1px solid #d1d5db', textAlign: 'right', fontWeight: 700, color: fratricides > 0 ? '#991b1b' : '#166534' }}>{fratricides}</td>
            </tr>
          </tbody>
        </table>

        {/* Threat Type Accuracy */}
        <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#374151' }}>
          Threat Classification Proficiency
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <th style={{ padding: '6px 8px', border: '1px solid #d1d5db', textAlign: 'left' }}>Threat Category</th>
              <th style={{ padding: '6px 8px', border: '1px solid #d1d5db', textAlign: 'right' }}>Accuracy</th>
              <th style={{ padding: '6px 8px', border: '1px solid #d1d5db', textAlign: 'left' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'Commercial UAS', key: 'commercial' },
              { label: 'Military UCAV', key: 'military' },
              { label: 'Coordinated Swarm', key: 'swarm' },
            ].map(({ label, key }) => {
              const acc = byType(key);
              return (
                <tr key={key}>
                  <td style={{ padding: '5px 8px', border: '1px solid #d1d5db' }}>{label}</td>
                  <td style={{ padding: '5px 8px', border: '1px solid #d1d5db', textAlign: 'right', fontWeight: 700 }}>
                    {decisions.filter(d => d.threatType === key).length > 0 ? `${acc}%` : 'No data'}
                  </td>
                  <td style={{ padding: '5px 8px', border: '1px solid #d1d5db', color: acc >= 70 ? '#166534' : acc > 0 ? '#92400e' : '#6b7280' }}>
                    {decisions.filter(d => d.threatType === key).length === 0 ? 'Not assessed' : acc >= 70 ? 'PROFICIENT' : 'REMEDIATION REQUIRED'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Sector Coverage */}
        <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#374151' }}>
          Sector Training Coverage
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <th style={{ padding: '6px 8px', border: '1px solid #d1d5db', textAlign: 'left' }}>Sector</th>
              <th style={{ padding: '6px 8px', border: '1px solid #d1d5db', textAlign: 'right' }}>Sorties</th>
            </tr>
          </thead>
          <tbody>
            {SECTORS.map(s => {
              const count = sessions.filter(sess => {
                const lvl = sess.level ?? 1;
                return lvl >= s.lo && lvl <= s.hi;
              }).length;
              return (
                <tr key={s.label}>
                  <td style={{ padding: '5px 8px', border: '1px solid #d1d5db' }}>{s.label} (Lvl {s.lo}–{s.hi})</td>
                  <td style={{ padding: '5px 8px', border: '1px solid #d1d5db', textAlign: 'right', fontWeight: 700 }}>{count}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Certification Statement */}
        <div style={{ borderTop: '1px solid #d1d5db', paddingTop: '16px', marginBottom: '32px' }}>
          <p style={{ margin: 0, fontSize: '11px', color: '#374151', lineHeight: '1.7' }}>
            This record certifies that the above-named trainee has undergone computer-based counter-drone threat simulation training under the IDAS-C4I AI-Enabled Tactical Counter-Drone Defense Simulation System. Performance data recorded herein is generated by the DroneShield Training System and is subject to instructor verification before use in formal qualification records.
          </p>
        </div>

        {/* Signature Block */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '16px' }}>
          <div>
            <div style={{ borderBottom: '1px solid #111', marginBottom: '6px', paddingBottom: '20px' }} />
            <p style={{ margin: 0, fontSize: '10px', color: '#374151' }}>Trainee Signature</p>
            <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#6b7280' }}>{profile.rank ? `${profile.rank} ` : ''}{profile.name || '_______________'}</p>
            <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#6b7280' }}>Date: {date}</p>
          </div>
          <div>
            <div style={{ borderBottom: '1px solid #111', marginBottom: '6px', paddingBottom: '20px' }} />
            <p style={{ margin: 0, fontSize: '10px', color: '#374151' }}>Instructor Countersignature</p>
            <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#6b7280' }}>Rank / Name: _______________</p>
            <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#6b7280' }}>Date: _______________</p>
          </div>
        </div>

        <p style={{ margin: 0, fontSize: '9px', color: '#9ca3af', textAlign: 'center', borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
          DroneShield Defense Training System — IDAS-C4I / MoD / IAF Air Defence Command — Generated {date}
        </p>
      </div>

      {/* Action buttons (no-print) */}
      <div className="no-print" style={{ display: 'flex', gap: '12px', marginTop: '24px', paddingBottom: '40px' }}>
        <button
          onClick={() => window.print()}
          style={{ backgroundColor: '#111', color: '#fff', fontWeight: 800, padding: '12px 28px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: '14px' }}
        >
          Print / Save PDF
        </button>
        <button
          onClick={onClose}
          style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#9ca3af', fontWeight: 700, padding: '12px 24px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: '14px' }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
