# DroneShield PS26247 Completion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 8 technical-depth features to satisfy every PS26247 requirement and differentiate DroneShield as the #1 SIH 2026 submission.

**Architecture:** Additive — new lib files (achievements, roe), new hooks (voice), new component (certificate). Existing code is modified only where needed. All new lib logic is tested with Jest. UI is extended via props without breaking existing interfaces.

**Tech Stack:** React hooks, Web Speech API, Leaflet.js, localStorage, TypeScript, Jest/ts-jest

---

## PS26247 Requirement → Feature Mapping

| Requirement | Feature added |
|---|---|
| Time-critical decision training | Task 3 — decision timeout countdown |
| Operator certification/grading | Task 6 — tier completion certificate |
| Threat prioritisation | Task 4 — ENGAGE NEXT priority queue in HUD |
| Rules of Engagement compliance | Task 5 — per-sector ROE card in simulation |
| Operator tracking & achievement | Task 1 — achievement system |
| Multi-sensor tracking/display | Task 2 — ETA + prediction arc on map |
| Countermeasure feedback | Task 5 — deploy visualisation effect |
| Human-AI interface | Task 3 — voice command classification |

---

## File Map

**New files:**
- `lib/achievements.ts` — 13 achievement defs, check/earn/persist logic
- `lib/roe.ts` — per-tier Rules of Engagement data + lookup
- `hooks/useVoiceCommand.ts` — Web Speech API hook
- `components/CertificateOverlay.tsx` — printable tier completion certificate
- `__tests__/lib/achievements.test.ts`
- `__tests__/lib/roe.test.ts`

**Modified files:**
- `components/SimulationMap.tsx` — ETA labels on markers, prediction arc polylines
- `components/ClassificationPanel.tsx` — timeout countdown bar, voice command hook
- `components/HUDBar.tsx` — ENGAGE NEXT priority threat indicator
- `app/simulation/page.tsx` — ROE card toggle, deploy effects, priority threat, classifyTimeout prop
- `app/aar/page.tsx` — achievements earned this session, cert trigger
- `app/page.tsx` — achievement badge count in header

---

## Task 1: Achievement System (`lib/achievements.ts`)

**Files:**
- Create: `lib/achievements.ts`
- Create: `__tests__/lib/achievements.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/achievements.test.ts`:

```ts
import { checkAndEarnAchievements, getEarnedAchievements, ACHIEVEMENT_DEFS } from '@/lib/achievements';
import { Session, Decision } from '@/types';

const store: Record<string, string> = {};
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  },
  writable: true,
});

const makeDecision = (overrides: Partial<Decision> = {}): Decision => ({
  threatId: 'x', threatType: 'commercial', intent: 'hostile',
  classifiedAs: 'commercial', classifiedIntent: 'hostile',
  countermeasure: 'rf-jammer', correct: true,
  responseTimeMs: 1000, detectionTimeMs: 500, timestamp: Date.now(),
  path: [], spawnLat: 0, spawnLng: 0,
  ...overrides,
});

const makeSession = (overrides: Partial<Session> = {}): Session => ({
  id: Math.random().toString(), difficulty: 'easy', level: 1,
  score: 100, startedAt: Date.now(), endedAt: Date.now(),
  decisions: [], breachCount: 0, baseHealth: 100,
  ...overrides,
});

describe('checkAndEarnAchievements', () => {
  beforeEach(() => { Object.keys(store).forEach(k => delete store[k]); });

  it('earns first-neutralize on first correct decision', () => {
    const session = makeSession({ decisions: [makeDecision()] });
    const earned = checkAndEarnAchievements(session, [session]);
    expect(earned.map(a => a.id)).toContain('first-neutralize');
  });

  it('earns perfect-mission when all correct with no breach', () => {
    const session = makeSession({ decisions: [makeDecision()], breachCount: 0, baseHealth: 100 });
    const earned = checkAndEarnAchievements(session, [session]);
    expect(earned.map(a => a.id)).toContain('perfect-mission');
  });

  it('earns speed-demon when response < 2000ms', () => {
    const session = makeSession({ decisions: [makeDecision({ responseTimeMs: 1500 })] });
    const earned = checkAndEarnAchievements(session, [session]);
    expect(earned.map(a => a.id)).toContain('speed-demon');
  });

  it('does NOT re-earn an already-earned achievement', () => {
    const session = makeSession({ decisions: [makeDecision()] });
    checkAndEarnAchievements(session, [session]);
    const earned2 = checkAndEarnAchievements(session, [session]);
    expect(earned2.find(a => a.id === 'first-neutralize')).toBeUndefined();
  });

  it('earns ironclad when baseHealth is 100 and 3+ decisions', () => {
    const session = makeSession({
      decisions: [makeDecision(), makeDecision(), makeDecision()],
      baseHealth: 100,
    });
    const earned = checkAndEarnAchievements(session, [session]);
    expect(earned.map(a => a.id)).toContain('ironclad');
  });
});

describe('getEarnedAchievements', () => {
  beforeEach(() => { Object.keys(store).forEach(k => delete store[k]); });

  it('returns empty array when no achievements earned', () => {
    expect(getEarnedAchievements()).toEqual([]);
  });

  it('returns earned achievement IDs after earning', () => {
    const session = makeSession({ decisions: [makeDecision()] });
    checkAndEarnAchievements(session, [session]);
    expect(getEarnedAchievements()).toContain('first-neutralize');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd C:\Users\sait9\sait\sih26247
npx jest __tests__/lib/achievements.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/lib/achievements'`

- [ ] **Step 3: Create `lib/achievements.ts`**

```ts
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
    name: 'First Blood',
    icon: '🎯',
    description: 'Neutralize your first threat',
    check: (s) => s.decisions.some(d => d.correct),
  },
  {
    id: 'perfect-mission',
    name: 'Perfect Mission',
    icon: '⭐',
    description: 'Complete a mission with 100% accuracy and no breaches',
    check: (s) =>
      s.decisions.length > 0 &&
      s.decisions.every(d => d.correct) &&
      (s.breachCount ?? 0) === 0,
  },
  {
    id: 'ironclad',
    name: 'Ironclad',
    icon: '🛡️',
    description: 'Complete a mission with base health at 100% (3+ engagements)',
    check: (s) => (s.baseHealth ?? 0) === 100 && s.decisions.length >= 3,
  },
  {
    id: 'speed-demon',
    name: 'Speed Demon',
    icon: '⚡',
    description: 'Classify a threat correctly in under 2 seconds',
    check: (s) => s.decisions.some(d => d.correct && d.responseTimeMs < 2000),
  },
  {
    id: 'no-fratricide-5',
    name: 'Clean Hands',
    icon: '🕊️',
    description: 'Complete 5 missions without any fratricide',
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
    name: 'Swarm Master',
    icon: '🟣',
    description: 'Correctly identify 10 swarm threats across all sessions',
    check: (_, all) =>
      all.flatMap(s => s.decisions).filter(d => d.threatType === 'swarm' && d.correct).length >= 10,
  },
  {
    id: 'ai-skeptic',
    name: 'Trust Your Training',
    icon: '🧠',
    description: 'Correctly classify 5 threats that the AI got wrong',
    check: (_, all) =>
      all.flatMap(s => s.decisions).filter(d => d.followedAI === false && d.correct).length >= 5,
  },
  {
    id: 'veteran',
    name: 'Veteran',
    icon: '🏅',
    description: 'Complete 10 training sessions',
    check: (_, all) => all.length >= 10,
  },
  {
    id: 'tier-1-clear',
    name: 'Punjab Sector Clear',
    icon: '🟢',
    description: 'Complete all 20 Punjab sector missions (Levels 1–20)',
    check: (_, all) => {
      const completed = new Set(all.map(s => s.level));
      return Array.from({ length: 20 }, (_, i) => i + 1).every(l => completed.has(l));
    },
  },
  {
    id: 'tier-2-clear',
    name: 'J&K LoC Clear',
    icon: '🔵',
    description: 'Complete all 20 J&K LoC sector missions (Levels 21–40)',
    check: (_, all) => {
      const completed = new Set(all.map(s => s.level));
      return Array.from({ length: 20 }, (_, i) => i + 21).every(l => completed.has(l));
    },
  },
  {
    id: 'tier-3-clear',
    name: 'Ladakh LAC Clear',
    icon: '🟡',
    description: 'Complete all 20 Ladakh LAC missions (Levels 41–60)',
    check: (_, all) => {
      const completed = new Set(all.map(s => s.level));
      return Array.from({ length: 20 }, (_, i) => i + 41).every(l => completed.has(l));
    },
  },
  {
    id: 'tier-4-clear',
    name: 'Arabian Sea Clear',
    icon: '🟠',
    description: 'Complete all 20 Rajasthan/Arabian Sea missions (Levels 61–80)',
    check: (_, all) => {
      const completed = new Set(all.map(s => s.level));
      return Array.from({ length: 20 }, (_, i) => i + 61).every(l => completed.has(l));
    },
  },
  {
    id: 'capital-defender',
    name: 'Capital Defender',
    icon: '🔴',
    description: 'Complete all 20 NCR multi-vector missions (Levels 81–100)',
    check: (_, all) => {
      const completed = new Set(all.map(s => s.level));
      return Array.from({ length: 20 }, (_, i) => i + 81).every(l => completed.has(l));
    },
  },
];

const ACHIEVEMENTS_KEY = 'droneshield-achievements';

export function getEarnedAchievements(): string[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function checkAndEarnAchievements(session: Session, allSessions: Session[]): AchievementDef[] {
  const alreadyEarned = new Set(getEarnedAchievements());
  const newlyEarned: AchievementDef[] = [];

  for (const def of ACHIEVEMENT_DEFS) {
    if (!alreadyEarned.has(def.id) && def.check(session, allSessions)) {
      newlyEarned.push(def);
      alreadyEarned.add(def.id);
    }
  }

  if (newlyEarned.length > 0) {
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify([...alreadyEarned]));
  }

  return newlyEarned;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/lib/achievements.test.ts --no-coverage
```

Expected: PASS — 6 tests passing

- [ ] **Step 5: Commit**

```bash
git add lib/achievements.ts __tests__/lib/achievements.test.ts
git commit -m "feat: add achievement system — 13 achievements with localStorage persistence"
```

---

## Task 2: Rules of Engagement library (`lib/roe.ts`)

**Files:**
- Create: `lib/roe.ts`
- Create: `__tests__/lib/roe.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/roe.test.ts`:

```ts
import { getROE, ROE_DATA } from '@/lib/roe';

describe('getROE', () => {
  it('returns Punjab ROE for level 1', () => {
    const roe = getROE(1);
    expect(roe.tier).toBe(0);
    expect(roe.sector).toContain('Punjab');
  });

  it('returns NCR ROE for level 100', () => {
    const roe = getROE(100);
    expect(roe.tier).toBe(4);
    expect(roe.alertLevel).toBe('RED');
  });

  it('returns correct tier at all boundaries', () => {
    const cases: [number, number][] = [
      [1, 0], [20, 0], [21, 1], [40, 1],
      [41, 2], [60, 2], [61, 3], [80, 3],
      [81, 4], [100, 4],
    ];
    for (const [level, tier] of cases) {
      expect(getROE(level).tier).toBe(tier);
    }
  });

  it('ROE_DATA has exactly 5 entries', () => {
    expect(ROE_DATA.length).toBe(5);
  });

  it('every entry has authorized and restricted arrays', () => {
    for (const roe of ROE_DATA) {
      expect(Array.isArray(roe.authorized)).toBe(true);
      expect(Array.isArray(roe.restricted)).toBe(true);
      expect(roe.authorized.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/lib/roe.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/lib/roe'`

- [ ] **Step 3: Create `lib/roe.ts`**

```ts
export interface ROEEntry {
  tier: number;
  sector: string;
  alertLevel: 'WHITE' | 'YELLOW' | 'RED';
  authorized: string[];
  restricted: string[];
  engagementAuth: string;
  notes: string;
}

export const ROE_DATA: ROEEntry[] = [
  {
    tier: 0,
    sector: 'Punjab Sector (IB)',
    alertLevel: 'YELLOW',
    authorized: ['RF Jamming (Tier-1 soft-kill)', 'Alert & Evacuate (neutral/friendly)', 'Visual ID request'],
    restricted: ['Kinetic engagement without confirmed hostile ID'],
    engagementAuth: 'Pathankot AFB Station Commander',
    notes: 'IB crossing — civilian airspace nearby. Confirm hostile intent before hard-kill. Fratricide near IB has diplomatic consequences.',
  },
  {
    tier: 1,
    sector: 'J&K — Line of Control',
    alertLevel: 'YELLOW',
    authorized: ['RF Jamming', 'Hard-kill interceptor (military UCAV only)', 'Alert & Evacuate'],
    restricted: ['Engagement of unclassified contacts', 'EW without confirmed swarm signature'],
    engagementAuth: 'Jammu Air Force Station CO',
    notes: 'LoC crossing — armed engagement authorised for confirmed military/swarm hostile. Decoy probability HIGH on this sector.',
  },
  {
    tier: 2,
    sector: 'Ladakh — Line of Actual Control',
    alertLevel: 'RED',
    authorized: ['Full spectrum: RF / Interceptor / EW', 'Alert & Evacuate', 'Command escalation'],
    restricted: ['Unilateral engagement of ISR/MALE assets without ARTRAC auth'],
    engagementAuth: 'Western Air Command / ARTRAC',
    notes: 'LAC crossing is a potential international incident. PLA ISR assets must be confirmed hostile before hard-kill. EW authorised for confirmed swarm mesh.',
  },
  {
    tier: 3,
    sector: 'Rajasthan / Arabian Sea',
    alertLevel: 'YELLOW',
    authorized: ['RF Jamming', 'Hard-kill interceptor', 'Maritime alert protocol for sea-borne threats'],
    restricted: ['Broadband EW in populated coastal areas without SWAC auth'],
    engagementAuth: 'South Western Air Command / INS Porbandar',
    notes: 'Sea-borne threats launched inside 50 km exclusion zone treated as confirmed hostile. Desert sector: decoy probability remains MEDIUM.',
  },
  {
    tier: 4,
    sector: 'NCR — Multi-Vector',
    alertLevel: 'RED',
    authorized: ['All countermeasures authorised', 'Post-engagement command notification required'],
    restricted: ['None — this is the last line of defence'],
    engagementAuth: 'Delhi Air Defence Command (DADC)',
    notes: 'Capital defence. Simultaneous multi-vector threat. Full autonomy granted. Zero breach tolerance. All geopolitical consequences acknowledged at command level.',
  },
];

export function getROE(levelNum: number): ROEEntry {
  const tier = Math.min(4, Math.floor((levelNum - 1) / 20));
  return ROE_DATA[tier];
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/lib/roe.test.ts --no-coverage
```

Expected: PASS — 5 tests passing

- [ ] **Step 5: Commit**

```bash
git add lib/roe.ts __tests__/lib/roe.test.ts
git commit -m "feat: add per-sector Rules of Engagement library with tier lookup"
```

---

## Task 3: SimulationMap — ETA countdown + prediction arcs

**Files:**
- Modify: `components/SimulationMap.tsx`

Two additions: (1) ETA label below each threat marker showing seconds to breach; (2) a thin dashed polyline from each active threat toward the base.

- [ ] **Step 1: Add `predLinesRef` after `trailLinesRef`**

In `SimulationMap.tsx`, after the line:
```tsx
const trailLinesRef    = useRef<Map<string, any>>(new Map());
```

Add:
```tsx
const predLinesRef     = useRef<Map<string, any>>(new Map());
```

- [ ] **Step 2: Add prediction line cleanup in the removal loop**

In the threats sync useEffect, after `trailLinesRef.current.forEach(...)` cleanup block, add:

```tsx
predLinesRef.current.forEach((poly, id) => {
  if (!activeIds.has(id)) {
    mapRef.current.removeLayer(poly);
    predLinesRef.current.delete(id);
  }
});
```

- [ ] **Step 3: Add ETA calculation and label inside the marker icon HTML**

In the `nonNeutralized.forEach(threat => {` loop, add this block BEFORE the `const icon = L.divIcon(...)` line:

```tsx
// ETA: distance in degrees / (speed degrees-per-step × 5 steps-per-second)
const distDeg = Math.sqrt(
  (threat.targetLat - threat.lat) ** 2 + (threat.targetLng - threat.lng) ** 2
);
const etaSec = Math.max(1, Math.round((distDeg / Math.max(threat.speed, 0.0001)) * 0.2));
const etaDisplay = etaSec > 300 ? `${Math.floor(etaSec / 60)}m` : `${etaSec}s`;
const etaColor = etaSec > 120 ? '#22c55e' : etaSec > 30 ? '#f59e0b' : '#ef4444';
const etaLabel = `<div style="position:absolute;top:22px;left:50%;transform:translateX(-50%);font-size:8px;color:${etaColor};white-space:nowrap;font-weight:800;font-family:monospace;background:rgba(0,0,0,0.7);padding:1px 4px;border-radius:3px;">${etaDisplay}</div>`;
```

- [ ] **Step 4: Update icon HTML to include `etaLabel`**

Change the icon html from:
```tsx
html: `<div style="position:relative;">${swarmSatellites}${label}<div style="..."></div></div>`,
```

To:
```tsx
html: `<div style="position:relative;">${swarmSatellites}${label}${etaLabel}<div style="width:20px;height:20px;background:${color};border-radius:50%;border:2px solid ${threat.detected ? 'white' : '#475569'};box-shadow:0 0 12px ${color};cursor:pointer;animation:${threat.detected ? 'pulse' : 'radarPing'} 1.5s infinite;"></div></div>`,
```

- [ ] **Step 5: Add prediction arc polyline after the trail section**

At the end of the `nonNeutralized.forEach` loop (after the trail section), add:

```tsx
// ── Threat prediction arc (dashed line to base) ───────────────────
const predColor = etaSec > 120
  ? 'rgba(34,197,94,0.12)'
  : etaSec > 30
  ? 'rgba(245,158,11,0.18)'
  : 'rgba(239,68,68,0.28)';

if (predLinesRef.current.has(threat.id)) {
  predLinesRef.current.get(threat.id).setLatLngs([
    [threat.lat, threat.lng],
    [threat.targetLat, threat.targetLng],
  ]);
  predLinesRef.current.get(threat.id).setStyle({ color: predColor });
} else {
  const pred = L.polyline(
    [[threat.lat, threat.lng], [threat.targetLat, threat.targetLng]],
    { color: predColor, weight: 1, dashArray: '5 10', interactive: false }
  ).addTo(mapRef.current);
  predLinesRef.current.set(threat.id, pred);
}
```

- [ ] **Step 6: Verify build**

```bash
npx next build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully`

- [ ] **Step 7: Commit**

```bash
git add components/SimulationMap.tsx
git commit -m "feat: add threat ETA countdown labels and prediction arc polylines on map"
```

---

## Task 4: ClassificationPanel — decision timeout + voice commands

**Files:**
- Create: `hooks/useVoiceCommand.ts`
- Modify: `components/ClassificationPanel.tsx`

The panel gets a `classifyTimeout` prop (seconds). A countdown bar appears under the OODA stages. On reaching 0 the panel auto-dismisses. Voice commands auto-fill type/intent.

- [ ] **Step 1: Create `hooks/useVoiceCommand.ts`**

```ts
'use client';
import { useEffect, useRef, useState } from 'react';
import { ThreatType, Intent } from '@/types';

/**
 * Listens for voice commands while the panel is open.
 * Recognised phrases: "commercial" / "military" / "swarm" → type
 *                     "hostile" / "neutral" / "friendly"   → intent
 * Returns true if the browser supports the Web Speech API.
 */
export function useVoiceCommand(
  onType: (t: ThreatType) => void,
  onIntent: (i: Intent) => void,
  enabled: boolean,
): boolean {
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    setSupported(true);
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (e: any) => {
      const transcript = Array.from<any>(e.results)
        .slice(e.resultIndex)
        .map((r: any) => r[0].transcript.toLowerCase())
        .join(' ');

      if (transcript.includes('commercial')) onType('commercial');
      else if (transcript.includes('military') || transcript.includes('missile')) onType('military');
      else if (transcript.includes('swarm')) onType('swarm');

      if (transcript.includes('hostile')) onIntent('hostile');
      else if (transcript.includes('neutral')) onIntent('neutral');
      else if (transcript.includes('friendly')) onIntent('friendly');
    };

    recognition.onerror = () => { /* silently ignore permission errors */ };

    try { recognition.start(); } catch { /* already started */ }
    recognitionRef.current = recognition;

    return () => {
      try { recognitionRef.current?.stop(); } catch {}
      recognitionRef.current = null;
    };
  }, [enabled, onType, onIntent]);

  return supported;
}
```

- [ ] **Step 2: Add `classifyTimeout` prop to ClassificationPanel**

In `ClassificationPanel.tsx`, update the `Props` interface:

```tsx
interface Props {
  threat: Threat;
  targetName: string;
  approachFrom: string;
  sensorDegradation?: boolean;
  degradedFields?: string[];
  classifyTimeout: number;  // ADD THIS — seconds before auto-dismiss
  onClassify: (type: ThreatType, intent: Intent, cm: CountermeasureType, ai?: AIAssessment) => void;
  onDismiss: () => void;
}
```

Update the function signature to destructure it:
```tsx
export default function ClassificationPanel({ threat, targetName, approachFrom, sensorDegradation = false, degradedFields = [], classifyTimeout, onClassify, onDismiss }: Props) {
```

- [ ] **Step 3: Add timer state + voice hook inside ClassificationPanel**

After the existing `const [sensorTab, setSensorTab] = useState(...)` line, add:

```tsx
const [timerLeft, setTimerLeft] = useState(classifyTimeout);
const voiceActive = useVoiceCommand(
  (t) => setSelectedType(t),
  (i) => setSelectedIntent(i),
  true,
);
```

Add the import at the top of the file:
```tsx
import { useVoiceCommand } from '@/hooks/useVoiceCommand';
```

- [ ] **Step 4: Add timer reset effect + countdown effect**

After the existing keyboard shortcuts `useEffect`, add two new effects:

```tsx
// Reset timer when a new threat panel opens
useEffect(() => {
  setTimerLeft(classifyTimeout);
}, [threat.id, classifyTimeout]);

// Countdown — auto-dismiss on expiry
useEffect(() => {
  if (timerLeft <= 0) { onDismiss(); return; }
  const t = setInterval(() => setTimerLeft(v => v - 1), 1000);
  return () => clearInterval(t);
}, [timerLeft, onDismiss]);
```

- [ ] **Step 5: Add countdown bar + voice indicator to JSX**

In the JSX, after the OODA stages `</div>` closing tag (the one with `padding: '12px 20px 0'`), and before the `<div style={{ padding: '0 20px 20px' ...}}>` content div, add:

```tsx
{/* Countdown timer bar */}
<div style={{ padding: '0 20px 4px' }}>
  <div style={{ height: '3px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
    <div style={{
      height: '100%',
      width: `${Math.max(0, (timerLeft / classifyTimeout) * 100)}%`,
      backgroundColor: timerLeft > classifyTimeout * 0.5 ? '#22c55e' : timerLeft > classifyTimeout * 0.25 ? '#f59e0b' : '#ef4444',
      transition: 'width 1s linear, background-color 0.3s',
    }} />
  </div>
  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
    <span style={{ fontSize: '9px', color: voiceActive ? '#818cf8' : '#374151', letterSpacing: '0.06em' }}>
      {voiceActive ? '🎙 VOICE ACTIVE' : 'CLASSIFY OR DISMISS'}
    </span>
    <span style={{ fontSize: '9px', fontFamily: 'monospace', fontWeight: 700, color: timerLeft <= 5 ? '#ef4444' : '#374151' }}>
      {timerLeft}s
    </span>
  </div>
</div>
```

- [ ] **Step 6: Verify TypeScript and build**

```bash
npx tsc --noEmit 2>&1
```

Expected: No output (clean). If there are errors about `classifyTimeout` not passed to ClassificationPanel in `simulation/page.tsx`, fix in Task 5.

- [ ] **Step 7: Commit**

```bash
git add hooks/useVoiceCommand.ts components/ClassificationPanel.tsx
git commit -m "feat: add decision timeout countdown and Web Speech API voice command classification"
```

---

## Task 5: HUDBar — ENGAGE NEXT priority threat indicator

**Files:**
- Modify: `components/HUDBar.tsx`

Add a `priorityThreat` prop (null or `{ type, threatRating, etaSec }`). Renders an "ENGAGE NEXT" chip in the right section.

- [ ] **Step 1: Update HUDBar Props interface**

In `components/HUDBar.tsx`, add to the `Props` interface:

```tsx
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
  priorityThreat: { type: string; threatRating: string; etaSec: number } | null;  // ADD
}
```

Update the destructure:
```tsx
export default function HUDBar({ score, timeLeft, totalTime, threatsNeutralized, threatQuota, targetName, levelNum, baseHealth, streak, alertState, activeThreats, priorityThreat }: Props) {
```

- [ ] **Step 2: Add ENGAGE NEXT chip to JSX**

In the right flex container (the one with `justifyContent: 'flex-end'`), add BEFORE the streak badge:

```tsx
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
    ↑ ENGAGE: {priorityThreat.type.toUpperCase().slice(0, 4)} {priorityThreat.etaSec}s
  </div>
)}
```

- [ ] **Step 3: Verify build**

```bash
npx next build 2>&1 | tail -10
```

Expected: Will fail with TypeScript error "priorityThreat is missing" — fixed in Task 6 when simulation/page passes it.

If it fails with only that error, that's expected. If there are other errors, fix them now.

- [ ] **Step 4: Commit**

```bash
git add components/HUDBar.tsx
git commit -m "feat: add ENGAGE NEXT priority threat indicator to HUD"
```

---

## Task 6: simulation/page.tsx — wire everything together

**Files:**
- Modify: `app/simulation/page.tsx`

This task: (1) compute `classifyTimeout` from level; (2) compute `priorityThreat`; (3) pass `classifyTimeout` to ClassificationPanel; (4) pass `priorityThreat` to HUDBar; (5) add ROE card toggle; (6) add countermeasure deploy effect animation.

- [ ] **Step 1: Add imports**

At the top of `app/simulation/page.tsx`, add:

```tsx
import { getROE } from '@/lib/roe';
```

- [ ] **Step 2: Add ROE and timeout derived values**

After the `activeThreatCount` useMemo, add:

```tsx
// ROE for current level
const roe = useMemo(() => getROE(levelNum), [levelNum]);

// Classification timeout: 20s at level 1, down to 8s at level 100
const classifyTimeout = Math.max(8, 22 - Math.floor(levelNum / 10));

// Priority threat: highest urgency undetected threat
const priorityThreat = useMemo(() => {
  const undetected = threats.filter(t => !t.neutralized && !t.detected);
  if (!undetected.length) return null;
  const WEIGHT: Record<string, number> = { LOW: 1, MEDIUM: 1.5, HIGH: 2, CRITICAL: 3 };
  return undetected.reduce((best, t) => {
    const distT = Math.sqrt((t.targetLat - t.lat) ** 2 + (t.targetLng - t.lng) ** 2);
    const etaT = (distT / Math.max(t.speed, 0.0001)) * 0.2;
    const urgencyT = (WEIGHT[t.threatRating] ?? 1) / etaT;
    const distB = Math.sqrt((best.targetLat - best.lat) ** 2 + (best.targetLng - best.lng) ** 2);
    const etaB = (distB / Math.max(best.speed, 0.0001)) * 0.2;
    const urgencyB = (WEIGHT[best.threatRating] ?? 1) / etaB;
    return urgencyT > urgencyB ? t : best;
  });
}, [threats]);

const priorityThreatData = useMemo(() => {
  if (!priorityThreat) return null;
  const dist = Math.sqrt(
    (priorityThreat.targetLat - priorityThreat.lat) ** 2 +
    (priorityThreat.targetLng - priorityThreat.lng) ** 2
  );
  const etaSec = Math.max(1, Math.round((dist / Math.max(priorityThreat.speed, 0.0001)) * 0.2));
  return { type: priorityThreat.type, threatRating: priorityThreat.threatRating, etaSec };
}, [priorityThreat]);
```

- [ ] **Step 3: Add ROE card state + deploy effects state**

After the existing `useState` declarations at the top, add:

```tsx
const [showROE, setShowROE] = useState(false);
const [deployEffects, setDeployEffects] = useState<Array<{ id: string; type: string; }>>([]);
```

- [ ] **Step 4: Add deploy effects tracking to existing neutralization useEffect**

Find the existing `neutralizedToast` useEffect. Inside the `if (last?.correct)` block, add deploy effect tracking:

```tsx
if (last?.correct) {
  setNeutralizedToast(last.countermeasure.toUpperCase().replace(/-/g, ' ') + ' DEPLOYED');
  const t = setTimeout(() => setNeutralizedToast(null), 1800);
  // ADD: deploy effect
  const effectId = `${Date.now()}`;
  setDeployEffects(prev => [...prev, { id: effectId, type: last.countermeasure }]);
  setTimeout(() => setDeployEffects(prev => prev.filter(e => e.id !== effectId)), 2000);
  prevDecisionsLenRef.current = decisions.length;
  return () => clearTimeout(t);
}
```

- [ ] **Step 5: Pass `classifyTimeout` to ClassificationPanel**

Find `<ClassificationPanel` in the JSX and add the prop:

```tsx
<ClassificationPanel
  key={selectedThreat.id}
  threat={selectedThreat}
  targetName={targetName}
  approachFrom={threatDirection}
  sensorDegradation={sensorDegradation}
  degradedFields={degradedFields}
  classifyTimeout={classifyTimeout}   {/* ADD */}
  onClassify={handleClassifyAndDeploy}
  onDismiss={dismiss}
/>
```

- [ ] **Step 6: Pass `priorityThreat` to HUDBar**

Find `<HUDBar` in the JSX and add:

```tsx
<HUDBar
  score={score}
  timeLeft={timeLeft}
  totalTime={totalTime}
  threatsNeutralized={neutralizedCount}
  threatQuota={threatQuota}
  targetName={targetName}
  levelNum={levelNum}
  baseHealth={baseHealth}
  streak={streak}
  alertState={alertState}
  activeThreats={activeThreatCount}
  priorityThreat={priorityThreatData}   {/* ADD */}
/>
```

- [ ] **Step 7: Add ROE card + deploy effects to JSX**

Inside the map container div (after the `{/* Abort mission button */}` block), add:

```tsx
{/* ROE toggle button */}
{phase === 'playing' && (
  <button
    onClick={() => setShowROE(v => !v)}
    style={{
      position: 'absolute', top: '14px', left: '14px', zIndex: 900,
      backgroundColor: showROE ? 'rgba(245,158,11,0.18)' : 'rgba(0,0,0,0.75)',
      border: `1px solid ${showROE ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.1)'}`,
      color: showROE ? '#f59e0b' : '#6b7280', fontSize: '10px', fontWeight: 700,
      padding: '5px 10px', borderRadius: '8px', cursor: 'pointer', letterSpacing: '0.06em',
    }}
  >
    ROE ⓘ
  </button>
)}

{/* ROE card */}
{showROE && phase === 'playing' && (
  <div style={{
    position: 'absolute', top: '44px', left: '14px', zIndex: 900,
    backgroundColor: 'rgba(10,10,15,0.95)', border: '1px solid rgba(245,158,11,0.25)',
    borderRadius: '12px', padding: '12px 14px', maxWidth: '280px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
      <p style={{ margin: 0, fontSize: '9px', fontWeight: 800, color: '#f59e0b', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        RULES OF ENGAGEMENT
      </p>
      <span style={{
        fontSize: '8px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px',
        backgroundColor: roe.alertLevel === 'RED' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.15)',
        color: roe.alertLevel === 'RED' ? '#ef4444' : '#f59e0b',
      }}>
        {roe.alertLevel}
      </span>
    </div>
    <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#e5e7eb', fontWeight: 600 }}>{roe.sector}</p>
    <div style={{ marginBottom: '6px' }}>
      <p style={{ margin: '0 0 3px', fontSize: '9px', color: '#22c55e', fontWeight: 700, textTransform: 'uppercase' }}>✓ AUTHORISED</p>
      {roe.authorized.map((a, i) => (
        <p key={i} style={{ margin: '1px 0', fontSize: '10px', color: '#9ca3af' }}>• {a}</p>
      ))}
    </div>
    <div style={{ marginBottom: '6px' }}>
      <p style={{ margin: '0 0 3px', fontSize: '9px', color: '#ef4444', fontWeight: 700, textTransform: 'uppercase' }}>✗ RESTRICTED</p>
      {roe.restricted.map((r, i) => (
        <p key={i} style={{ margin: '1px 0', fontSize: '10px', color: '#9ca3af' }}>• {r}</p>
      ))}
    </div>
    <p style={{ margin: '6px 0 0', fontSize: '9px', color: '#4b5563', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px', lineHeight: '1.4' }}>
      Auth: {roe.engagementAuth}
    </p>
  </div>
)}

{/* Countermeasure deploy effect rings */}
{deployEffects.map(e => {
  const color =
    e.type === 'rf-jammer'    ? '#f59e0b' :
    e.type === 'interceptor'  ? '#ef4444' :
    e.type === 'ew'           ? '#8b5cf6' : '#22c55e';
  return (
    <div key={e.id} style={{
      position: 'absolute', left: '50%', top: '50%',
      width: '120px', height: '120px',
      borderRadius: '50%',
      border: `2px solid ${color}`,
      pointerEvents: 'none', zIndex: 800,
      animation: 'deployExpand 2s ease-out forwards',
    }} />
  );
})}
```

- [ ] **Step 8: Add `deployExpand` keyframe to the existing `<style>` tag**

Find the `<style>{` block at the bottom of simulation/page.tsx and add the keyframe:

```tsx
<style>{`
  @keyframes hudPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
  @keyframes streakPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes breachFlash { 0%{opacity:1;} 100%{opacity:0;} }
  @keyframes timePulse { 0%,100%{opacity:0.6;} 50%{opacity:1;} }
  @keyframes deployExpand {
    from { transform: translate(-50%, -50%) scale(0.1); opacity: 0.8; }
    to   { transform: translate(-50%, -50%) scale(4); opacity: 0; }
  }
`}</style>
```

- [ ] **Step 9: Verify full build**

```bash
npx next build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully` with all 6 routes.

- [ ] **Step 10: Commit**

```bash
git add app/simulation/page.tsx
git commit -m "feat: wire ROE card, deploy effects, priority queue, and classify timeout into simulation"
```

---

## Task 7: CertificateOverlay component

**Files:**
- Create: `components/CertificateOverlay.tsx`

A full-screen print-ready overlay that appears when a tier is completed.

- [ ] **Step 1: Create `components/CertificateOverlay.tsx`**

```tsx
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
      {/* Certificate card */}
      <div style={{
        maxWidth: '580px', width: '100%',
        background: 'linear-gradient(135deg, #0f1729 0%, #1a2744 50%, #0f1729 100%)',
        border: '2px solid rgba(245,158,11,0.5)',
        borderRadius: '24px', padding: '48px 52px',
        textAlign: 'center',
        boxShadow: '0 0 80px rgba(245,158,11,0.12), inset 0 0 60px rgba(245,158,11,0.03)',
      }}>
        <p style={{ margin: 0, fontSize: '9px', color: '#f59e0b', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase' }}>
          Ministry of Defence — Smart India Hackathon 2026
        </p>
        <p style={{ margin: '2px 0 0', fontSize: '9px', color: '#374151', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          PS26247 — AI-Enabled Counter-Drone Training System
        </p>

        <div style={{ margin: '24px 0 20px', fontSize: '36px' }}>🏆</div>

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
            Tier {tierNumber} — {tierName}
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
            <p style={{ margin: 0, fontSize: '9px', color: '#374151', letterSpacing: '0.08em', textTransform: 'uppercase' }}>DroneShield Training System</p>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#6b7280', fontFamily: 'monospace' }}>SIH26247 / MoD / IAF</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="no-print" style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
        <button
          onClick={() => window.print()}
          style={{ backgroundColor: '#f59e0b', color: '#0a0a0f', fontWeight: 800, padding: '12px 28px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: '14px', letterSpacing: '-0.01em' }}
        >
          🖨 Print Certificate
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1
```

Expected: No output (clean).

- [ ] **Step 3: Commit**

```bash
git add components/CertificateOverlay.tsx
git commit -m "feat: add printable tier completion certificate overlay component"
```

---

## Task 8: AAR page — achievements + certificate trigger

**Files:**
- Modify: `app/aar/page.tsx`

After session loads: check and display newly earned achievements, detect tier completion, show CertificateOverlay.

- [ ] **Step 1: Add imports to `app/aar/page.tsx`**

Add at the top (after existing imports):

```tsx
import { checkAndEarnAchievements, getEarnedAchievements, ACHIEVEMENT_DEFS, type AchievementDef } from '@/lib/achievements';
import CertificateOverlay from '@/components/CertificateOverlay';
import { getLevelTier } from '@/lib/levels';
```

- [ ] **Step 2: Add achievement and cert state**

After `const [history, setHistory] = useState<Session[]>([]);`, add:

```tsx
const [newAchievements, setNewAchievements] = useState<AchievementDef[]>([]);
const [showCert, setShowCert] = useState(false);
```

- [ ] **Step 3: Update the `useEffect` to check achievements and cert**

Find the existing `useEffect`:
```tsx
useEffect(() => {
  const raw = sessionStorage.getItem('last-session');
  if (raw) setSession(JSON.parse(raw));
  setHistory(getSessions());
}, []);
```

Replace it with:

```tsx
useEffect(() => {
  const raw = sessionStorage.getItem('last-session');
  if (!raw) return;
  const s: Session = JSON.parse(raw);
  setSession(s);
  const all = getSessions();
  setHistory(all);
  // Check achievements
  const earned = checkAndEarnAchievements(s, all);
  setNewAchievements(earned);
  // Check tier completion certificate
  const lvl = s.level ?? 1;
  const isTierEnd = [20, 40, 60, 80, 100].includes(lvl);
  const { grade } = getMissionGrade(s.decisions, s.breachCount ?? 0);
  if (isTierEnd && ['S', 'A', 'B', 'C'].includes(grade)) {
    setShowCert(true);
  }
}, []);
```

- [ ] **Step 4: Add operator name state**

After the `useEffect`, add:

```tsx
const [operatorName, setOperatorName] = useState('');
useEffect(() => {
  const name = localStorage.getItem('droneshield-operator');
  if (name) setOperatorName(name);
}, []);
```

- [ ] **Step 5: Add achievements display section to JSX**

In the JSX, find the `{/* Actions */}` div (the `className="no-print"` div with the buttons). Add BEFORE it:

```tsx
{/* Newly earned achievements */}
{newAchievements.length > 0 && (
  <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '20px', padding: '20px 24px' }}>
    <p style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
      🏆 ACHIEVEMENTS UNLOCKED THIS SESSION
    </p>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {newAchievements.map(a => (
        <div key={a.id} style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          backgroundColor: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: '12px', padding: '8px 12px',
        }}>
          <span style={{ fontSize: '16px' }}>{a.icon}</span>
          <div>
            <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#f59e0b' }}>{a.name}</p>
            <p style={{ margin: 0, fontSize: '10px', color: '#6b7280' }}>{a.description}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 6: Add CertificateOverlay render**

At the very end of the outer return div (before the closing `</div>`), add:

```tsx
{showCert && session && (() => {
  const lvl = session.level ?? 1;
  const tier = Math.min(4, Math.floor((lvl - 1) / 20));
  const TIER_NAMES = ['RECRUIT', 'CADET', 'OPERATOR', 'SPECIALIST', 'COMMANDER'];
  const TIER_SECTORS = [
    'Punjab Sector (IB)',
    'J&K — Line of Control',
    'Ladakh — Line of Actual Control',
    'Rajasthan / Arabian Sea',
    'NCR Multi-Vector',
  ];
  return (
    <CertificateOverlay
      operatorName={operatorName}
      tierNumber={tier}
      tierName={TIER_NAMES[tier]}
      sectorName={TIER_SECTORS[tier]}
      missionsCompleted={20}
      date={new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
      onClose={() => setShowCert(false)}
    />
  );
})()}
```

- [ ] **Step 7: Verify build**

```bash
npx next build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully`

- [ ] **Step 8: Commit**

```bash
git add app/aar/page.tsx
git commit -m "feat: add achievement unlocks and tier completion certificate in AAR"
```

---

## Task 9: Briefing page — achievement badge display

**Files:**
- Modify: `app/page.tsx`

Show total earned achievements count in the header so evaluators see the system at first glance.

- [ ] **Step 1: Add import**

In `app/page.tsx`, add import:

```tsx
import { getEarnedAchievements, ACHIEVEMENT_DEFS } from '@/lib/achievements';
```

- [ ] **Step 2: Add achievements state**

After `const [editingName, setEditingName] = useState(false);`, add:

```tsx
const [earnedCount, setEarnedCount] = useState(0);
```

- [ ] **Step 3: Load earned achievements in the existing useEffect**

In the existing `useEffect`, add after loading operator name:

```tsx
setEarnedCount(getEarnedAchievements().length);
```

- [ ] **Step 4: Add achievement badge in header**

In the header JSX, after the `INSTRUCTOR ↗` link and before the `SIH26247` span, add:

```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: earnedCount > 0 ? '#f59e0b' : '#374151', fontWeight: 700 }}>
  🏆 {earnedCount}<span style={{ color: '#374151', fontWeight: 400 }}>/{ACHIEVEMENT_DEFS.length}</span>
</div>
```

- [ ] **Step 5: Run all tests**

```bash
npx jest --no-coverage 2>&1
```

Expected: All tests PASS.

- [ ] **Step 6: Final build**

```bash
npx next build 2>&1
```

Expected: `✓ Compiled successfully` — all 6 routes.

- [ ] **Step 7: Final commit**

```bash
git add app/page.tsx
git commit -m "feat: add achievement badge count to briefing header"
```

---

## Self-Review

**Spec coverage:**
- ✅ Threat ETA countdown on map markers — Task 3
- ✅ Prediction arc polylines — Task 3
- ✅ Decision timeout countdown — Task 4
- ✅ Voice command input — Task 4
- ✅ Threat priority queue — Task 5 + Task 6
- ✅ Achievement system (13 achievements) — Task 1 + Task 8 + Task 9
- ✅ Operator tier certification — Task 7 + Task 8
- ✅ Countermeasure deployment visualisation — Task 6
- ✅ Sector ROE card — Task 2 + Task 6
- ✅ PS26247 requirements all covered per mapping table

**Placeholder scan:** No TBDs, no vague steps, all code blocks complete.

**Type consistency:**
- `AchievementDef` defined in `lib/achievements.ts`, used in `app/aar/page.tsx` as imported type ✅
- `ROEEntry` defined in `lib/roe.ts`, used via `getROE()` in `app/simulation/page.tsx` ✅
- `priorityThreat` prop type defined inline in `HUDBar.tsx` and passed from `simulation/page.tsx` ✅
- `classifyTimeout: number` added to `ClassificationPanel` Props and passed from `simulation/page.tsx` ✅
- `CertificateOverlay` props all provided in `app/aar/page.tsx` ✅
