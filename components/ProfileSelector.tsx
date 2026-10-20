'use client';
import { useState, useRef, useEffect } from 'react';
import {
  getProfiles, addProfile, verifyAndActivateProfile,
  getActiveProfileId, type MultiProfile, type TraineeProfile,
} from '@/lib/storage';

interface Props {
  onSelect: () => void;
  onCancel?: () => void;
  defaultPortal?: 'trainee' | 'instructor';
}

const CYAN  = '#06b6d4';
const AMBER = '#f59e0b';

const FLD: React.CSSProperties = {
  width: '100%', backgroundColor: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px',
  color: '#fff', fontSize: '13px', padding: '8px 12px',
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
};

function lbl(color: string): React.CSSProperties {
  return {
    display: 'block', fontSize: '9px', fontWeight: 700,
    letterSpacing: '0.12em', textTransform: 'uppercase',
    marginBottom: '5px', color,
  };
}

const BRANCH_RANKS: Record<string, string[]> = {
  'IAF':     ['Fg Offr', 'Flt Lt', 'Sqn Ldr', 'Wg Cdr', 'Gp Capt', 'MWO', 'WO', 'Sgt'],
  'ARMY-AD': ['Lt', 'Capt', 'Maj', 'Lt Col', 'Col', 'Sub Maj', 'Sub', 'Nb Sub', 'Hav'],
  'NAVY':    ['Sub Lt', 'Lt', 'Lt Cdr', 'Cdr', 'Capt (IN)', 'MCPO I', 'CPO'],
};
const DS_RANKS = ['Sqn Ldr', 'Wg Cdr', 'Gp Capt', 'Air Cmde', 'Maj', 'Lt Col', 'Col', 'Brig', 'Cdr', 'Capt (IN)'];
const BRANCH_COLORS: Record<string, string> = {
  IAF: '#06b6d4', 'ARMY-AD': '#4ade80', NAVY: '#60a5fa', IDS: '#f59e0b',
};
const PRESET_UNITS = [
  '101 C-UAS Sqn (IACCS)', '14 Air Defence Regt',
  '28 SAM Sqn (Akash)', 'INS Dwarka Naval AD Unit', 'Western Air Command EW Unit',
];
const PRESET_BASES = [
  'Pathankot AFS (WAC)', 'Srinagar AFS (WAC)', 'Leh Airbase (LAC)',
  'Jaisalmer AFS (SWAC)', 'INS Dwarka (WNC)', 'Hindon AFS (NCR ADZ)',
];

// ── 6-cell PIN visual input ──────────────────────────────────────────────────
function PinInput({ value, onChange, color, autoFocus }: {
  value: string; onChange: (v: string) => void; color: string; autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div
      style={{ display: 'inline-flex', gap: '6px', cursor: 'text', position: 'relative' }}
      onClick={() => ref.current?.focus()}
    >
      {/* Invisible capture input */}
      <input
        ref={ref}
        autoFocus={autoFocus}
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        maxLength={6}
        inputMode="numeric"
        autoComplete="off"
        aria-label="6-digit PIN"
        style={{
          position: 'absolute', opacity: 0, top: 0, left: 0,
          width: '100%', height: '100%', cursor: 'text',
          border: 'none', background: 'transparent', outline: 'none',
        }}
      />
      {[0, 1, 2, 3, 4, 5].map(i => {
        const filled = i < value.length;
        const active = focused && i === value.length;
        return (
          <div key={i} style={{
            width: '40px', height: '48px', borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: filled ? '20px' : '16px', color,
            backgroundColor: filled ? `${color}15` : 'rgba(255,255,255,0.04)',
            border: `2px solid ${active ? color : filled ? color + '70' : 'rgba(255,255,255,0.1)'}`,
            boxShadow: active ? `0 0 0 3px ${color}20` : 'none',
            userSelect: 'none', transition: 'all 0.1s',
          }}>
            {filled ? '●' : active ? '|' : ''}
          </div>
        );
      })}
    </div>
  );
}

export default function ProfileSelector({ onSelect, onCancel, defaultPortal = 'trainee' }: Props) {
  const [profiles, setProfiles] = useState<MultiProfile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [portal, setPortal] = useState<'trainee' | 'instructor'>(defaultPortal);
  const [traineeTab, setTraineeTab] = useState<'login' | 'register'>('login');

  // Trainee login state
  const [svcNo, setSvcNo]         = useState('');
  const [loginPin, setLoginPin]   = useState('');
  const [loginError, setLoginError] = useState('');

  // Trainee register state
  const [reg, setReg] = useState<{
    branch: 'IAF' | 'ARMY-AD' | 'NAVY' | '';
    rank: string; serviceNo: string; name: string; unit: string; base: string;
    courseCode: string; clearance: string; pin: string; confirmPin: string;
  }>({
    branch: '', rank: '', serviceNo: '', name: '', unit: '', base: '',
    courseCode: 'DSSC-CUAS-79', clearance: 'SECRET · LEVEL-2 TACTICAL', pin: '', confirmPin: '',
  });
  const [regError, setRegError] = useState('');

  // DS auth state
  const [dsId, setDsId]     = useState('');
  const [dsPin, setDsPin]   = useState('');
  const [dsError, setDsError] = useState('');

  // DS register accordion
  const [dsRegOpen, setDsRegOpen] = useState(false);
  const [dsReg, setDsReg] = useState({ rank: '', serviceNo: '', name: '', unit: '', pin: '', confirmPin: '' });
  const [dsRegError, setDsRegError] = useState('');

  useEffect(() => {
    setProfiles(getProfiles());
    setActiveId(getActiveProfileId());
  }, []);

  function refresh() { setProfiles(getProfiles()); setActiveId(getActiveProfileId()); }

  // ── Trainee login ──────────────────────────────────────────────────────────
  function handleLogin() {
    setLoginError('');
    const match = profiles.find(p =>
      p.serviceNo.trim().toLowerCase() === svcNo.trim().toLowerCase()
    );
    if (!match) { setLoginError('Service ID not found in Armed Forces roster.'); return; }
    if (match.role === 'instructor') {
      setLoginError('Directing Staff must use the DS Portal (🎖 tab above).'); return;
    }
    const ok = verifyAndActivateProfile(match.id, loginPin);
    if (!ok) { setLoginError('Incorrect 6-digit security PIN.'); setLoginPin(''); return; }
    refresh(); onSelect();
  }

  function demoSignIn(id: string) {
    const p = profiles.find(x => x.id === id);
    if (!p) return;
    verifyAndActivateProfile(id, p.pin);
    onSelect();
  }

  // ── Trainee register ───────────────────────────────────────────────────────
  function handleRegister() {
    setRegError('');
    if (!reg.branch)           { setRegError('Select a Service Branch.'); return; }
    if (!reg.rank)             { setRegError('Select a Military Rank.'); return; }
    if (!reg.serviceNo.trim()) { setRegError('Service Number is required.'); return; }
    if (!reg.name.trim())      { setRegError('Officer Name is required.'); return; }
    if (!reg.unit.trim())      { setRegError('Unit is required.'); return; }
    if (!reg.base.trim())      { setRegError('Assigned Sector / Base is required.'); return; }
    if (profiles.some(p => p.serviceNo.trim().toLowerCase() === reg.serviceNo.trim().toLowerCase())) {
      setRegError('Service Number already exists in roster.'); return;
    }
    if (!/^\d{6}$/.test(reg.pin))   { setRegError('PIN must be exactly 6 digits.'); return; }
    if (reg.pin !== reg.confirmPin) { setRegError('PINs do not match.'); return; }
    const profile: TraineeProfile = {
      name: reg.name.trim(), rank: reg.rank,
      serviceNo: reg.serviceNo.trim().toUpperCase(),
      unit: reg.unit.trim(), base: reg.base.trim(),
      role: 'trainee',
      branch: reg.branch as 'IAF' | 'ARMY-AD' | 'NAVY',
      courseCode: reg.courseCode, clearance: reg.clearance,
    };
    const np = addProfile(profile, reg.pin);
    verifyAndActivateProfile(np.id, reg.pin);
    onSelect();
  }

  // ── DS portal auth ─────────────────────────────────────────────────────────
  function handleDsAuth(dest: 'instructor' | 'home') {
    setDsError('');
    const match = profiles.find(p =>
      p.serviceNo.trim().toLowerCase() === dsId.trim().toLowerCase()
    );
    if (!match) { setDsError('DS Service ID not found.'); return; }
    if (match.role !== 'instructor') {
      setDsError('This ID belongs to a Trainee. Use Tactical Operator Portal.'); return;
    }
    const ok = verifyAndActivateProfile(match.id, dsPin);
    if (!ok) { setDsError('Incorrect 6-digit Command PIN.'); setDsPin(''); return; }
    refresh();
    if (dest === 'instructor') { window.location.href = '/instructor'; }
    else { onSelect(); }
  }

  function dsDemoAuth(id: string, dest: 'instructor' | 'home') {
    const p = profiles.find(x => x.id === id);
    if (!p) return;
    verifyAndActivateProfile(id, p.pin);
    if (dest === 'instructor') { window.location.href = '/instructor'; }
    else { onSelect(); }
  }

  // ── DS register ────────────────────────────────────────────────────────────
  function handleDsRegister() {
    setDsRegError('');
    if (!dsReg.rank)             { setDsRegError('Select a Rank.'); return; }
    if (!dsReg.serviceNo.trim()) { setDsRegError('DS Service ID is required.'); return; }
    if (!dsReg.name.trim())      { setDsRegError('Name is required.'); return; }
    if (profiles.some(p => p.serviceNo.trim().toLowerCase() === dsReg.serviceNo.trim().toLowerCase())) {
      setDsRegError('Service ID already registered.'); return;
    }
    if (!/^\d{6}$/.test(dsReg.pin))      { setDsRegError('PIN must be exactly 6 digits.'); return; }
    if (dsReg.pin !== dsReg.confirmPin)  { setDsRegError('PINs do not match.'); return; }
    const profile: TraineeProfile = {
      name: dsReg.name.trim(), rank: dsReg.rank,
      serviceNo: dsReg.serviceNo.trim().toUpperCase(),
      unit: dsReg.unit.trim() || 'Directing Staff Faculty',
      base: 'Integrated Air Command HQ',
      role: 'instructor', branch: 'IDS',
      courseCode: 'DS-EVALUATOR',
      clearance: 'TOP SECRET · LEVEL-5 DIRECTING STAFF',
    };
    const np = addProfile(profile, dsReg.pin);
    verifyAndActivateProfile(np.id, dsReg.pin);
    window.location.href = '/instructor';
  }

  const traineeProfiles    = profiles.filter(p => p.role !== 'instructor');
  const instructorProfiles = profiles.filter(p => p.role === 'instructor');
  const accentColor        = portal === 'trainee' ? CYAN : AMBER;

  const portalBtnStyle = (active: boolean, color: string): React.CSSProperties => ({
    flex: 1, padding: '13px 8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
    backgroundColor: active ? `${color}14` : 'transparent',
    color: active ? color : '#4b5563',
    fontSize: '10px', fontWeight: 800, letterSpacing: '0.06em',
    borderBottom: active ? `2px solid ${color}` : '2px solid transparent',
    transition: 'all 0.12s',
  });
  const subTabStyle = (active: boolean, color: string): React.CSSProperties => ({
    padding: '8px 14px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
    backgroundColor: active ? `${color}12` : 'transparent',
    color: active ? color : '#6b7280',
    fontSize: '9px', fontWeight: 800, letterSpacing: '0.08em',
    borderRadius: '6px', transition: 'all 0.12s',
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      backgroundColor: 'rgba(2,6,15,0.97)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        maxWidth: '900px', width: '100%', maxHeight: '92vh',
        backgroundColor: '#060d1a',
        border: `1px solid ${accentColor}40`,
        borderRadius: '16px', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        boxShadow: `0 0 80px ${accentColor}10`,
        transition: 'border-color 0.3s, box-shadow 0.3s',
      }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{ padding: '16px 24px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <p style={{ margin: 0, fontSize: '8px', color: accentColor, fontWeight: 800, letterSpacing: '0.22em' }}>
                MINISTRY OF DEFENCE · IACCS NODE ONLINE · AES-256 PIN-VERIFIED
              </p>
              <h2 style={{ margin: '4px 0 0', fontSize: '17px', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
                C-UAS IDENTITY &amp; CLEARANCE TERMINAL
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '8px', color: '#374151', letterSpacing: '0.1em' }}>
                IDAS-C4I · DRDO / IAF C-UAS · DSSC WELLINGTON · INTEGRATED AIR COMMAND
              </p>
            </div>
            {onCancel && activeId && (
              <button onClick={onCancel} style={{
                background: 'none', border: '1px solid rgba(255,255,255,0.1)',
                color: '#6b7280', borderRadius: '8px', padding: '6px 12px',
                fontSize: '10px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                ← CONTINUE
              </button>
            )}
          </div>
          {/* Portal switcher */}
          <div style={{ display: 'flex' }}>
            <button onClick={() => setPortal('trainee')} style={portalBtnStyle(portal === 'trainee', CYAN)}>
              🎯 TACTICAL OPERATOR PORTAL (TRAINEE)
            </button>
            <button onClick={() => setPortal('instructor')} style={portalBtnStyle(portal === 'instructor', AMBER)}>
              🎖 DIRECTING STAFF / INSTRUCTOR PORTAL (DSSC COMMAND)
            </button>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* ════ TRAINEE PORTAL ════════════════════════════════════════════ */}
          {portal === 'trainee' && (
            <div>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
                <button onClick={() => setTraineeTab('login')} style={subTabStyle(traineeTab === 'login', CYAN)}>
                  🔐 OPERATOR LOGIN (SERVICE ID &amp; 6-DIGIT PIN)
                </button>
                <button onClick={() => setTraineeTab('register')} style={subTabStyle(traineeTab === 'register', CYAN)}>
                  📋 REGISTER ARMED FORCES OPERATOR (NEW COMMISSION)
                </button>
              </div>

              {/* ── LOGIN TAB ─────────────────────────────────────────── */}
              {traineeTab === 'login' && (
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                  {/* Form */}
                  <div style={{ flex: '0 0 300px', minWidth: '260px' }}>
                    <div style={{ backgroundColor: `${CYAN}07`, border: `1px solid ${CYAN}20`, borderRadius: '10px', padding: '18px' }}>
                      <p style={{ margin: '0 0 14px', fontSize: '9px', color: CYAN, fontWeight: 800, letterSpacing: '0.15em' }}>
                        ARMED FORCES SERVICE AUTHENTICATION
                      </p>
                      <div style={{ marginBottom: '14px' }}>
                        <label style={lbl(CYAN)}>Service ID / Service Number</label>
                        <input
                          placeholder="e.g. IAF-28401-F · IC-74920-M · IN-05812-Z"
                          value={svcNo}
                          onChange={e => { setSvcNo(e.target.value); setLoginError(''); }}
                          onKeyDown={e => e.key === 'Enter' && handleLogin()}
                          style={{ ...FLD, border: `1px solid ${CYAN}30` }}
                        />
                      </div>
                      <div style={{ marginBottom: '16px' }}>
                        <label style={lbl(CYAN)}>6-Digit Military Security PIN</label>
                        <PinInput
                          value={loginPin}
                          onChange={v => { setLoginPin(v); setLoginError(''); }}
                          color={CYAN}
                        />
                      </div>
                      {loginError && (
                        <p style={{ margin: '0 0 12px', fontSize: '11px', color: '#ef4444', fontWeight: 700 }}>
                          &#9888; {loginError}
                        </p>
                      )}
                      <button
                        onClick={handleLogin}
                        disabled={loginPin.length !== 6 || !svcNo.trim()}
                        style={{
                          width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
                          backgroundColor: loginPin.length === 6 && svcNo.trim() ? CYAN : 'rgba(255,255,255,0.05)',
                          color: loginPin.length === 6 && svcNo.trim() ? '#030d1a' : '#374151',
                          fontSize: '11px', fontWeight: 800, letterSpacing: '0.04em', fontFamily: 'inherit',
                          cursor: loginPin.length === 6 && svcNo.trim() ? 'pointer' : 'not-allowed',
                          transition: 'all 0.15s',
                        }}
                      >
                        AUTHENTICATE &amp; ENTER C2 CONSOLE &#8594;
                      </button>
                    </div>
                  </div>

                  {/* Roster */}
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <p style={{ margin: '0 0 10px', fontSize: '9px', color: '#4b5563', fontWeight: 700, letterSpacing: '0.1em' }}>
                      REGISTERED UNIT OPERATORS — CLICK TO AUTO-FILL SERVICE ID
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      {traineeProfiles.map(p => (
                        <div key={p.id} style={{
                          backgroundColor: p.id === activeId ? `${CYAN}07` : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${p.id === activeId ? CYAN + '30' : 'rgba(255,255,255,0.07)'}`,
                          borderRadius: '10px', padding: '10px 12px',
                          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px',
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', marginBottom: '2px' }}>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>
                                {p.rank} {p.name}
                              </span>
                              {p.branch && (
                                <span style={{
                                  fontSize: '8px', fontWeight: 800, padding: '1px 5px', borderRadius: '3px',
                                  letterSpacing: '0.05em',
                                  color: BRANCH_COLORS[p.branch] ?? '#9ca3af',
                                  backgroundColor: `${BRANCH_COLORS[p.branch] ?? '#9ca3af'}15`,
                                  border: `1px solid ${BRANCH_COLORS[p.branch] ?? '#9ca3af'}30`,
                                }}>
                                  {p.branch}
                                </span>
                              )}
                              {p.id === activeId && (
                                <span style={{ fontSize: '8px', fontWeight: 800, color: CYAN, backgroundColor: CYAN + '12', border: `1px solid ${CYAN}30`, borderRadius: '3px', padding: '1px 5px', letterSpacing: '0.05em' }}>
                                  ACTIVE
                                </span>
                              )}
                            </div>
                            <p style={{ margin: 0, fontSize: '9px', color: '#6b7280', fontFamily: 'monospace' }}>
                              {p.serviceNo} · {p.unit}
                            </p>
                            <p style={{ margin: '1px 0 0', fontSize: '9px', color: '#374151', fontFamily: 'monospace' }}>
                              {p.base} · <span style={{ color: '#4b5563' }}>{p.clearance ?? 'SECRET · LEVEL-2'}</span>
                            </p>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
                            <button
                              onClick={() => { setSvcNo(p.serviceNo); setLoginError(''); }}
                              style={{
                                backgroundColor: CYAN + '10', border: `1px solid ${CYAN}25`,
                                color: CYAN, fontSize: '9px', fontWeight: 700, padding: '5px 8px',
                                borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em',
                              }}
                            >
                              SELECT ID
                            </button>
                            <button
                              onClick={() => demoSignIn(p.id)}
                              style={{
                                backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                                color: '#f59e0b', fontSize: '9px', fontWeight: 700, padding: '5px 8px',
                                borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em',
                              }}
                            >
                              &#9889; DEMO
                            </button>
                          </div>
                        </div>
                      ))}
                      {traineeProfiles.length === 0 && (
                        <p style={{ fontSize: '11px', color: '#374151' }}>No trainee profiles registered yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── REGISTER TAB ──────────────────────────────────────── */}
              {traineeTab === 'register' && (
                <div style={{ maxWidth: '600px' }}>
                  <div style={{ backgroundColor: CYAN + '06', border: `1px solid ${CYAN}18`, borderRadius: '12px', padding: '20px' }}>
                    <p style={{ margin: '0 0 16px', fontSize: '9px', color: CYAN, fontWeight: 800, letterSpacing: '0.15em' }}>
                      NEW ARMED FORCES OPERATOR COMMISSION — STRICTLY MILITARY PERSONNEL ONLY
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

                      {/* Branch selector */}
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={lbl(CYAN)}>Service Branch *</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {(['IAF', 'ARMY-AD', 'NAVY'] as const).map(b => (
                            <button key={b} onClick={() => setReg(r => ({ ...r, branch: b, rank: '' }))}
                              style={{
                                flex: 1, padding: '10px 6px',
                                backgroundColor: reg.branch === b ? `${BRANCH_COLORS[b]}18` : 'rgba(255,255,255,0.04)',
                                border: `2px solid ${reg.branch === b ? BRANCH_COLORS[b] : 'rgba(255,255,255,0.1)'}`,
                                color: reg.branch === b ? BRANCH_COLORS[b] : '#6b7280',
                                borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit',
                                fontSize: '10px', fontWeight: 800, letterSpacing: '0.05em',
                              }}>
                              {b === 'IAF' ? '&#9992; IAF' : b === 'ARMY-AD' ? '&#128737; ARMY-AD' : '&#9875; NAVY'}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label style={lbl(CYAN)}>Military Rank *</label>
                        <select
                          value={reg.rank}
                          onChange={e => setReg(r => ({ ...r, rank: e.target.value }))}
                          disabled={!reg.branch}
                          style={{ ...FLD, border: `1px solid ${CYAN}25`, color: reg.rank ? '#fff' : '#6b7280', opacity: reg.branch ? 1 : 0.4 }}
                        >
                          <option value="" style={{ background: '#0d1a2d' }}>Select rank</option>
                          {(BRANCH_RANKS[reg.branch] ?? []).map(r => (
                            <option key={r} value={r} style={{ background: '#0d1a2d' }}>{r}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={lbl(CYAN)}>Service Number *</label>
                        <input
                          placeholder={
                            reg.branch === 'IAF' ? 'IAF-30492-F' :
                            reg.branch === 'ARMY-AD' ? 'IC-81204-P' :
                            reg.branch === 'NAVY' ? 'IN-09421-W' : 'e.g. IAF-30492-F'
                          }
                          value={reg.serviceNo}
                          onChange={e => { setReg(r => ({ ...r, serviceNo: e.target.value })); setRegError(''); }}
                          style={{ ...FLD, border: `1px solid ${CYAN}25` }}
                        />
                      </div>

                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={lbl(CYAN)}>Officer / Operator Full Name *</label>
                        <input
                          placeholder="e.g. Priya Menon"
                          value={reg.name}
                          onChange={e => { setReg(r => ({ ...r, name: e.target.value })); setRegError(''); }}
                          style={{ ...FLD, border: `1px solid ${CYAN}25` }}
                        />
                      </div>

                      <div>
                        <label style={lbl(CYAN)}>C-UAS Squadron / AD Regiment *</label>
                        <input
                          list="cuas-units"
                          placeholder="Select or type..."
                          value={reg.unit}
                          onChange={e => { setReg(r => ({ ...r, unit: e.target.value })); setRegError(''); }}
                          style={{ ...FLD, border: `1px solid ${CYAN}25` }}
                        />
                        <datalist id="cuas-units">
                          {PRESET_UNITS.map(u => <option key={u} value={u} />)}
                        </datalist>
                      </div>

                      <div>
                        <label style={lbl(CYAN)}>Assigned Sector / Forward Base *</label>
                        <input
                          list="cuas-bases"
                          placeholder="Select or type..."
                          value={reg.base}
                          onChange={e => { setReg(r => ({ ...r, base: e.target.value })); setRegError(''); }}
                          style={{ ...FLD, border: `1px solid ${CYAN}25` }}
                        />
                        <datalist id="cuas-bases">
                          {PRESET_BASES.map(b => <option key={b} value={b} />)}
                        </datalist>
                      </div>

                      <div>
                        <label style={lbl('#4b5563')}>Course / Batch Code</label>
                        <input
                          value={reg.courseCode}
                          onChange={e => setReg(r => ({ ...r, courseCode: e.target.value }))}
                          style={{ ...FLD, border: '1px solid rgba(255,255,255,0.1)' }}
                        />
                      </div>

                      <div>
                        <label style={lbl('#4b5563')}>Security Clearance</label>
                        <select
                          value={reg.clearance}
                          onChange={e => setReg(r => ({ ...r, clearance: e.target.value }))}
                          style={{ ...FLD, border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                          <option value="SECRET · LEVEL-2 TACTICAL" style={{ background: '#0d1a2d' }}>SECRET · LEVEL-2 TACTICAL</option>
                          <option value="TOP SECRET · LEVEL-3 SECTOR OPS" style={{ background: '#0d1a2d' }}>TOP SECRET · LEVEL-3 SECTOR OPS</option>
                        </select>
                      </div>

                      <div>
                        <label style={lbl(CYAN)}>6-Digit Security PIN *</label>
                        <PinInput value={reg.pin} onChange={v => { setReg(r => ({ ...r, pin: v })); setRegError(''); }} color={CYAN} />
                      </div>

                      <div>
                        <label style={lbl(CYAN)}>Confirm 6-Digit PIN *</label>
                        <PinInput value={reg.confirmPin} onChange={v => { setReg(r => ({ ...r, confirmPin: v })); setRegError(''); }} color={CYAN} />
                      </div>

                      {regError && (
                        <p style={{ gridColumn: '1 / -1', margin: 0, fontSize: '11px', color: '#ef4444', fontWeight: 700 }}>
                          &#9888; {regError}
                        </p>
                      )}

                      <div style={{ gridColumn: '1 / -1' }}>
                        <button onClick={handleRegister} style={{
                          backgroundColor: CYAN, color: '#030d1a', fontWeight: 800,
                          padding: '13px 28px', borderRadius: '999px', border: 'none',
                          cursor: 'pointer', fontSize: '12px', letterSpacing: '0.04em', fontFamily: 'inherit',
                        }}>
                          COMMISSION OPERATOR PROFILE &#8594;
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════ INSTRUCTOR PORTAL ═════════════════════════════════════════ */}
          {portal === 'instructor' && (
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>

              {/* Left: DS Auth + Register */}
              <div style={{ flex: '0 0 340px', minWidth: '280px' }}>
                <div style={{ backgroundColor: AMBER + '08', border: `1px solid ${AMBER}25`, borderRadius: '12px', padding: '18px', marginBottom: '14px' }}>
                  <p style={{ margin: '0 0 2px', fontSize: '8px', color: AMBER, fontWeight: 800, letterSpacing: '0.2em' }}>
                    DSSC WELLINGTON · INTEGRATED AIR COMMAND
                  </p>
                  <p style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 800, color: '#fff' }}>
                    DIRECTING STAFF TERMINAL
                  </p>

                  <div style={{ backgroundColor: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.12)', borderRadius: '8px', padding: '10px 12px', marginBottom: '14px' }}>
                    {[
                      '&#10003; ALL 5 OPERATIONAL THEATERS & 1,000 WAVES UNLOCKED',
                      '&#10003; FULL ACCESS TO INSTRUCTOR HQ, COHORT ROSTER & SKILL PASSPORTS',
                      '&#10003; CUSTOM SCENARIO BUILDER & AFTER-ACTION CSV EXPORT',
                    ].map((line, i) => (
                      <p key={i} style={{ margin: i ? '4px 0 0' : 0, fontSize: '9px', color: '#4ade80', fontWeight: 700, letterSpacing: '0.05em' }}
                        dangerouslySetInnerHTML={{ __html: line }} />
                    ))}
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={lbl(AMBER)}>DS Service ID</label>
                    <input
                      placeholder="e.g. DSSC-DS-001 · DSSC-DS-002"
                      value={dsId}
                      onChange={e => { setDsId(e.target.value); setDsError(''); }}
                      style={{ ...FLD, border: `1px solid ${AMBER}30` }}
                    />
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={lbl(AMBER)}>6-Digit Command PIN</label>
                    <PinInput value={dsPin} onChange={v => { setDsPin(v); setDsError(''); }} color={AMBER} />
                  </div>

                  {dsError && (
                    <p style={{ margin: '0 0 12px', fontSize: '11px', color: '#ef4444', fontWeight: 700 }}>
                      &#9888; {dsError}
                    </p>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                      onClick={() => handleDsAuth('instructor')}
                      disabled={dsPin.length !== 6 || !dsId.trim()}
                      style={{
                        width: '100%', padding: '11px', border: 'none', borderRadius: '8px',
                        backgroundColor: dsPin.length === 6 && dsId.trim() ? AMBER : 'rgba(255,255,255,0.05)',
                        color: dsPin.length === 6 && dsId.trim() ? '#030d1a' : '#374151',
                        fontSize: '10px', fontWeight: 800, letterSpacing: '0.04em', fontFamily: 'inherit',
                        cursor: dsPin.length === 6 && dsId.trim() ? 'pointer' : 'not-allowed',
                      }}
                    >
                      &#128202; AUTHENTICATE &amp; OPEN INSTRUCTOR COMMAND HQ
                    </button>
                    <button
                      onClick={() => handleDsAuth('home')}
                      disabled={dsPin.length !== 6 || !dsId.trim()}
                      style={{
                        width: '100%', padding: '11px', border: `1px solid ${dsPin.length === 6 && dsId.trim() ? AMBER + '50' : 'rgba(255,255,255,0.08)'}`,
                        backgroundColor: 'transparent',
                        color: dsPin.length === 6 && dsId.trim() ? AMBER : '#374151',
                        borderRadius: '8px', fontSize: '10px', fontWeight: 800, letterSpacing: '0.04em',
                        cursor: dsPin.length === 6 && dsId.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
                      }}
                    >
                      &#127919; AUTHENTICATE &amp; OPEN TACTICAL BRIEFING (ALL UNLOCKED)
                    </button>
                  </div>
                </div>

                {/* DS Register accordion */}
                <div style={{ border: `1px solid ${AMBER}18`, borderRadius: '10px', overflow: 'hidden' }}>
                  <button
                    onClick={() => setDsRegOpen(v => !v)}
                    style={{
                      width: '100%', padding: '12px 14px', border: 'none',
                      backgroundColor: dsRegOpen ? AMBER + '10' : 'rgba(255,255,255,0.03)',
                      color: dsRegOpen ? AMBER : '#6b7280',
                      textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                      fontSize: '9px', fontWeight: 800, letterSpacing: '0.08em',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                  >
                    <span>+ REGISTER NEW DIRECTING STAFF / EVALUATOR</span>
                    <span>{dsRegOpen ? '&#9650;' : '&#9660;'}</span>
                  </button>
                  {dsRegOpen && (
                    <div style={{ padding: '14px', backgroundColor: AMBER + '04', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div>
                        <label style={lbl(AMBER)}>Rank *</label>
                        <select value={dsReg.rank} onChange={e => setDsReg(r => ({ ...r, rank: e.target.value }))}
                          style={{ ...FLD, border: `1px solid ${AMBER}25` }}>
                          <option value="" style={{ background: '#0d1a2d' }}>Select rank</option>
                          {DS_RANKS.map(r => <option key={r} value={r} style={{ background: '#0d1a2d' }}>{r}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={lbl(AMBER)}>DS Service ID *</label>
                        <input placeholder="e.g. DSSC-DS-003" value={dsReg.serviceNo}
                          onChange={e => { setDsReg(r => ({ ...r, serviceNo: e.target.value })); setDsRegError(''); }}
                          style={{ ...FLD, border: `1px solid ${AMBER}25` }} />
                      </div>
                      <div>
                        <label style={lbl(AMBER)}>Full Name *</label>
                        <input placeholder="e.g. Air Cmde Suresh Iyer" value={dsReg.name}
                          onChange={e => { setDsReg(r => ({ ...r, name: e.target.value })); setDsRegError(''); }}
                          style={{ ...FLD, border: `1px solid ${AMBER}25` }} />
                      </div>
                      <div>
                        <label style={lbl(AMBER)}>Faculty / Unit</label>
                        <input placeholder="e.g. DSSC Wellington Air Defence Faculty" value={dsReg.unit}
                          onChange={e => setDsReg(r => ({ ...r, unit: e.target.value }))}
                          style={{ ...FLD, border: `1px solid ${AMBER}25` }} />
                      </div>
                      <div>
                        <label style={lbl(AMBER)}>6-Digit Command PIN *</label>
                        <PinInput value={dsReg.pin} onChange={v => { setDsReg(r => ({ ...r, pin: v })); setDsRegError(''); }} color={AMBER} />
                      </div>
                      <div>
                        <label style={lbl(AMBER)}>Confirm PIN *</label>
                        <PinInput value={dsReg.confirmPin} onChange={v => { setDsReg(r => ({ ...r, confirmPin: v })); setDsRegError(''); }} color={AMBER} />
                      </div>
                      {dsRegError && (
                        <p style={{ margin: 0, fontSize: '11px', color: '#ef4444', fontWeight: 700 }}>&#9888; {dsRegError}</p>
                      )}
                      <button onClick={handleDsRegister} style={{
                        backgroundColor: AMBER, color: '#030d1a', fontWeight: 800,
                        padding: '11px', borderRadius: '8px', border: 'none',
                        cursor: 'pointer', fontSize: '10px', fontFamily: 'inherit', letterSpacing: '0.04em',
                      }}>
                        COMMISSION DS EVALUATOR PROFILE &#8594;
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Accredited DS quick roster */}
              <div style={{ flex: 1, minWidth: '200px' }}>
                <p style={{ margin: '0 0 10px', fontSize: '9px', color: '#4b5563', fontWeight: 700, letterSpacing: '0.1em' }}>
                  ACCREDITED DIRECTING STAFF — QUICK SELECT ROSTER
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {instructorProfiles.map(p => (
                    <div key={p.id} style={{
                      backgroundColor: p.id === activeId ? AMBER + '07' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${p.id === activeId ? AMBER + '30' : 'rgba(255,255,255,0.07)'}`,
                      borderRadius: '10px', padding: '12px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', marginBottom: '3px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: AMBER }}>
                              {p.rank} {p.name}
                            </span>
                            {p.id === activeId && (
                              <span style={{ fontSize: '8px', fontWeight: 800, color: AMBER, backgroundColor: AMBER + '12', border: `1px solid ${AMBER}30`, borderRadius: '3px', padding: '1px 5px' }}>
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <p style={{ margin: 0, fontSize: '9px', color: '#6b7280', fontFamily: 'monospace' }}>
                            {p.serviceNo} · {p.unit}
                          </p>
                          <p style={{ margin: '1px 0 0', fontSize: '9px', color: '#374151' }}>
                            {p.clearance}
                          </p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
                          <button onClick={() => dsDemoAuth(p.id, 'instructor')} style={{
                            backgroundColor: AMBER + '12', border: `1px solid ${AMBER}30`,
                            color: AMBER, fontSize: '9px', fontWeight: 700, padding: '5px 8px',
                            borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit',
                          }}>
                            &#128202; HQ
                          </button>
                          <button onClick={() => dsDemoAuth(p.id, 'home')} style={{
                            backgroundColor: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)',
                            color: '#06b6d4', fontSize: '9px', fontWeight: 700, padding: '5px 8px',
                            borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit',
                          }}>
                            &#127919; BRIEF
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {instructorProfiles.length === 0 && (
                    <p style={{ fontSize: '11px', color: '#374151' }}>No DS profiles registered.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
