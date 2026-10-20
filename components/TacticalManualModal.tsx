'use client';
import React, { useState } from 'react';

interface TacticalManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TacticalManualModal({ isOpen, onClose }: TacticalManualModalProps) {
  const [activeTab, setActiveTab] = useState<'types' | 'vectors' | 'transit' | 'countermeasures' | 'ooda'>('types');
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      backgroundColor: '#070b14',
      display: 'flex', flexDirection: 'column',
      width: '100vw', height: '100vh',
      overflow: 'hidden',
      color: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace',
    }}>
      <div style={{
        width: '100%', height: '100%',
        backgroundColor: '#070b14',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          backgroundColor: '#0d1322',
          borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '34px', height: '34px', borderRadius: '8px',
              backgroundColor: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)',
              color: '#f59e0b', fontSize: '18px',
            }}>
              📖
            </span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, letterSpacing: '0.04em', color: '#fff' }}>
                  TACTICAL C-UAS OPERATOR MANUAL
                </h2>
                <span style={{
                  fontSize: '9px', fontWeight: 800, color: '#f59e0b',
                  backgroundColor: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '4px', padding: '2px 6px', letterSpacing: '0.08em',
                }}>
                  RESTRICTED · IDAS-C4I
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8' }}>
                Operational Doctrine, Threat Classification Vectors & Engagement Protocol
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="text"
              placeholder="Search doctrine..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px', padding: '6px 12px', fontSize: '11px',
                color: '#fff', outline: 'none', width: '180px',
              }}
            />
            <button
              onClick={onClose}
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#ef4444', borderRadius: '8px', padding: '6px 14px',
                fontSize: '11px', fontWeight: 800, cursor: 'pointer',
              }}
            >
              ESC / CLOSE ✕
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          backgroundColor: '#0a0f1c',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          overflowX: 'auto',
        }}>
          {[
            { id: 'types', label: '1. DRONE THREAT TYPES', icon: '🛸' },
            { id: 'vectors', label: '2. ORIGINS & BORDER VECTORS', icon: '🌐' },
            { id: 'transit', label: '3. CROSS-SECTOR TRANSIT', icon: '✈' },
            { id: 'countermeasures', label: '4. COUNTERMEASURES MATRIX', icon: '🛡' },
            { id: 'ooda', label: '5. OODA DOCTRINE & ROE', icon: '⚡' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              style={{
                flex: 1, padding: '12px 14px',
                backgroundColor: activeTab === tab.id ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #f59e0b' : '2px solid transparent',
                color: activeTab === tab.id ? '#fbbf24' : '#64748b',
                fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.04em',
                cursor: 'pointer', whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div style={{
          padding: '20px 24px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex', flexDirection: 'column', gap: '16px',
        }}>

          {/* TAB 1: DRONE THREAT TYPES */}
          {activeTab === 'types' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <h4 style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: 800, color: '#f59e0b' }}>
                  DRONE CLASSIFICATION TAXONOMY (IAF AIR DEFENCE STANDARD)
                </h4>
                <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', lineHeight: '1.5' }}>
                  Modern hostile unmanned aerial systems range from micro consumer quadcopters carrying contraband to heavy military loitering munitions capable of penetrating hardened radar shelters. Correct classification within 15 seconds is critical to prevent base destruction or fratricide.
                </p>
              </div>

              {/* Commercial Multirotors / FPV */}
              <div style={{ padding: '14px 18px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px' }}>🟡</span>
                    <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#fbbf24' }}>
                      COMMERCIAL MULTIROTOR & FPV SUICIDE DRONES
                    </h3>
                  </div>
                  <span style={{ fontSize: '9px', fontWeight: 800, color: '#fbbf24', background: 'rgba(245, 158, 11, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                    RCS: 0.01 – 0.04 m² | ALT: 30–150m AGL
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '8px', fontSize: '10.5px' }}>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '6px' }}>
                    <span style={{ color: '#64748b', fontSize: '9px', fontWeight: 700 }}>REPRESENTATIVE MODELS</span>
                    <p style={{ margin: '2px 0 0', color: '#e2e8f0', fontWeight: 600 }}>DJI Matrice 300, Agras T30, Custom FPV Quad</p>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '6px' }}>
                    <span style={{ color: '#64748b', fontSize: '9px', fontWeight: 700 }}>RF SIGNATURE</span>
                    <p style={{ margin: '2px 0 0', color: '#e2e8f0', fontWeight: 600 }}>2.4 GHz / 5.8 GHz ISM, OcuSync, ELRS 868MHz</p>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '6px' }}>
                    <span style={{ color: '#64748b', fontSize: '9px', fontWeight: 700 }}>PAYLOAD THREAT</span>
                    <p style={{ margin: '2px 0 0', color: '#e2e8f0', fontWeight: 600 }}>Improvised IEDs, RDX drops, optical surveillance</p>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: '11px', color: '#cbd5e1', lineHeight: '1.5' }}>
                  <strong style={{ color: '#fbbf24' }}>Countermeasure Rule:</strong> Deploy <b>[Q] Directional RF Jammer</b> to break command link or <b>[T] GNSS Spoofing</b> to force emergency landing in a designated containment landing zone. Avoid expensive kinetic SAMs near domestic buildings.
                </p>
              </div>

              {/* Military UCAV / Loitering Munitions */}
              <div style={{ padding: '14px 18px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(239, 68, 68, 0.35)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px' }}>🔴</span>
                    <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#f87171' }}>
                      MILITARY UCAV & KAMIKAZE LOITERING MUNITIONS
                    </h3>
                  </div>
                  <span style={{ fontSize: '9px', fontWeight: 800, color: '#f87171', background: 'rgba(239, 68, 68, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                    RCS: 0.15 – 1.8 m² | SPEED: 140–320 km/h
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '8px', fontSize: '10.5px' }}>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '6px' }}>
                    <span style={{ color: '#64748b', fontSize: '9px', fontWeight: 700 }}>REPRESENTATIVE MODELS</span>
                    <p style={{ margin: '2px 0 0', color: '#e2e8f0', fontWeight: 600 }}>Burraq, Wing Loong II (GJ-2), CH-4, Harop</p>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '6px' }}>
                    <span style={{ color: '#64748b', fontSize: '9px', fontWeight: 700 }}>PROPULSION & THERMAL</span>
                    <p style={{ margin: '2px 0 0', color: '#e2e8f0', fontWeight: 600 }}>Turboprop / 2-stroke IC engine, high IR exhaust plume</p>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '6px' }}>
                    <span style={{ color: '#64748b', fontSize: '9px', fontWeight: 700 }}>PAYLOAD THREAT</span>
                    <p style={{ margin: '2px 0 0', color: '#e2e8f0', fontWeight: 600 }}>AR-1 / AKD-9 laser missiles, 23kg shaped warheads</p>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: '11px', color: '#cbd5e1', lineHeight: '1.5' }}>
                  <strong style={{ color: '#f87171' }}>Countermeasure Rule:</strong> Engage immediately with <b>[W] Kinetic SAM Interceptor</b> beyond 4 km. Inside 3 km or near flammable fuel tanks, fire <b>[Y] 10kW High-Energy Laser DEW</b> for silent thermal burnthrough of wing spar or seeker optics.
                </p>
              </div>

              {/* Autonomous Swarms */}
              <div style={{ padding: '14px 18px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(192, 132, 252, 0.35)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px' }}>🟣</span>
                    <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#c084fc' }}>
                      COORDINATED AUTONOMOUS SWARM CLUSTERS
                    </h3>
                  </div>
                  <span style={{ fontSize: '9px', fontWeight: 800, color: '#c084fc', background: 'rgba(192, 132, 252, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                    MULTI-NODE MESH | TIME-SYNCHRONIZED DIVE
                  </span>
                </div>
                <p style={{ margin: '0 0 8px', fontSize: '11px', color: '#94a3b8', lineHeight: '1.4' }}>
                  Swarm clusters employ decentralized peer-to-peer TDMA datalinks. If one drone is shot down, others dynamically recalculate target distribution. Single kinetic missiles cannot defeat swarm economics.
                </p>
                <p style={{ margin: 0, fontSize: '11px', color: '#cbd5e1', lineHeight: '1.5' }}>
                  <strong style={{ color: '#c084fc' }}>Countermeasure Rule:</strong> Deploy <b>[E] EMP / EW Suite</b> wide-band omnidirectional high-power microwave burst. Sever the intra-swarm synchronization links causing catastrophic cascade desynchronization.
                </p>
              </div>

              {/* Neutral & Friendly Contacts */}
              <div style={{ padding: '14px 18px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(74, 222, 128, 0.35)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px' }}>🟢</span>
                    <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#4ade80' }}>
                      NEUTRAL AIRLINERS & FRIENDLY PATROL DRONES (IFF)
                    </h3>
                  </div>
                  <span style={{ fontSize: '9px', fontWeight: 800, color: '#4ade80', background: 'rgba(74, 222, 128, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                    MODE-5 CRYPTO SQUAWK | CIVILIAN AIR CORRIDOR
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '11px', color: '#cbd5e1', lineHeight: '1.5' }}>
                  <strong style={{ color: '#4ade80' }}>Fratricide Protection Protocol:</strong> Commercial flights traversing domestic airway corridors or friendly Tapas/Netra UAVs broadcast Mode-5 cryptographic IFF. Operator must select <b>[R] HOLD FIRE / LOG</b>. Firing upon neutral contacts yields a severe <b>−25 pt fratricide court-martial penalty</b>.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: ORIGINS & BORDER VECTORS */}
          {activeTab === 'vectors' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <h4 style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: 800, color: '#60a5fa' }}>
                  GEOGRAPHICAL THREAT VECTORS ACROSS INDIAN THEATERS
                </h4>
                <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', lineHeight: '1.5' }}>
                  In accordance with real intelligence reports from BSF, IAF, and Indian Navy, threats originate from distinct state and non-state actors exploiting terrain features along India&apos;s borders.
                </p>
              </div>

              {/* Vector Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* Pakistan Sector */}
                <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <span style={{ color: '#ef4444', fontWeight: 800, fontSize: '12px' }}>🇵🇰 PAKISTAN BORDER (PUNJAB & J&K IB/LOC)</span>
                  </div>
                  <p style={{ margin: '0 0 6px', fontSize: '10.5px', color: '#cbd5e1', lineHeight: '1.4' }}>
                    • <b>Actors:</b> Cross-border smugglers, ISI-backed terror proxies (LeT, JeM).<br />
                    • <b>Tactics:</b> Low-altitude nocturnal infiltration along riverine gaps (Ravi, Chenab). Dropping Austrian Glock pistols, AK rounds, and Afghan heroin.<br />
                    • <b>Key Sectors:</b> Kathua, Samba, Amritsar, Tarn Taran, Ferozepur.
                  </p>
                  <span style={{ fontSize: '9px', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                    Primary Counter: RF Jammer + Acoustic Triangulation
                  </span>
                </div>

                {/* China Sector */}
                <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <span style={{ color: '#f59e0b', fontWeight: 800, fontSize: '12px' }}>🇨🇳 CHINA / LAC (LADAKH & ARUNACHAL)</span>
                  </div>
                  <p style={{ margin: '0 0 6px', fontSize: '10.5px', color: '#cbd5e1', lineHeight: '1.4' }}>
                    • <b>Actors:</b> PLA Western Theater Command, Xinjiang Military District.<br />
                    • <b>Tactics:</b> High-altitude standoff electronic reconnaissance (WZ-7 Soar Dragon) and loitering swarm tests over Depsang, Galwan, and Tawang.<br />
                    • <b>Key Sectors:</b> Daulat Beg Oldie, Nyoma, Chushul, Walong, Tuting.
                  </p>
                  <span style={{ fontSize: '9px', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                    Primary Counter: Kinetic SAM + Anti-Radiation EW
                  </span>
                </div>

                {/* Myanmar Sector */}
                <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(139, 92, 246, 0.25)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <span style={{ color: '#a78bfa', fontWeight: 800, fontSize: '12px' }}>🇲🇲 MYANMAR BORDER (NORTHEAST HILLS)</span>
                  </div>
                  <p style={{ margin: '0 0 6px', fontSize: '10.5px', color: '#cbd5e1', lineHeight: '1.4' }}>
                    • <b>Actors:</b> Insurgent militia networks, arms cartels.<br />
                    • <b>Tactics:</b> Agricultural hexacopters fitted with 3D-printed release latches carrying 40mm and 60mm mortar bombs launched from dense jungle cover.<br />
                    • <b>Key Sectors:</b> Moreh, Churachandpur, Champhai, Mon.
                  </p>
                  <span style={{ fontSize: '9px', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                    Primary Counter: Thermal FLIR + Directional Jammer
                  </span>
                </div>

                {/* Maritime Threat */}
                <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(6, 182, 212, 0.25)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <span style={{ color: '#06b6d4', fontWeight: 800, fontSize: '12px' }}>🌊 MARITIME ASYMMETRIC (COASTAL & EEZ)</span>
                  </div>
                  <p style={{ margin: '0 0 6px', fontSize: '10.5px', color: '#cbd5e1', lineHeight: '1.4' }}>
                    • <b>Actors:</b> Rogue dhows, maritime militia, proxy kamikaze drones.<br />
                    • <b>Tactics:</b> Sea-skimming loitering munitions homing on radar reflections of offshore oil platforms (Bombay High), LNG terminals, and naval carriers.<br />
                    • <b>Key Sectors:</b> Gulf of Kutch, Jamnagar refinery, Karwar (INS Kadamba).
                  </p>
                  <span style={{ fontSize: '9px', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                    Primary Counter: High-Energy Laser DEW + CIWS Interceptor
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CROSS-SECTOR TRANSIT DOCTRINE */}
          {activeTab === 'transit' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '14px 18px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '16px' }}>✈</span>
                  <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#f87171' }}>
                    STRATEGIC CROSS-SECTOR TRANSIT INTERCEPTION
                  </h3>
                </div>
                <p style={{ margin: '0 0 10px', fontSize: '11px', color: '#cbd5e1', lineHeight: '1.5' }}>
                  In complex multi-base air defence environments, hostile drones do not merely fly directly toward your radar antenna. Often, you are stationed at a forward base (e.g. <b>AFS Pathankot</b>), but an enemy UCAV or kamikaze drone enters your radar coverage traveling across the sector towards an adjacent Tier-1 strategic installation (e.g. <b>AFS Adampur S-400 battery</b> or <b>Ambala Rafale pen</b>).
                </p>
                <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px dashed rgba(245, 158, 11, 0.4)' }}>
                  <p style={{ margin: '0 0 4px', fontSize: '10px', fontWeight: 800, color: '#fbbf24', letterSpacing: '0.06em' }}>
                    OPERATOR ENGAGEMENT WINDOW (CORRIDOR LOCK):
                  </p>
                  <p style={{ margin: 0, fontSize: '10.5px', color: '#e2e8f0', lineHeight: '1.4' }}>
                    1. <b>Visual Indicator:</b> The radar target will display a pulsing <span style={{ color: '#f59e0b', fontWeight: 700 }}>✈ ENROUTE: [BASE]</span> telemetry tag.<br />
                    2. <b>Window of Vulnerability:</b> The target will transit through your radar beam only for its Closest Point of Approach (CPA) duration.<br />
                    3. <b>Mandatory Action:</b> You must classify and deploy countermeasures <b>before the target crosses the radial sector boundary</b>. Once it slips past your coverage perimeter, intercept probability drops to zero and an adjacent base takes catastrophic damage!
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <h4 style={{ margin: '0 0 4px', fontSize: '11px', color: '#38bdf8', fontWeight: 700 }}>EXAMPLE: PATHANKOT → ADAMPUR INTERCEPT</h4>
                  <p style={{ margin: 0, fontSize: '10px', color: '#94a3b8', lineHeight: '1.4' }}>
                    Burraq UCAV ingress at 32.18°N 75.35°E bearing 162° heading south-southeast towards Adampur Air Force Station. Speed is 210 km/h. Operator has approximately 28 seconds to lock kinetic SAM before target leaves radar horizon.
                  </p>
                </div>
                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <h4 style={{ margin: '0 0 4px', fontSize: '11px', color: '#38bdf8', fontWeight: 700 }}>FIXED STRATEGIC QUOTA DOCTRINE</h4>
                  <p style={{ margin: 0, fontSize: '10px', color: '#94a3b8', lineHeight: '1.4' }}>
                    Unlike unrealistic arcade games with endless drone waves, our simulation uses strict, doctrinally accurate threat quotas per level (e.g. 5 to 12 threats). Every single drone has tactical purpose, realistic fuel margins, and strict payload limitations.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: COUNTERMEASURE MATRIX */}
          {activeTab === 'countermeasures' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                <p style={{ margin: 0, fontSize: '11px', color: '#cbd5e1' }}>
                  <strong style={{ color: '#4ade80' }}>DOCTRINAL SELECTION MATRIX:</strong> Match the threat classification with the authorized countermeasure to maximize score (up to 100 pts) and conserve precious kinetic ammunition.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#fbbf24' }}>[Q] DIRECTIONAL RF JAMMER</span>
                    <span style={{ fontSize: '9px', color: '#94a3b8' }}>SOFT-KILL · NO HAZARD</span>
                  </div>
                  <p style={{ margin: '0 0 4px', fontSize: '10px', color: '#cbd5e1', lineHeight: '1.4' }}>
                    Injects focused high-power noise onto 2.4/5.8 GHz ISM frequencies. Severs pilot video downlink and telemetry, triggering automated fail-safe return-to-home.
                  </p>
                  <span style={{ fontSize: '9px', color: '#fbbf24' }}>Best against: Commercial quadcopters, FPV drones</span>
                </div>

                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#fbbf24' }}>[T] GNSS SPOOFING GENERATOR</span>
                    <span style={{ fontSize: '9px', color: '#94a3b8' }}>SOFT-KILL · NO HAZARD</span>
                  </div>
                  <p style={{ margin: '0 0 4px', fontSize: '10px', color: '#cbd5e1', lineHeight: '1.4' }}>
                    Transmits artificial GPS/GLONASS/NavIC pseudoranges with subtle clock shifts. Hijacks target autopilot navigation towards a cordoned containment quarantine zone.
                  </p>
                  <span style={{ fontSize: '9px', color: '#fbbf24' }}>Best against: Autonomous waypoint drones, smuggling hexacopters</span>
                </div>

                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#f87171' }}>[W] KINETIC SAM INTERCEPTOR</span>
                    <span style={{ fontSize: '9px', color: '#f87171' }}>HARD-KILL · LIMITED AMMO (6)</span>
                  </div>
                  <p style={{ margin: '0 0 4px', fontSize: '10px', color: '#cbd5e1', lineHeight: '1.4' }}>
                    Solid-fuel rocket motor with radar proximity fuze. Shatters target airframe mid-air. CAUTION: Falling shrapnel poses severe collateral hazard over urban or nuclear complexes!
                  </p>
                  <span style={{ fontSize: '9px', color: '#f87171' }}>Best against: High-speed military UCAVs, kamikaze loitering munitions</span>
                </div>

                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#f87171' }}>[Y] 10kW HIGH-ENERGY LASER DEW</span>
                    <span style={{ fontSize: '9px', color: '#f87171' }}>DIRECTED ENERGY · ZERO COLLATERAL</span>
                  </div>
                  <p style={{ margin: '0 0 4px', fontSize: '10px', color: '#cbd5e1', lineHeight: '1.4' }}>
                    DRDO-developed fiber laser operating at speed of light. Delivers thermal burn of composite airframes or destroys onboard optical seekers without explosive blast.
                  </p>
                  <span style={{ fontSize: '9px', color: '#f87171' }}>Best against: Critical infrastructure zones (refineries, atomic plants)</span>
                </div>

                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(192, 132, 252, 0.3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#c084fc' }}>[E] EMP / EW SUITE BURST</span>
                    <span style={{ fontSize: '9px', color: '#c084fc' }}>WIDE-AREA EW · LIMITED CHARGES (4)</span>
                  </div>
                  <p style={{ margin: '0 0 4px', fontSize: '10px', color: '#cbd5e1', lineHeight: '1.4' }}>
                    High-power microwave omnidirectional pulse. Overloads microelectronics and severs inter-drone mesh coordination links simultaneously across all targets.
                  </p>
                  <span style={{ fontSize: '9px', color: '#c084fc' }}>Best against: Autonomous swarm clusters</span>
                </div>

                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(74, 222, 128, 0.3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#4ade80' }}>[R] HOLD FIRE / LOG PASS</span>
                    <span style={{ fontSize: '9px', color: '#4ade80' }}>ROE COMPLIANCE · SPARE AMMO</span>
                  </div>
                  <p style={{ margin: '0 0 4px', fontSize: '10px', color: '#cbd5e1', lineHeight: '1.4' }}>
                    Records contact flight profile and hands off track to civil air traffic control. Eliminates risk of shooting down civilian airliners or friendly defence drones.
                  </p>
                  <span style={{ fontSize: '9px', color: '#4ade80' }}>Best against: Friendly IFF squawks, civilian airliners, decoys</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: OODA DOCTRINE & ROE */}
          {activeTab === 'ooda' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '14px 18px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                <h4 style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: 800, color: '#fbbf24' }}>
                  THE OODA LOOP WORKFLOW (COL. JOHN BOYD / IAF DOCTRINE)
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '10px' }}>
                  <div style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '8px', borderLeft: '3px solid #3b82f6' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#3b82f6' }}>1. OBSERVE</span>
                    <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#cbd5e1', lineHeight: '1.4' }}>
                      Click glowing radar return or press space to lock target blip.
                    </p>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '8px', borderLeft: '3px solid #8b5cf6' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#8b5cf6' }}>2. ORIENT</span>
                    <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#cbd5e1', lineHeight: '1.4' }}>
                      Correlate Radar, RF frequency, Thermal FLIR & Groq AI assessment.
                    </p>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '8px', borderLeft: '3px solid #f59e0b' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#f59e0b' }}>3. DECIDE</span>
                    <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#cbd5e1', lineHeight: '1.4' }}>
                      Classify Type (1/2/3) and Intent (H=Hostile, N=Neutral, F=Friendly).
                    </p>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '8px', borderLeft: '3px solid #22c55e' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#22c55e' }}>4. ACT</span>
                    <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#cbd5e1', lineHeight: '1.4' }}>
                      Select effector [Q/T/W/Y/E/R] and press Enter to neutralize.
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h4 style={{ margin: '0 0 6px', fontSize: '12px', fontWeight: 700, color: '#e2e8f0' }}>HOTKEY SHORTCUTS CHEAT SHEET</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '10px' }}>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px' }}>
                    <span style={{ color: '#fbbf24', fontWeight: 700 }}>[1]</span> Commercial UAS
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px' }}>
                    <span style={{ color: '#fbbf24', fontWeight: 700 }}>[2]</span> Military UCAV
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px' }}>
                    <span style={{ color: '#fbbf24', fontWeight: 700 }}>[3]</span> Swarm Cluster
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px' }}>
                    <span style={{ color: '#ef4444', fontWeight: 700 }}>[H]</span> Hostile Intent
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px' }}>
                    <span style={{ color: '#60a5fa', fontWeight: 700 }}>[N]</span> Neutral Intent
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px' }}>
                    <span style={{ color: '#4ade80', fontWeight: 700 }}>[F]</span> Friendly Intent
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px' }}>
                    <span style={{ color: '#a78bfa', fontWeight: 700 }}>[Enter]</span> Confirm Deploy
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px' }}>
                    <span style={{ color: '#a78bfa', fontWeight: 700 }}>[Esc]</span> Dismiss Panel
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px' }}>
                    <span style={{ color: '#a78bfa', fontWeight: 700 }}>[P]</span> Pause / Resume
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 24px',
          backgroundColor: '#070b14',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: '10.5px', color: '#64748b',
        }}>
          <div>
            <span>References: DRDO D-4 C-UAS Standard · IAF Doctrine 2022 · NACIN SOP 2023 · MoD Air Defence Standard</span>
          </div>
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#f59e0b', color: '#090d16',
              fontWeight: 800, padding: '6px 16px', borderRadius: '6px',
              border: 'none', cursor: 'pointer', fontSize: '11px',
            }}
          >
            Acknowledge Doctrine & Resume Sortie →
          </button>
        </div>
      </div>
    </div>
  );
}
