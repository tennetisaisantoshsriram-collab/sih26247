import { Session } from '@/types';

const SESSIONS_KEY = 'drone-sim-sessions';

export function getSessions(): Session[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(SESSIONS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveSession(session: Session): void {
  const sessions = getSessions();
  sessions.push(session);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function clearSessions(): void {
  localStorage.removeItem(SESSIONS_KEY);
}

export function getAllSessions(): Session[] {
  return getSessions();
}

export function getSessionsForProfile(profileId: string): Session[] {
  return getSessions().filter(s => s.profileId === profileId);
}

export interface TraineeProfile {
  name: string;
  rank: string;
  serviceNo: string;
  unit: string;
  base: string;
  role?: 'trainee' | 'instructor';
  clearance?: string;
  branch?: 'IAF' | 'ARMY-AD' | 'NAVY' | 'IDS';
  courseCode?: string;
}

const PROFILE_KEY = 'droneshield-profile';

export function getProfile(): TraineeProfile {
  if (typeof window === 'undefined') return { name: '', rank: '', serviceNo: '', unit: '', base: '' };
  const raw = localStorage.getItem(PROFILE_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch { /* fall through */ }
  }
  // Backward compat: migrate old name-only to profile
  const oldName = localStorage.getItem('droneshield-operator') ?? '';
  return { name: oldName, rank: '', serviceNo: '', unit: '', base: '' };
}

export function saveProfile(profile: TraineeProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  // Keep legacy key in sync so CertificateOverlay still works
  localStorage.setItem('droneshield-operator', profile.name);
}

/**
 * Returns the classification accuracy (0–100) for all sessions
 * played within the given tier's level range.
 * tierNum 0 = Punjab (1–200), 1 = J&K (201–400), etc.
 */
export function getTierAccuracy(tierNum: number): number {
  const activeId = getActiveProfileId();
  const sessions = getSessions().filter(s =>
    !activeId || !s.profileId || s.profileId === activeId
  );
  const lo = tierNum * 25 + 1;
  const hi = (tierNum + 1) * 25;
  const tierSessions = sessions.filter(s => {
    const lvl = s.level ?? 1;
    return lvl >= lo && lvl <= hi;
  });
  const decisions = tierSessions.flatMap(s => s.decisions);
  if (!decisions.length) return 0;
  return Math.round((decisions.filter(d => d.correct).length / decisions.length) * 100);
}

/**
 * A tier is unlocked if:
 *  - It is Tier 0 (always open), OR
 *  - The previous tier's classification accuracy is >= 70%.
 */
export function isTierUnlocked(tierNum: number): boolean {
  if (tierNum === 0) return true;
  if (typeof window !== 'undefined') {
    if (localStorage.getItem('droneshield-unlock-all') !== '0') return true;
    const activeId = getActiveProfileId();
    if (activeId) {
      const profiles = getProfiles();
      const active = profiles.find(p => p.id === activeId);
      if (active?.role === 'instructor') return true;
    }
  }
  return getTierAccuracy(tierNum - 1) >= 70;
}

// ─── Multi-profile support ────────────────────────────────────────────────────

export interface MultiProfile extends TraineeProfile {
  id: string;
  pin: string; // 6-digit string, stored as plaintext (offline, no backend)
}

const PROFILES_KEY = 'droneshield-profiles-v2';
const ACTIVE_PROFILE_KEY = 'droneshield-active-profile-id';

const DEFAULT_PROFILES: MultiProfile[] = [
  { id: 'mod-1', name: 'Vikram Sharma',      rank: 'Sqn Ldr', branch: 'IAF',     serviceNo: 'IAF-28401-F',  unit: '101 C-UAS Sqn (Akash/IACCS)',       base: 'Pathankot AFS (WAC)',       role: 'trainee',    clearance: 'SECRET · LEVEL-2 TACTICAL',               courseCode: 'DSSC-CUAS-79',  pin: '284010' },
  { id: 'mod-2', name: 'Rohan Rathore',      rank: 'Maj',     branch: 'ARMY-AD', serviceNo: 'IC-74920-M',   unit: '14 Air Defence Regt (Corps AD)',     base: 'Leh Forward ADZ (NC)',      role: 'trainee',    clearance: 'SECRET · LEVEL-2 TACTICAL',               courseCode: 'DSSC-CUAS-79',  pin: '749200' },
  { id: 'mod-4', name: 'Karthik Nair',       rank: 'Lt Cdr',  branch: 'NAVY',    serviceNo: 'IN-05812-Z',   unit: 'INS Dwarka Naval Air Defence',       base: 'Okha Maritime ADZ (WNC)',   role: 'trainee',    clearance: 'SECRET · LEVEL-2 TACTICAL',               courseCode: 'DSSC-CUAS-79',  pin: '058120' },
  { id: 'mod-3', name: 'Arjun Dev (DS)',      rank: 'Wg Cdr',  branch: 'IDS',     serviceNo: 'DSSC-DS-001',  unit: 'Directing Staff · DSSC Wellington',  base: 'Integrated Air Command HQ', role: 'instructor', clearance: 'TOP SECRET · LEVEL-5 DIRECTING STAFF',    courseCode: 'DS-EVALUATOR',  pin: '000000' },
  { id: 'mod-5', name: 'Rajeshwar Singh (DS)', rank: 'Col',   branch: 'ARMY-AD', serviceNo: 'DSSC-DS-002',  unit: 'Army Air Defence College Faculty',   base: 'Integrated Air Command HQ', role: 'instructor', clearance: 'TOP SECRET · LEVEL-5 DIRECTING STAFF',    courseCode: 'DS-EVALUATOR',  pin: '111111' },
];

export function ensureDefaultProfiles(): MultiProfile[] {
  if (typeof window === 'undefined') return DEFAULT_PROFILES;
  const raw = localStorage.getItem(PROFILES_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch { /* fall through */ }
  }
  localStorage.setItem(PROFILES_KEY, JSON.stringify(DEFAULT_PROFILES));
  return DEFAULT_PROFILES;
}

export function getProfiles(): MultiProfile[] {
  if (typeof window === 'undefined') return DEFAULT_PROFILES;
  return ensureDefaultProfiles();
}

export function logoutProfile(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACTIVE_PROFILE_KEY);
  localStorage.removeItem(PROFILE_KEY);
  localStorage.removeItem('droneshield-operator');
}

export function getActiveProfileId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_PROFILE_KEY);
}

export function addProfile(profile: TraineeProfile, pin: string): MultiProfile {
  const profiles = getProfiles();
  const newProfile: MultiProfile = { ...profile, id: Date.now().toString(), pin };
  profiles.push(newProfile);
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  return newProfile;
}

export function deleteProfile(id: string): void {
  const profiles = getProfiles().filter(p => p.id !== id);
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  // If deleting the currently active profile, clear all active-profile state
  if (localStorage.getItem(ACTIVE_PROFILE_KEY) === id) {
    localStorage.removeItem(ACTIVE_PROFILE_KEY);
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem('droneshield-operator');
  }
}

export function getActiveProfileSessions(): Session[] {
  const activeId = getActiveProfileId();
  if (!activeId) return getSessions();
  return getSessions().filter(s => !s.profileId || s.profileId === activeId);
}

export function verifyAndActivateProfile(id: string, pin: string): boolean {
  const profiles = getProfiles();
  const found = profiles.find(p => p.id === id);
  if (!found || found.pin !== pin) return false;
  localStorage.setItem(ACTIVE_PROFILE_KEY, id);
  // Sync to existing PROFILE_KEY so rest of app still works
  const { id: _id, pin: _pin, ...traineeProfile } = found;
  void _id; void _pin;
  localStorage.setItem('droneshield-profile', JSON.stringify(traineeProfile));
  localStorage.setItem('droneshield-operator', found.name);
  return true;
}
