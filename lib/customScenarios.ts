import type { ThreatType, Weather } from '@/types';

export interface CustomScenario {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  /** Which sector/target to use. Maps to the first level of each tier (1, 26, 51, 76, 101). */
  baseLevel: 1 | 26 | 51 | 76 | 101;
  timeLimit: number;      // seconds (60–300)
  threatQuota: number;    // 3–20
  types: ThreatType[];
  nightMode: boolean;
  decoys: boolean;
  weather: Weather;
  sensorDegradation: boolean;
}

const KEY = 'droneshield-custom-scenarios';

export function getCustomScenarios(): CustomScenario[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); }
  catch { return []; }
}

export function saveCustomScenario(s: CustomScenario): void {
  const all = getCustomScenarios();
  const idx = all.findIndex(x => x.id === s.id);
  if (idx >= 0) all[idx] = s; else all.push(s);
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function deleteCustomScenario(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(getCustomScenarios().filter(s => s.id !== id)));
}
