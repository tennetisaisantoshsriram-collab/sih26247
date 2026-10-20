import { Session } from '@/types';

export interface AchievementDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  check: (session: Session, allSessions: Session[]) => boolean;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: 'first-neutralize',
    name: 'First Intercept',
    icon: '🎯',
    description: 'Successfully neutralise your first drone threat',
    check: (s) => s.decisions.some(d => d.correct),
  },
  {
    id: 'perfect-mission',
    name: 'Flawless Engagement',
    icon: '⭐',
    description: 'Complete a mission with 100% classification accuracy and zero breaches',
    check: (s) =>
      s.decisions.length > 0 &&
      s.decisions.every(d => d.correct) &&
      (s.breachCount ?? 0) === 0,
  },
  {
    id: 'ironclad',
    name: 'Asset Integrity',
    icon: '🛡️',
    description: 'Complete a mission with base health at 100% (3+ engagements)',
    check: (s) => (s.baseHealth ?? 0) === 100 && s.decisions.length >= 3,
  },
  {
    id: 'speed-demon',
    name: 'Rapid Response',
    icon: '⚡',
    description: 'Classify and deploy a correct countermeasure in under 2 seconds',
    check: (s) => s.decisions.some(d => d.correct && d.responseTimeMs < 2000),
  },
  {
    id: 'no-fratricide-5',
    name: 'No-Fratricide Record',
    icon: '🕊️',
    description: 'Complete 5 consecutive missions without engaging a neutral or friendly asset',
    check: (_, all) => {
      const recent5 = all.slice(-5);
      if (recent5.length < 5) return false;
      return recent5.every(s =>
        s.decisions.every(d => !(d.intent !== 'hostile' && d.classifiedIntent === 'hostile'))
      );
    },
  },
  {
    id: 'swarm-master',
    name: 'Swarm Specialist',
    icon: '🟣',
    description: 'Correctly identify and neutralise 10 swarm threats across all training sessions',
    check: (_, all) =>
      all.flatMap(s => s.decisions).filter(d => d.threatType === 'swarm' && d.correct).length >= 10,
  },
  {
    id: 'ai-skeptic',
    name: 'Independent Assessment',
    icon: '🧠',
    description: 'Correctly classify 5 threats where the AI assessment was incorrect',
    check: (_, all) =>
      all.flatMap(s => s.decisions).filter(d => d.followedAI === false && d.correct).length >= 5,
  },
  {
    id: 'veteran',
    name: 'Field Experience',
    icon: '🏅',
    description: 'Complete 10 training sorties',
    check: (_, all) => all.length >= 10,
  },
  {
    id: 'tier-1-clear',
    name: 'Punjab Sector Clear',
    icon: '🟢',
    description: 'Complete all Punjab sector scenarios (1–200)',
    check: (_, all) => {
      const completed = new Set(all.map(s => s.level));
      return Array.from({ length: 200 }, (_, i) => i + 1).every(l => completed.has(l));
    },
  },
  {
    id: 'tier-2-clear',
    name: 'J&K LoC Clear',
    icon: '🔵',
    description: 'Complete all J&K LoC sector scenarios (201–400)',
    check: (_, all) => {
      const completed = new Set(all.map(s => s.level));
      return Array.from({ length: 200 }, (_, i) => i + 201).every(l => completed.has(l));
    },
  },
  {
    id: 'tier-3-clear',
    name: 'Ladakh LAC Clear',
    icon: '🟡',
    description: 'Complete all Ladakh LAC scenarios (401–600)',
    check: (_, all) => {
      const completed = new Set(all.map(s => s.level));
      return Array.from({ length: 200 }, (_, i) => i + 401).every(l => completed.has(l));
    },
  },
  {
    id: 'tier-4-clear',
    name: 'Arabian Sea Clear',
    icon: '🟠',
    description: 'Complete all Rajasthan/Arabian Sea scenarios (601–800)',
    check: (_, all) => {
      const completed = new Set(all.map(s => s.level));
      return Array.from({ length: 200 }, (_, i) => i + 601).every(l => completed.has(l));
    },
  },
  {
    id: 'capital-defender',
    name: 'Capital Defender',
    icon: '🔴',
    description: 'Complete all NCR multi-vector scenarios (801–1000)',
    check: (_, all) => {
      const completed = new Set(all.map(s => s.level));
      return Array.from({ length: 200 }, (_, i) => i + 801).every(l => completed.has(l));
    },
  },
];

function achievementsKey(): string {
  if (typeof window === 'undefined') return 'droneshield-achievements';
  const id = localStorage.getItem('droneshield-active-profile-id');
  return id ? `droneshield-achievements-${id}` : 'droneshield-achievements';
}

export function getEarnedAchievements(): string[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(achievementsKey());
  return raw ? JSON.parse(raw) : [];
}

export function checkAndEarnAchievements(session: Session, allSessions: Session[]): AchievementDef[] {
  const key = achievementsKey();
  const alreadyEarned = new Set(getEarnedAchievements());
  const newlyEarned: AchievementDef[] = [];

  for (const def of ACHIEVEMENT_DEFS) {
    if (!alreadyEarned.has(def.id) && def.check(session, allSessions)) {
      newlyEarned.push(def);
      alreadyEarned.add(def.id);
    }
  }

  if (newlyEarned.length > 0) {
    localStorage.setItem(key, JSON.stringify(Array.from(alreadyEarned)));
  }

  return newlyEarned;
}
