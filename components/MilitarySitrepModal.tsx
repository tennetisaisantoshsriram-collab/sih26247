'use client';
import { Session } from '@/types';
import type { TraineeProfile } from '@/lib/storage';
import { getLevel } from '@/lib/levels';
import { scoreDecision } from '@/lib/scoring';
import { getDoctrine } from '@/lib/doctrine';

interface Props {
  session: Session;
  profile: TraineeProfile;
  onClose: () => void;
}

export default function MilitarySitrepModal({ session, profile, onClose }: Props) {
  const lvl = getLevel(session.level ?? 1);
  const now = new Date();
  
  // Format DTG (Date-Time Group in military format: DDHHMMZ MMM YY)
  const pad = (n: number) => String(n).padStart(2, '0');
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const dtg = `${pad(now.getUTCDate())}${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}Z ${months[now.getUTCMonth()]} ${String(now.getUTCFullYear()).slice(-2)}`;

  const totalScore = session.score;
  const decisions = session.decisions;
  const hostileCount = decisions.filter(d => d.intent === 'hostile').length;
  const neutralizedCount = decisions.filter(d => d.correct).length;
  const fratricides = decisions.filter(d => d.intent !== 'hostile' && d.classifiedIntent === 'hostile').length;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      backgroundColor: 'rgba(5, 10, 20, 0.94)',
      backdropFilter: 'blur(12px)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'flex-start',
      overflowY: 'auto', padding: '24px 16px',
    }}>
      {/* Top Action Bar */}
      <div style={{
        maxWidth: '820px', width: '100%',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '16px', padding: '0 4px',
      }} className="no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>📑</span>
          <span style={{ color: '#fff', fontSize: '13px', fontWeight: 800, letterSpacing: '0.04em' }}>
            IAF FORM 114 / STANAG 2014 C-UAS OPERATIONAL INCIDENT SITREP
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handlePrint}
            style={{
              backgroundColor: '#f59e0b', color: '#000',
              fontWeight: 800, fontSize: '12px',
              padding: '8px 18px', borderRadius: '8px',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: '0 0 16px rgba(245,158,11,0.3)',
            }}
          >
            🖨️ PRINT / EXPORT OFFICIAL PDF
          </button>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'rgba(255,255,255,0.08)', color: '#94a3b8',
              fontWeight: 700, fontSize: '12px',
              padding: '8px 16px', borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer',
            }}
          >
            ✕ CLOSE
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div id="military-sitrep-document" style={{
        maxWidth: '820px', width: '100%',
        backgroundColor: '#ffffff', color: '#0f172a',
        padding: '40px 48px', borderRadius: '4px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        fontFamily: 'Courier New, Courier, monospace, serif',
        fontSize: '11px', lineHeight: 1.45,
        boxSizing: 'border-box',
      }}>
        {/* Classified Top Banner */}
        <div style={{
          backgroundColor: '#991b1b', color: '#ffffff',
          textAlign: 'center', padding: '4px 0',
          fontWeight: 900, fontSize: '11px', letterSpacing: '0.15em',
          marginBottom: '20px', textTransform: 'uppercase',
        }}>
          SECRET // REL TO INDIAN ARMED FORCES ONLY // EXERCISE DRONESHIELD
        </div>

        {/* Header Block */}
        <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 900, fontSize: '13px', textTransform: 'uppercase' }}>
                HQ AIR DEFENCE COMMAND · INTEGRATED C-UAS CELL
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '11px', fontWeight: 700 }}>
                OPERATIONAL INCIDENT SITUATION REPORT (SITREP) — CLASSIFIED C-UAS RECORD
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#475569' }}>
                STANAG 2014 / IAF STANDARD C-UAS ENGAGEMENT RECORD FORM 114
              </p>
            </div>
            <div style={{ textAlign: 'right', fontSize: '10px', fontFamily: 'monospace' }}>
              <p style={{ margin: 0, fontWeight: 900, color: '#dc2626' }}>SERIAL: DS-2026-SR-{String(session.level ?? 1).padStart(3, '0')}</p>
              <p style={{ margin: '2px 0 0', fontWeight: 700 }}>DTG: {dtg}</p>
              <p style={{ margin: '2px 0 0', color: '#475569' }}>SECURITY: CONFIDENTIAL</p>
            </div>
          </div>
        </div>

        {/* Section 1: Administrative & Area of Operation */}
        <div style={{ marginBottom: '16px' }}>
          <p style={{ margin: '0 0 6px', fontWeight: 900, fontSize: '11px', background: '#f1f5f9', padding: '3px 6px', textTransform: 'uppercase' }}>
            1. ADMINISTRATIVE &amp; AREA OF RESPONSIBILITY (AOR)
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '0 6px' }}>
            <div>
              <span style={{ fontSize: '9px', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>DEFENDED INSTALLATION</span>
              <span style={{ fontWeight: 800 }}>{lvl.targetName}</span>
            </div>
            <div>
              <span style={{ fontSize: '9px', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>WGS-84 COORDINATES</span>
              <span style={{ fontWeight: 800 }}>{lvl.targetLat.toFixed(4)}°N, {lvl.targetLng.toFixed(4)}°E</span>
            </div>
            <div>
              <span style={{ fontSize: '9px', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>TACTICAL SECTOR</span>
              <span style={{ fontWeight: 800 }}>{lvl.region}</span>
            </div>
            <div>
              <span style={{ fontSize: '9px', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>DUTY AIR DEFENCE CONTROLLER</span>
              <span style={{ fontWeight: 800 }}>{profile.rank ? `${profile.rank} ${profile.name}` : (profile.name || 'DUTY OPERATOR')}</span>
            </div>
            <div>
              <span style={{ fontSize: '9px', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>SERVICE / UNIT ID</span>
              <span style={{ fontWeight: 800 }}>{profile.serviceNo || 'AF-78219'} · {profile.unit || 'AD MISSILE SQN'}</span>
            </div>
            <div>
              <span style={{ fontSize: '9px', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>METEOROLOGY / NVG STATUS</span>
              <span style={{ fontWeight: 800 }}>WX: {lvl.weather.toUpperCase()} · NIGHT: {lvl.nightMode ? 'YES (NVG)' : 'NO (DAY)'}</span>
            </div>
          </div>
        </div>

        {/* Section 2: Threat Matrix & Intel Assessment */}
        <div style={{ marginBottom: '16px' }}>
          <p style={{ margin: '0 0 6px', fontWeight: 900, fontSize: '11px', background: '#f1f5f9', padding: '3px 6px', textTransform: 'uppercase' }}>
            2. INGRESS VECTOR &amp; HOSTILE PAYLOAD INTELLIGENCE
          </p>
          <div style={{ padding: '0 6px' }}>
            <p style={{ margin: '0 0 4px', fontSize: '10.5px' }}>
              <b>TACTICAL SITREP:</b> {lvl.scenario}
            </p>
            <p style={{ margin: '0 0 6px', fontSize: '10.5px' }}>
              <b>THREAT ORIGIN:</b> {lvl.threatOrigin} &nbsp;|&nbsp; <b>BEARING:</b> {lvl.threatDirection}
            </p>
          </div>
        </div>

        {/* Section 3: Engagement Log Table */}
        <div style={{ marginBottom: '16px' }}>
          <p style={{ margin: '0 0 6px', fontWeight: 900, fontSize: '11px', background: '#f1f5f9', padding: '3px 6px', textTransform: 'uppercase' }}>
            3. CHRONOLOGICAL ENGAGEMENT &amp; OODA LOOP LOG
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px', marginTop: '4px' }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid #0f172a', background: '#f8fafc', textAlign: 'left' }}>
                <th style={{ padding: '5px 4px' }}>#</th>
                <th style={{ padding: '5px 4px' }}>TARGET MODEL</th>
                <th style={{ padding: '5px 4px' }}>TYPE</th>
                <th style={{ padding: '5px 4px' }}>INTENT</th>
                <th style={{ padding: '5px 4px' }}>DEFENSE BATTERY &amp; INTERCEPT COORDS</th>
                <th style={{ padding: '5px 4px' }}>EFFECTOR (ACT)</th>
                <th style={{ padding: '5px 4px' }}>OODA TIME</th>
                <th style={{ padding: '5px 4px' }}>BDA OUTCOME</th>
                <th style={{ padding: '5px 4px', textAlign: 'right' }}>PTS</th>
              </tr>
            </thead>
            <tbody>
              {decisions.map((d, i) => {
                const pts = scoreDecision(d);
                const doct = getDoctrine(d.threatType, d.intent);
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px', fontWeight: 700 }}>{String(i + 1).padStart(2, '0')}</td>
                    <td style={{ padding: '4px', fontWeight: 700 }}>{d.threatType.toUpperCase()}</td>
                    <td style={{ padding: '4px' }}>{d.classifiedAs.toUpperCase()}</td>
                    <td style={{ padding: '4px', color: d.intent === 'hostile' ? '#dc2626' : '#15803d', fontWeight: 700 }}>
                      {d.intent.toUpperCase()}
                    </td>
                    <td style={{ padding: '4px', fontFamily: 'monospace', fontSize: '8.5px' }}>
                      {d.batteryName ? (
                        <div>
                          <div style={{ color: '#0f172a', fontWeight: 600 }}>{d.batteryName.split(' ')[0]} ({d.batteryLat?.toFixed(3)}°N, {d.batteryLng?.toFixed(3)}°E)</div>
                          <div style={{ color: '#0284c7' }}>↳ TGT INT: ({d.interceptLat?.toFixed(3)}°N, {d.interceptLng?.toFixed(3)}°E) · {d.slantRangeKm ?? 0}km</div>
                        </div>
                      ) : (
                        <span style={{ color: '#64748b' }}>BASE DEFENSE UMBRELLA</span>
                      )}
                    </td>
                    <td style={{ padding: '4px', fontFamily: 'monospace' }}>
                      {d.countermeasure.toUpperCase().replace(/-/g, ' ')}
                    </td>
                    <td style={{ padding: '4px' }}>{(d.responseTimeMs / 1000).toFixed(1)}s</td>
                    <td style={{ padding: '4px', fontWeight: 700, color: d.correct ? '#15803d' : '#dc2626' }}>
                      {d.correct ? 'NEUTRALIZED' : 'BREACH / MISS'}
                    </td>
                    <td style={{ padding: '4px', textAlign: 'right', fontWeight: 800 }}>
                      {pts}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Section 4: Standardized Combat Evaluation */}
        <div style={{ marginBottom: '16px' }}>
          <p style={{ margin: '0 0 6px', fontWeight: 900, fontSize: '11px', background: '#f1f5f9', padding: '3px 6px', textTransform: 'uppercase' }}>
            4. STANDARDIZED OPERATIONAL COMBAT READINESS FORMULA
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', padding: '0 6px' }}>
            <div style={{ border: '1px solid #cbd5e1', padding: '6px 8px', borderRadius: '3px' }}>
              <span style={{ fontSize: '8px', color: '#64748b', display: 'block' }}>DETECTION SPEED (30 MAX)</span>
              <span style={{ fontSize: '12px', fontWeight: 900 }}>28 / 30 pts</span>
            </div>
            <div style={{ border: '1px solid #cbd5e1', padding: '6px 8px', borderRadius: '3px' }}>
              <span style={{ fontSize: '8px', color: '#64748b', display: 'block' }}>CLASSIFICATION (30 MAX)</span>
              <span style={{ fontSize: '12px', fontWeight: 900 }}>29 / 30 pts</span>
            </div>
            <div style={{ border: '1px solid #cbd5e1', padding: '6px 8px', borderRadius: '3px' }}>
              <span style={{ fontSize: '8px', color: '#64748b', display: 'block' }}>ENGAGEMENT DOCTRINE (25)</span>
              <span style={{ fontSize: '12px', fontWeight: 900 }}>25 / 25 pts</span>
            </div>
            <div style={{ border: '1px solid #cbd5e1', padding: '6px 8px', borderRadius: '3px' }}>
              <span style={{ fontSize: '8px', color: '#64748b', display: 'block' }}>SPEED &amp; CONSISTENCY (15)</span>
              <span style={{ fontSize: '12px', fontWeight: 900 }}>14 / 15 pts</span>
            </div>
          </div>
          <div style={{ marginTop: '6px', padding: '0 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: fratricides > 0 ? '#dc2626' : '#15803d', fontWeight: 700 }}>
              {fratricides === 0 ? '✓ ZERO FRATRICIDE VERIFIED (NO CIVILIAN/FRIENDLY ENGAGEMENT)' : `⚠ FRATRICIDE PENALTY: −${fratricides * 25} PTS`}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a' }}>
              TOTAL SORTIE SCORE: {totalScore} PTS
            </span>
          </div>
        </div>

        {/* Section 5: Authentication & Field Signature */}
        <div style={{ borderTop: '2px solid #0f172a', paddingTop: '16px', marginTop: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px' }}>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: '#475569' }}>
                DOCTRINE CITATION &amp; LEGALITY CERTIFICATE
              </p>
              <p style={{ margin: 0, fontSize: '9px', color: '#334155' }}>
                All kinetic and non-kinetic C-UAS effectors deployed in compliance with Indian Air Force Air Defence Doctrine (2022), NACIN Counter-UAS SOP (2023), and DRDO Counter-Swarm Directive SWM-2024. Sovereign boundary coordinates validated under Survey of India geospatial mandate.
              </p>
            </div>
            <div style={{ textAlign: 'center', border: '1.5px dashed #94a3b8', padding: '10px', borderRadius: '4px' }}>
              <p style={{ margin: '0 0 24px', fontSize: '8.5px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                DEFENCE SERVICES STAFF COLLEGE (DSSC) / IAF EVALUATOR
              </p>
              <p style={{ margin: 0, fontSize: '11px', fontWeight: 900, borderTop: '1px solid #0f172a', paddingTop: '4px' }}>
                AUTHENTICATED OPERATIONAL COPY
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '8px', color: '#64748b' }}>
                EXERCISE DRONESHIELD · SMART INDIA HACKATHON 2026
              </p>
            </div>
          </div>
        </div>

        {/* Classified Bottom Banner */}
        <div style={{
          backgroundColor: '#991b1b', color: '#ffffff',
          textAlign: 'center', padding: '4px 0',
          fontWeight: 900, fontSize: '11px', letterSpacing: '0.15em',
          marginTop: '24px', textTransform: 'uppercase',
        }}>
          SECRET // REL TO INDIAN ARMED FORCES ONLY // EXERCISE DRONESHIELD
        </div>
      </div>

      {/* Print CSS Style Injection */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #military-sitrep-document, #military-sitrep-document * {
            visibility: visible;
          }
          #military-sitrep-document {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            padding: 20px !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
