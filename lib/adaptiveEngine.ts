import { ThreatType } from '@/types';
import { Session } from '@/types';

export interface WeaknessProfile {
  commercial: number; // 0–100 accuracy %
  military: number;
  swarm: number;
}

export interface CoachingReport {
  focusAreas: string[];
  tacticalAdvice: string;
  drillRecommendation: string;
  mentalModel: string;
}

function weaknessKey(): string {
  if (typeof window === 'undefined') return 'droneshield-weakness-profile';
  const id = localStorage.getItem('droneshield-active-profile-id');
  return id ? `droneshield-weakness-profile-${id}` : 'droneshield-weakness-profile';
}

export function getWeaknessProfile(): WeaknessProfile {
  if (typeof window === 'undefined') return { commercial: 50, military: 50, swarm: 50 };
  const raw = localStorage.getItem(weaknessKey());
  if (!raw) return { commercial: 50, military: 50, swarm: 50 };
  try {
    return JSON.parse(raw);
  } catch {
    return { commercial: 50, military: 50, swarm: 50 };
  }
}

export function updateWeaknessProfile(sessions: Session[]): WeaknessProfile {
  const recent = sessions.slice(-20);
  const byType = (t: ThreatType): number => {
    const ds = recent.flatMap(s => s.decisions).filter(d => d.threatType === t);
    if (!ds.length) return 50;
    return Math.round((ds.filter(d => d.correct).length / ds.length) * 100);
  };
  const profile: WeaknessProfile = {
    commercial: byType('commercial'),
    military: byType('military'),
    swarm: byType('swarm'),
  };
  if (typeof window !== 'undefined') {
    localStorage.setItem(weaknessKey(), JSON.stringify(profile));
  }
  return profile;
}

/**
 * Returns a type from availableTypes weighted toward weak areas.
 * Weak type (acc=20) → weight 80. Strong type (acc=90) → weight 10.
 */
export function getAdaptiveTypeWeights(
  availableTypes: ThreatType[],
  profile: WeaknessProfile,
): ThreatType {
  if (!availableTypes.length) return 'commercial';
  const weights = availableTypes.map(t => Math.max(1, 100 - (profile[t] ?? 50)));
  const total = weights.reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  for (let i = 0; i < availableTypes.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return availableTypes[i];
  }
  return availableTypes[availableTypes.length - 1];
}

export function getWeakAreas(profile: WeaknessProfile): Array<{ type: ThreatType; accuracy: number }> {
  return (['commercial', 'military', 'swarm'] as ThreatType[])
    .map(t => ({ type: t, accuracy: profile[t] }))
    .filter(a => a.accuracy < 70)
    .sort((a, b) => a.accuracy - b.accuracy);
}
