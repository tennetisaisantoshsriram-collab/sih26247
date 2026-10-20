# DroneShield PS26247: Final Stretch — 6 Priority Tasks

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 6 remaining priority tasks that address the PS26247 "AI-Enabled" requirement, eliminate game feel, and add unique MoD-grade differentiators no competitor has.

**Architecture:** All features integrate into the existing Next.js 16 App Router project at `C:\Users\sait9\sait\sih26247`. New logic goes into `lib/` files with clean interfaces; UI additions go into existing page files or new components. Offline-first localStorage-only — no new backend infrastructure. Score breakdown (#32) is already implemented — `ScoringBreakdown` component confirmed in `app/aar/page.tsx` lines 122–148.

**Tech Stack:** Next.js 16 App Router, TypeScript, React, Groq LLM (llama-3.1-8b-instant), localStorage, window.print()

**Verify commands (run after every task):**
```bash
cd C:\Users\sait9\sait\sih26247
npx tsc --noEmit
```

**Final verify:**
```bash
cd C:\Users\sait9\sait\sih26247
npx next build
```

---

## File Map

| File | Task | Change |
|------|------|--------|
| `lib/adaptiveEngine.ts` | #31 | Create — weakness profile, weighted type selector, CoachingReport type |
| `app/api/coaching/route.ts` | #31 | Create — Groq coaching endpoint with deterministic fallback |
| `lib/scenario.ts` | #31 | Modify line 73 — add optional `typeOverride` param to `spawnThreatFromLevel` |
| `hooks/useGameState.ts` | #31 | Modify lines 79–92 — use adaptive type selection in spawn loop |
| `app/aar/page.tsx` | #31, #15, #17 | Modify — add coaching section, show profile name, badge rename |
| `lib/storage.ts` | #15, #16 | Modify — add TraineeProfile type + getProfile/saveProfile + getTierAccuracy/isTierUnlocked |
| `app/page.tsx` | #15, #16, #17 | Modify — expand tutorial to full profile form, add gating to level list |
| `app/instructor/page.tsx` | #15 | Modify — show full profile in unit record header |
| `components/TrainingRecordOverlay.tsx` | #28 | Create — MoD A4 print overlay |
| `app/aar/page.tsx` | #28 | Modify — add "Export Training Record" button + state |
| `lib/demoMode.ts` | #19 | Create — demo step definitions |
| `app/simulation/page.tsx` | #19 | Modify — demo overlay panel (reads sessionStorage demo-mode) |
| `app/page.tsx` | #19 | Modify — DEMO button in header |
| `lib/achievements.ts` | #17 | Modify — rename game-ish achievement names to military terminology |

---

## Task 1: AI-Adaptive Training Engine (#31 — PS-CRITICAL)

Addresses the "AI-Enabled" PS title requirement: AI must adapt training to trainee weaknesses, not just assess threats reactively.

**Files:**
- Create: `lib/adaptiveEngine.ts`
- Create: `app/api/coaching/route.ts`
- Modify: `lib/scenario.ts` (line 73)
- Modify: `hooks/useGameState.ts` (lines 79–92 spawn effect)
- Modify: `app/aar/page.tsx` (add coaching fetch + 2 new sections)

- [ ] **Step 1: Create `lib/adaptiveEngine.ts`**

```typescript
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

const PROFILE_KEY = 'droneshield-weakness-profile';

export function getWeaknessProfile(): WeaknessProfile {
  if (typeof window === 'undefined') return { commercial: 50, military: 50, swarm: 50 };
  const raw = localStorage.getItem(PROFILE_KEY);
  return raw ? JSON.parse(raw) : { commercial: 50, military: 50, swarm: 50 };
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
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
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
```

- [ ] **Step 2: Verify step 1 compiles**

```bash
cd C:\Users\sait9\sait\sih26247
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Create `app/api/coaching/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import type { CoachingReport } from '@/lib/adaptiveEngine';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.1-8b-instant';

const MOCK_COACHING: Record<string, CoachingReport> = {
  commercial: {
    focusAreas: ['Commercial drone recognition', 'RF jamming decision speed', 'GPS-hover pattern identification'],
    tacticalAdvice: 'Commercial drones rely on 2.4/5.8 GHz RF links and GNSS. Key indicator: GPS-stabilised hover behaviour with no thermal signature.',
    drillRecommendation: 'Replay Punjab Tier scenarios 1–50. Focus on commercial/neutral discrimination under fog conditions.',
    mentalModel: 'Hovers with correction bursts + no engine heat = GPS-stabilised commercial. Deploy RF jammer — severs control link.',
  },
  military: {
    focusAreas: ['Military UCAV identification', 'Encrypted comms signature', 'Interceptor timing window'],
    tacticalAdvice: 'Military UCAVs use AES-encrypted frequency-hopping comms immune to jamming. Fixed-wing profile at 200m+ AGL. Only hard-kill is effective.',
    drillRecommendation: 'Work through J&K LoC scenarios 201–300 for Burraq and CH-4B classification under degraded sensors.',
    mentalModel: 'Fixed-wing straight-line flight at altitude + high threat rating = UCAV. RF jammer ineffective. Interceptor only.',
  },
  swarm: {
    focusAreas: ['Swarm mesh network recognition', 'EW deployment timing', 'Multi-target prioritisation'],
    tacticalAdvice: 'Swarms use IEEE 802.11p mesh networking. Individual engagement is ineffective. Broadband EW disrupts inter-node coordination simultaneously.',
    drillRecommendation: 'Practice NCR Commander scenarios (801–850) for multi-vector swarm response under SCRAMBLE alert.',
    mentalModel: 'Three or more simultaneous coordinated contacts = swarm. Skip classification — deploy EW to collapse the mesh.',
  },
};

export async function POST(req: NextRequest) {
  const { weakAreas, sessions, operatorName }: {
    weakAreas: string[];
    sessions: number;
    operatorName: string;
  } = await req.json();

  const apiKey = process.env.GROQ_API_KEY;
  const primaryWeak = weakAreas[0] ?? 'commercial';

  if (!apiKey) {
    return NextResponse.json(MOCK_COACHING[primaryWeak] ?? MOCK_COACHING.commercial);
  }

  try {
    const prompt = `You are an IAF Air Defence training instructor providing a post-training AI coaching report.

Trainee: ${operatorName || 'Operator'}
Sessions completed: ${sessions}
Weak areas (accuracy below 70%): ${weakAreas.join(', ')}

Respond ONLY with this exact JSON (no markdown, no preamble):
{
  "focusAreas": ["2-3 specific skill gaps as short noun phrases"],
  "tacticalAdvice": "One tactical paragraph under 40 words about the primary weakness using IAF doctrine terminology",
  "drillRecommendation": "Specific drill scenario recommendation under 20 words",
  "mentalModel": "One memorable mental model for identifying the weak threat type under 30 words"
}`;

    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 350,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You are an IAF Air Defence training instructor. Provide coaching reports in the exact JSON schema the user specifies.' },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!res.ok) return NextResponse.json(MOCK_COACHING[primaryWeak] ?? MOCK_COACHING.commercial);
    const json = await res.json();
    const text: string = json.choices?.[0]?.message?.content ?? '{}';
    return NextResponse.json(JSON.parse(text) as CoachingReport);
  } catch {
    return NextResponse.json(MOCK_COACHING[primaryWeak] ?? MOCK_COACHING.commercial);
  }
}
```

- [ ] **Step 4: Modify `lib/scenario.ts` — add `typeOverride` param**

In `lib/scenario.ts` at line 73, change the function signature and type selection line:

```typescript
// BEFORE (line 73–76):
export function spawnThreatFromLevel(levelNum: number, isDecoy = false): Threat {
  const level = getLevel(levelNum);
  const type: ThreatType = level.types[Math.floor(Math.random() * level.types.length)];

// AFTER:
export function spawnThreatFromLevel(levelNum: number, isDecoy = false, typeOverride?: ThreatType): Threat {
  const level = getLevel(levelNum);
  const type: ThreatType = typeOverride ?? level.types[Math.floor(Math.random() * level.types.length)];
```

Only these two lines change. The rest of the function stays identical.

- [ ] **Step 5: Modify `hooks/useGameState.ts` — adaptive spawn**

Add imports at the top (lines 1–7, add after existing imports):

```typescript
import { getWeaknessProfile, getAdaptiveTypeWeights } from '@/lib/adaptiveEngine';
```

In the spawn `useEffect` (lines 79–92), change the threat construction:

```typescript
// BEFORE (line 85–87):
      const isDecoy = level.decoys && Math.random() < 0.2;
        const threat = spawnThreatFromLevel(levelNum, isDecoy);

// AFTER:
        const isDecoy = level.decoys && Math.random() < 0.2;
        const profile = getWeaknessProfile();
        const adaptiveType = isDecoy ? undefined : getAdaptiveTypeWeights(level.types, profile);
        const threat = spawnThreatFromLevel(levelNum, isDecoy, adaptiveType);
```

- [ ] **Step 6: Modify `app/aar/page.tsx` — add coaching section**

Add to imports at top of file:

```typescript
import { updateWeaknessProfile, getWeakAreas, type CoachingReport } from '@/lib/adaptiveEngine';
```

Add state variables after the existing state declarations (after line 157):

```typescript
  const [coaching, setCoaching] = useState<CoachingReport | null>(null);
  const [coachingLoading, setCoachingLoading] = useState(false);
```

In the second `useEffect` (the one that reads `last-session`, starting around line 164), add at the end of the effect body, before the closing `}`:

```typescript
    // Update weakness profile + fetch AI coaching
    const profile = updateWeaknessProfile(all);
    const weakAreas = getWeakAreas(profile);
    if (weakAreas.length > 0) {
      setCoachingLoading(true);
      const name = localStorage.getItem('droneshield-operator') ?? '';
      fetch('/api/coaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weakAreas: weakAreas.map(a => a.type),
          sessions: all.length,
          operatorName: name,
        }),
      })
        .then(r => r.json())
        .then((data: CoachingReport) => setCoaching(data))
        .catch(() => {})
        .finally(() => setCoachingLoading(false));
    }
```

Add the coaching section JSX in the main `<div>` after the `weakAreas` section (after the closing `)}` of the training gaps block, around line 305), before the `Adaptive difficulty recommendation` block:

```tsx
        {/* AI Tactical Coach — PS26247 "AI-Enabled" requirement */}
        {(coachingLoading || coaching) && (
          <div style={{ background: 'rgba(129,140,248,0.06)', border: '1px solid rgba(129,140,248,0.2)', borderRadius: '20px', padding: '20px 24px' }}>
            <p style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              &#129504; AI TACTICAL COACH — Groq LLM Personalized Analysis
            </p>
            {coachingLoading && !coaching && (
              <p style={{ color: '#4b5563', fontSize: '12px' }}>Analysing training data…</p>
            )}
            {coaching && (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                  {coaching.focusAreas.map((area, i) => (
                    <span key={i} style={{ fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', backgroundColor: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.25)', color: '#a5b4fc' }}>
                      {area}
                    </span>
                  ))}
                </div>
                <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#c7d2fe', lineHeight: '1.6' }}>
                  <strong style={{ color: '#818cf8' }}>Tactical Assessment: </strong>{coaching.tacticalAdvice}
                </p>
                <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#9ca3af', lineHeight: '1.5' }}>
                  <strong style={{ color: '#818cf8' }}>Drill: </strong>{coaching.drillRecommendation}
                </p>
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(129,140,248,0.15)', backgroundColor: 'rgba(129,140,248,0.04)', borderRadius: '8px', padding: '8px 12px' }}>
                  <p style={{ margin: 0, fontSize: '11px', color: '#6b7280', fontStyle: 'italic' }}>
                    <strong style={{ color: '#818cf8', fontStyle: 'normal' }}>Mental Model: </strong>{coaching.mentalModel}
                  </p>
                </div>
              </>
            )}
          </div>
        )}
```

- [ ] **Step 7: Verify and commit Task 1**

```bash
cd C:\Users\sait9\sait\sih26247
npx tsc --noEmit
```
Expected: 0 errors.

```bash
git add lib/adaptiveEngine.ts app/api/coaching/route.ts lib/scenario.ts hooks/useGameState.ts app/aar/page.tsx
git commit -m "feat: AI-adaptive training engine — weakness profiling, adaptive spawn weighting, Groq coaching in AAR"
```

---

## Task 2: Trainee Profile Form (#15 — P1)

Replaces name-only input with full military identity: rank, service number, unit, base. Makes the system look like a real MoD training tool.

**Files:**
- Modify: `lib/storage.ts`
- Modify: `app/page.tsx`
- Modify: `app/aar/page.tsx`
- Modify: `app/instructor/page.tsx`

- [ ] **Step 1: Add TraineeProfile to `lib/storage.ts`**

Append to the end of `lib/storage.ts` (after the `clearSessions` function):

```typescript
export interface TraineeProfile {
  name: string;
  rank: string;
  serviceNo: string;
  unit: string;
  base: string;
}

const PROFILE_KEY = 'droneshield-profile';

export function getProfile(): TraineeProfile {
  if (typeof window === 'undefined') return { name: '', rank: '', serviceNo: '', unit: '', base: '' };
  const raw = localStorage.getItem(PROFILE_KEY);
  if (raw) return JSON.parse(raw);
  // Backward compat: migrate old name-only to profile
  const oldName = localStorage.getItem('droneshield-operator') ?? '';
  return { name: oldName, rank: '', serviceNo: '', unit: '', base: '' };
}

export function saveProfile(profile: TraineeProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  // Keep legacy key in sync so CertificateOverlay still works
  localStorage.setItem('droneshield-operator', profile.name);
}
```

- [ ] **Step 2: Modify `app/page.tsx` — expand header identity display**

In `app/page.tsx`, add import for `getProfile` and `saveProfile`:

```typescript
import { getProfile, saveProfile, type TraineeProfile } from '@/lib/storage';
```

Replace the `operatorName` + `editingName` states (lines 20–21) with:

```typescript
  const [profile, setProfile] = useState<TraineeProfile>({ name: '', rank: '', serviceNo: '', unit: '', base: '' });
  const [editingName, setEditingName] = useState(false);
```

Update the `useEffect` (lines 28–40) to load full profile:

```typescript
  useEffect(() => {
    const sessions = getSessions();
    const map: Record<number, number> = {};
    for (const s of sessions) {
      const lvl = s.level ?? 1;
      if (!map[lvl] || s.score > map[lvl]) map[lvl] = s.score;
    }
    setPbMap(map);
    if (!localStorage.getItem('droneshield-tutorial-done')) setShowTutorial(true);
    setProfile(getProfile());
    setEarnedCount(getEarnedAchievements().length);
  }, []);
```

Update `saveOperatorName` to save full profile:

```typescript
  const saveOperatorName = (name: string) => {
    const trimmed = name.trim() || 'Operator';
    const updated = { ...profile, name: trimmed };
    setProfile(updated);
    saveProfile(updated);
    setEditingName(false);
  };
```

In the header name button (line ~82), change to show rank + name:

```typescript
            <button
              onClick={() => setEditingName(true)}
              style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: '11px', fontWeight: 600, padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Click to set operator profile"
            >
              &#128100; {profile.rank ? `${profile.rank} ` : ''}{profile.name || 'Set profile'}
            </button>
```

In the tutorial overlay, replace the single name `<input>` block (lines ~322–336) with the full profile form:

```tsx
            {/* Operator Profile */}
            <div style={{ marginBottom: '24px' }}>
              <p style={{ margin: '0 0 8px', fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Operator Identity (for training record)
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <select
                  value={profile.rank}
                  onChange={e => {
                    const p = { ...profile, rank: e.target.value };
                    setProfile(p);
                    saveProfile(p);
                  }}
                  style={{ gridColumn: '1 / -1', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: profile.rank ? '#fff' : '#6b7280', fontSize: '13px', padding: '8px 12px', outline: 'none', fontFamily: 'inherit' }}
                >
                  <option value="">Rank (optional)</option>
                  <option value="Flt Lt">Flt Lt</option>
                  <option value="Sqn Ldr">Sqn Ldr</option>
                  <option value="Wg Cdr">Wg Cdr</option>
                  <option value="Gp Capt">Gp Capt</option>
                  <option value="JCO">JCO</option>
                  <option value="NCO">NCO</option>
                  <option value="Civilian">Civilian</option>
                  <option value="Trainee">Trainee</option>
                </select>
                <input
                  placeholder="Name (e.g. Sharma)"
                  value={profile.name}
                  onChange={e => {
                    const p = { ...profile, name: e.target.value };
                    setProfile(p);
                    saveProfile(p);
                  }}
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '13px', padding: '8px 12px', outline: 'none', fontFamily: 'inherit' }}
                />
                <input
                  placeholder="Service No. (optional)"
                  value={profile.serviceNo}
                  onChange={e => {
                    const p = { ...profile, serviceNo: e.target.value };
                    setProfile(p);
                    saveProfile(p);
                  }}
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '13px', padding: '8px 12px', outline: 'none', fontFamily: 'inherit' }}
                />
                <input
                  placeholder="Unit/Squadron (optional)"
                  value={profile.unit}
                  onChange={e => {
                    const p = { ...profile, unit: e.target.value };
                    setProfile(p);
                    saveProfile(p);
                  }}
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '13px', padding: '8px 12px', outline: 'none', fontFamily: 'inherit' }}
                />
                <input
                  placeholder="Base (e.g. Pathankot AFB)"
                  value={profile.base}
                  onChange={e => {
                    const p = { ...profile, base: e.target.value };
                    setProfile(p);
                    saveProfile(p);
                  }}
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '13px', padding: '8px 12px', outline: 'none', fontFamily: 'inherit' }}
                />
              </div>
            </div>
```

- [ ] **Step 3: Modify `app/aar/page.tsx` — load profile in header**

Add import:

```typescript
import { getProfile, type TraineeProfile } from '@/lib/storage';
```

Add state after existing state declarations:

```typescript
  const [profile, setProfile] = useState<TraineeProfile>({ name: '', rank: '', serviceNo: '', unit: '', base: '' });
```

In the first `useEffect` (line ~159–162), add:

```typescript
    setProfile(getProfile());
```

In the AAR header `<p>` subtitle (around line 213), update to show rank + name:

```tsx
            <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
              {profile.rank ? `${profile.rank} ` : ''}{profile.name || operatorName || 'Operator'}
              {profile.unit ? ` · ${profile.unit}` : ''}
              {' '}&nbsp;&middot;&nbsp; Level {session.level ?? '?'}&nbsp;&middot;&nbsp; {decisions.length} engagements
              &nbsp;&middot;&nbsp; Base integrity {sessionBaseHealth}%
              {sessionBreachCount > 0 && <span style={{ color: '#ef4444' }}> &nbsp;({sessionBreachCount} breaches)</span>}
            </p>
```

- [ ] **Step 4: Modify `app/instructor/page.tsx` — show full profile in unit record**

Add import:

```typescript
import { getProfile } from '@/lib/storage';
```

Add state after `operatorName` state:

```typescript
  const [profile, setProfile] = useState<import('@/lib/storage').TraineeProfile>({ name: '', rank: '', serviceNo: '', unit: '', base: '' });
```

In the `useEffect` (lines 122–126), add:

```typescript
    setProfile(getProfile());
```

In the unit record section (around line 186–191), update the operator name display:

```tsx
                <p style={{ margin: '4px 0 2px', fontSize: '22px', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
                  {profile.rank ? `${profile.rank} ` : ''}{profile.name || operatorName || 'Anonymous Operator'}
                </p>
                {(profile.unit || profile.serviceNo) && (
                  <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                    {profile.serviceNo ? `Svc No: ${profile.serviceNo}` : ''}{profile.serviceNo && profile.unit ? ' · ' : ''}{profile.unit ? `Unit: ${profile.unit}` : ''}
                    {profile.base ? ` · ${profile.base}` : ''}
                  </p>
                )}
```

- [ ] **Step 5: Verify and commit Task 2**

```bash
cd C:\Users\sait9\sait\sih26247
npx tsc --noEmit
```
Expected: 0 errors.

```bash
git add lib/storage.ts app/page.tsx app/aar/page.tsx app/instructor/page.tsx
git commit -m "feat: trainee profile — rank, service no, unit, base (replaces name-only)"
```

---

## Task 3: Competency Gating (#16 — P1)

Locks higher tiers until the trainee achieves 70% accuracy in the current tier. Transforms the system from a free-select game into a structured training programme.

**Files:**
- Modify: `lib/storage.ts`
- Modify: `app/page.tsx`

- [ ] **Step 1: Add tier gating helpers to `lib/storage.ts`**

Append to `lib/storage.ts` after the profile functions added in Task 2:

```typescript
/**
 * Returns the classification accuracy (0–100) for all sessions
 * played within the given tier's level range.
 * tierNum 0 = Punjab (1–200), 1 = J&K (201–400), etc.
 */
export function getTierAccuracy(tierNum: number): number {
  const sessions = getSessions();
  const lo = tierNum * 200 + 1;
  const hi = (tierNum + 1) * 200;
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
  return getTierAccuracy(tierNum - 1) >= 70;
}
```

- [ ] **Step 2: Modify `app/page.tsx` — add gating to level list**

Add import for tier gating:

```typescript
import { isTierUnlocked } from '@/lib/storage';
```

Add a constant for tier number lookup (place it after `TIER_STYLES`):

```typescript
const TIER_NUM: Record<string, number> = {
  recruit: 0, cadet: 1, operator: 2, specialist: 3, commander: 4,
};
```

In the level list `LEVELS.map` block (around line 105–155), add locked logic. Change the button rendering to respect gating:

```tsx
              {(() => {
                const tierNum = TIER_NUM[t] ?? 0;
                const locked = !isTierUnlocked(tierNum);
                return (
                  <button
                    onClick={() => !locked && setSelectedLevel(l.number)}
                    disabled={locked}
                    style={{
                      width: '100%', textAlign: 'left', padding: '10px 16px',
                      display: 'flex', alignItems: 'center', gap: '10px',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      backgroundColor: locked ? 'rgba(0,0,0,0)' : active ? 'rgba(255,255,255,0.07)' : 'transparent',
                      cursor: locked ? 'not-allowed' : 'pointer', border: 'none',
                      borderLeft: active && !locked ? '2px solid #f59e0b' : '2px solid transparent',
                      opacity: locked ? 0.4 : 1,
                    }}
                  >
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: locked ? '#374151' : active ? '#f59e0b' : '#444', width: '20px', flexShrink: 0 }}>
                      {locked ? '🔒' : String(l.number).padStart(2, '0')}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '11px', fontWeight: 600, color: locked ? '#374151' : active ? '#fff' : '#888', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {locked ? 'Locked' : l.name}
                      </p>
                      <p style={{ fontSize: '10px', color: '#374151', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {locked ? 'Complete previous tier at 70%+' : l.region}
                      </p>
                    </div>
                    {!locked && (pbMap[l.number] ? (
                      <span style={{ fontSize: '9px', color: '#f59e0b', fontWeight: 800, flexShrink: 0 }}>{pbMap[l.number]}</span>
                    ) : (
                      <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 5px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.06)', color: s.text, flexShrink: 0 }}>
                        {t.slice(0, 3).toUpperCase()}
                      </span>
                    ))}
                  </button>
                );
              })()}
```

NOTE: The above replaces the existing `<button>` element inside the `Fragment`. The tier header `showTierHeader` block stays unchanged above it.

Also update the tier header to show lock status when the tier is locked. Add after the `showTierHeader &&` block:

```tsx
                {showTierHeader && (() => {
                  const tierNum = TIER_NUM[t] ?? 0;
                  const locked = !isTierUnlocked(tierNum);
                  const acc = tierNum > 0 ? getTierAccuracy(tierNum - 1) : 100;
                  return (
                    <div style={{
                      padding: '5px 14px', fontSize: '9px', fontWeight: 700,
                      color: locked ? '#374151' : s.text, letterSpacing: '0.14em', textTransform: 'uppercase',
                      backgroundColor: 'rgba(255,255,255,0.025)',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      borderTop: l.number > 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <span>{s.label} &mdash; LVL {l.number}&ndash;{Math.min(l.number + 199, 1000)}</span>
                      {locked && tierNum > 0 && (
                        <span style={{ fontSize: '8px', color: '#374151', fontWeight: 400, letterSpacing: '0.08em' }}>
                          PREV TIER {acc}% / 70% REQ
                        </span>
                      )}
                    </div>
                  );
                })()}
```

Add import for `getTierAccuracy` at the top of the file:

```typescript
import { getSessions, getTierAccuracy, isTierUnlocked } from '@/lib/storage';
```

NOTE: The existing `import { getSessions } from '@/lib/storage'` should be updated to include the new exports, not added as a duplicate import.

- [ ] **Step 3: Verify and commit Task 3**

```bash
cd C:\Users\sait9\sait\sih26247
npx tsc --noEmit
```
Expected: 0 errors.

```bash
git add lib/storage.ts app/page.tsx
git commit -m "feat: competency gating — tier lock until 70% accuracy threshold met"
```

---

## Task 4: Formal PDF Training Record (#28 — P1)

MoD-format A4 printable training record with signature block. No competitor has this. Directly addresses the PS requirement for formal training documentation.

**Files:**
- Create: `components/TrainingRecordOverlay.tsx`
- Modify: `app/aar/page.tsx`

- [ ] **Step 1: Create `components/TrainingRecordOverlay.tsx`**

```typescript
'use client';
import { Session } from '@/types';
import { scoreDecision } from '@/lib/scoring';
import type { TraineeProfile } from '@/lib/storage';

interface Props {
  profile: TraineeProfile;
  sessions: Session[];
  currentSession: Session;
  onClose: () => void;
}

export default function TrainingRecordOverlay({ profile, sessions, currentSession, onClose }: Props) {
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
            Ministry of Defence — Smart India Hackathon 2026
          </p>
          <p style={{ margin: '2px 0 0', fontSize: '9px', color: '#6b7280', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            PS26247 — AI-Enabled Counter-Drone Threat Simulation Trainer
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
              <td style={{ padding: '5px 8px', border: '1px solid #d1d5db', colSpan: 3 }}>{profile.base || '—'}</td>
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
            This record certifies that the above-named trainee has undergone computer-based counter-drone threat simulation training under the PS26247 AI-Enabled Drone & Counter-Drone Threat Simulation Trainer system. Performance data recorded herein is generated by the DroneShield Training System and is subject to instructor verification before use in formal qualification records.
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
          DroneShield Training System — SIH26247 / MoD / IAF — Generated {date}
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
```

- [ ] **Step 2: Modify `app/aar/page.tsx` — add Training Record button and overlay**

Add import:

```typescript
import TrainingRecordOverlay from '@/components/TrainingRecordOverlay';
```

Add state after existing states:

```typescript
  const [showTrainingRecord, setShowTrainingRecord] = useState(false);
```

In the Actions button row (around line 431), add a new button after the Export button:

```tsx
          <button
            onClick={() => setShowTrainingRecord(true)}
            style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: '#4b5563', fontWeight: 700, padding: '16px 20px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', fontSize: '14px' }}
          >
            &#128196; Training Record
          </button>
```

Add the overlay render at the bottom of the return, just before the closing `</div>` (after the `showCert` overlay):

```tsx
      {/* Formal MoD Training Record */}
      {showTrainingRecord && session && (
        <TrainingRecordOverlay
          profile={profile}
          sessions={history}
          currentSession={session}
          onClose={() => setShowTrainingRecord(false)}
        />
      )}
```

- [ ] **Step 3: Verify and commit Task 4**

```bash
cd C:\Users\sait9\sait\sih26247
npx tsc --noEmit
```
Expected: 0 errors.

```bash
git add components/TrainingRecordOverlay.tsx app/aar/page.tsx
git commit -m "feat: MoD-format PDF training record with signature block — no competitor has this"
```

---

## Task 5: Judge/Evaluator Demo Mode (#19 — P2)

A 60-second guided walkthrough for SIH judges. Shows all unique features via floating callout overlays during a live simulation. Activatable from the briefing header.

**Files:**
- Create: `lib/demoMode.ts`
- Modify: `app/page.tsx`
- Modify: `app/simulation/page.tsx`

- [ ] **Step 1: Create `lib/demoMode.ts`**

```typescript
export interface DemoStep {
  id: string;
  title: string;
  body: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  duration: number; // seconds before auto-advancing
}

export const DEMO_STEPS: DemoStep[] = [
  {
    id: 'map',
    title: '1/5 — Real Indian Geography',
    body: 'Pathankot AFB at actual lat/lng 32.23°N 75.63°E. Threats spawn from Pakistan Punjab IB. No other SIH submission uses real coordinates.',
    position: 'bottom-left',
    duration: 12,
  },
  {
    id: 'ooda',
    title: '2/5 — OODA Loop Doctrine',
    body: 'Click a radar blip to OBSERVE → 4-sensor tabs ORIENT → keyboard classify DECIDE → deploy countermeasure ACT. Exact IAF Air Defence workflow.',
    position: 'top-right',
    duration: 12,
  },
  {
    id: 'ai',
    title: '3/5 — Live Groq LLM AI',
    body: 'Each threat is assessed by Groq llama-3.1-8b-instant in real time. Not a fake if/else — actual LLM inference with type confidence and reasoning trace.',
    position: 'top-left',
    duration: 12,
  },
  {
    id: 'scoring',
    title: '4/5 — PS26247 Exact Scoring Formula',
    body: 'Detection(30) + Classification type(15)+intent(15) + Engagement(25) + Speed(15) − Fratricide(25). Breakdown visible per engagement in AAR.',
    position: 'bottom-right',
    duration: 12,
  },
  {
    id: 'doctrine',
    title: '5/5 — IAF Doctrine Citations',
    body: 'Every countermeasure decision references real doctrine: NACIN SOP 2023, IAF Doctrine 2022, DRDO SWM-2024. No competitor has doctrine citations.',
    position: 'center',
    duration: 12,
  },
];

export const DEMO_LEVEL = 25; // Pathankot AFB — rich WHATIF scenario, Punjab tier
```

- [ ] **Step 2: Modify `app/page.tsx` — add DEMO button**

Add import:

```typescript
import { DEMO_LEVEL } from '@/lib/demoMode';
```

In the header `<div>` right side (around line 91, after the `INSTRUCTOR` link), add a DEMO button before the SIH tag:

```tsx
          <button
            onClick={() => {
              sessionStorage.setItem('level', String(DEMO_LEVEL));
              sessionStorage.setItem('demo-mode', '1');
              router.push('/simulation');
            }}
            style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', letterSpacing: '0.05em' }}
          >
            DEMO &#9654;
          </button>
```

- [ ] **Step 3: Modify `app/simulation/page.tsx` — add demo overlay**

Add imports:

```typescript
import { DEMO_STEPS, type DemoStep } from '@/lib/demoMode';
```

Add state after existing states (around line 30):

```typescript
  const [demoMode, setDemoMode] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const demoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

In the `useEffect` that reads sessionStorage level (lines 32–36), also check demo-mode:

```typescript
  useEffect(() => {
    const stored = sessionStorage.getItem('level');
    if (stored) setLevelNum(Number(stored));
    if (sessionStorage.getItem('demo-mode') === '1') {
      setDemoMode(true);
      sessionStorage.removeItem('demo-mode');
    }
    setReady(true);
  }, []);
```

Add a demo step auto-advance effect after the existing effects:

```typescript
  useEffect(() => {
    if (!demoMode) return;
    if (demoStep >= DEMO_STEPS.length) return;
    const step = DEMO_STEPS[demoStep];
    demoTimerRef.current = setTimeout(() => {
      setDemoStep(s => s + 1);
    }, step.duration * 1000);
    return () => {
      if (demoTimerRef.current) clearTimeout(demoTimerRef.current);
    };
  }, [demoMode, demoStep]);
```

Add the demo overlay JSX inside the map container `<div>` (before `</div>` that closes the map area, around line 422). Place it before the `<style>` block:

```tsx
        {/* Demo mode overlay — judge walkthrough */}
        {demoMode && demoStep < DEMO_STEPS.length && (() => {
          const step = DEMO_STEPS[demoStep];
          const posStyle: Record<string, React.CSSProperties> = {
            'top-left':     { top: '56px',   left: '14px' },
            'top-right':    { top: '56px',   right: '14px' },
            'bottom-left':  { bottom: '56px', left: '14px' },
            'bottom-right': { bottom: '56px', right: '14px' },
            'center':       { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
          };
          return (
            <div style={{
              position: 'absolute', zIndex: 2000, maxWidth: '280px',
              backgroundColor: 'rgba(10,10,15,0.97)',
              border: '1px solid rgba(245,158,11,0.5)',
              borderRadius: '14px', padding: '14px 16px',
              boxShadow: '0 0 40px rgba(245,158,11,0.15)',
              ...posStyle[step.position],
            }}>
              <p style={{ margin: '0 0 4px', fontSize: '9px', fontWeight: 800, color: '#f59e0b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                SIH JUDGE DEMO
              </p>
              <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 700, color: '#fff' }}>{step.title}</p>
              <p style={{ margin: '0 0 10px', fontSize: '11px', color: '#9ca3af', lineHeight: '1.5' }}>{step.body}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '9px', color: '#374151' }}>Auto-advance in {step.duration}s</span>
                <button
                  onClick={() => setDemoStep(s => s + 1)}
                  style={{ background: '#f59e0b', color: '#0a0a0f', border: 'none', borderRadius: '999px', padding: '4px 12px', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}
                >
                  Next &rarr;
                </button>
              </div>
            </div>
          );
        })()}
        {demoMode && demoStep >= DEMO_STEPS.length && (
          <div style={{
            position: 'absolute', zIndex: 2000,
            top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(10,10,15,0.97)',
            border: '1px solid rgba(34,197,94,0.4)',
            borderRadius: '14px', padding: '16px 20px', textAlign: 'center',
          }}>
            <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 800, color: '#22c55e' }}>Demo Complete</p>
            <p style={{ margin: '0 0 8px', fontSize: '11px', color: '#6b7280' }}>Continue playing or abort to briefing</p>
            <button onClick={() => setDemoMode(false)} style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '999px', padding: '6px 16px', fontSize: '11px', cursor: 'pointer' }}>Dismiss</button>
          </div>
        )}
```

- [ ] **Step 4: Verify and commit Task 5**

```bash
cd C:\Users\sait9\sait\sih26247
npx tsc --noEmit
```
Expected: 0 errors.

```bash
git add lib/demoMode.ts app/page.tsx app/simulation/page.tsx
git commit -m "feat: judge demo mode — 60s guided walkthrough highlighting unique features"
```

---

## Task 6: Language / Terminology Rename (#17 — P1)

Removes game language that makes the system feel like entertainment software rather than a military training tool. Quick but high-signal change for evaluators.

**Files:**
- Modify: `lib/achievements.ts`
- Modify: `app/aar/page.tsx`
- Modify: `app/simulation/page.tsx`

- [ ] **Step 1: Modify `lib/achievements.ts` — rename game-ish achievement names**

In `ACHIEVEMENT_DEFS`, update the following `name` and `description` fields:

```typescript
// id: 'first-neutralize'
name: 'First Intercept',
description: 'Successfully neutralise your first drone threat',

// id: 'perfect-mission'
name: 'Flawless Engagement',
description: 'Complete a mission with 100% classification accuracy and zero breaches',

// id: 'ironclad'
name: 'Asset Integrity',
description: 'Complete a mission with base health at 100% (3+ engagements)',

// id: 'speed-demon'
name: 'Rapid Response',
description: 'Classify and deploy a correct countermeasure in under 2 seconds',

// id: 'no-fratricide-5'
name: 'No-Fratricide Record',
description: 'Complete 5 consecutive missions without engaging a neutral or friendly asset',

// id: 'swarm-master'
name: 'Swarm Specialist',
description: 'Correctly identify and neutralise 10 swarm threats across all training sessions',

// id: 'ai-skeptic'
name: 'Independent Assessment',
description: 'Correctly classify 5 threats where the AI assessment was incorrect',

// id: 'veteran'
name: 'Field Experience',
description: 'Complete 10 training sorties',
```

(Tier-clearing achievements — tier-1-clear through capital-defender — already have appropriate military names, leave unchanged.)

- [ ] **Step 2: Modify `app/aar/page.tsx` — rename ACHIEVEMENTS heading**

Find (line ~325):
```tsx
            &#127942; ACHIEVEMENTS UNLOCKED THIS SESSION
```

Replace with:
```tsx
            &#127942; COMPETENCY BADGES EARNED
```

- [ ] **Step 3: Modify `app/simulation/page.tsx` — rename streak toast messages**

Find (line ~105):
```typescript
      const msg = streak >= 20 ? '20× STREAK — ELITE OPERATOR' : streak >= 10 ? '10× STREAK — EXCEPTIONAL' : '5× STREAK — GREAT WORK';
```

Replace with:
```typescript
      const msg = streak >= 20 ? '20 CONSECUTIVE — ELITE OPERATOR' : streak >= 10 ? '10 CONSECUTIVE — EXCEPTIONAL PERFORMANCE' : '5 CONSECUTIVE — CONSISTENT PERFORMANCE';
```

- [ ] **Step 4: Verify, final build, and commit Task 6**

```bash
cd C:\Users\sait9\sait\sih26247
npx tsc --noEmit
```
Expected: 0 errors.

```bash
npx next build
```
Expected: Build completes with no errors.

```bash
git add lib/achievements.ts app/aar/page.tsx app/simulation/page.tsx
git commit -m "feat: rename game-language to training-language throughout UI"
```

---

## Final Verification

After all 6 tasks are complete:

```bash
cd C:\Users\sait9\sait\sih26247
npx tsc --noEmit   # must be 0 errors
npx next build     # must succeed
```

Manual checklist:
- [ ] Briefing page: header shows `DEMO ▶` button
- [ ] Briefing page: tier 1+ shows lock icon when previous tier below 70%
- [ ] Tutorial overlay: shows rank dropdown + name + serviceNo + unit + base fields
- [ ] Simulation: clicking DEMO from briefing shows step overlays at 12s intervals
- [ ] Simulation: threats spawn more often as the trainee's weak type (adaptive weighting active)
- [ ] AAR: header shows `Sqn Ldr Sharma · No. 1 Sqn` (if profile filled)
- [ ] AAR: "AI TACTICAL COACH" section appears after a session with weak areas
- [ ] AAR: "Training Record" button opens MoD-format A4 overlay
- [ ] AAR: "Training Record" overlay shows signature blocks
- [ ] AAR: achievement section heading reads "COMPETENCY BADGES EARNED"
- [ ] Instructor page: unit record shows rank + name + service no + unit + base

---

## Self-Review

**Spec coverage:**
- #31 AI-Adaptive: `lib/adaptiveEngine.ts` (weakness profile + weighted spawn) + `app/api/coaching/route.ts` (Groq coaching) + useGameState.ts (adaptive spawn) + aar/page.tsx (coaching section) ✅
- #32 Score breakdown: ALREADY DONE — `ScoringBreakdown` component confirmed in `app/aar/page.tsx` lines 122–148 ✅
- #15 Trainee profile: storage.ts (TraineeProfile) + page.tsx (full form) + aar/page.tsx (header) + instructor/page.tsx (unit record) ✅
- #16 Competency gating: storage.ts (getTierAccuracy/isTierUnlocked) + page.tsx (locked level buttons) ✅
- #17 Language rename: achievements.ts (military names) + aar/page.tsx (badges heading) + simulation/page.tsx (streak text) ✅
- #28 PDF Training Record: TrainingRecordOverlay.tsx (full A4 with signature blocks) + aar/page.tsx (button + overlay) ✅
- #19 Demo Mode: demoMode.ts (5 steps) + page.tsx (DEMO button) + simulation/page.tsx (overlay panel) ✅

**Placeholder scan:** No "TBD" or "TODO" entries. All code blocks are complete.

**Type consistency:**
- `TraineeProfile` defined in `lib/storage.ts`, imported via `@/lib/storage` in all consumers ✅
- `CoachingReport` defined in `lib/adaptiveEngine.ts`, imported via `@/lib/adaptiveEngine` in `app/api/coaching/route.ts` and `app/aar/page.tsx` ✅
- `DemoStep` defined in `lib/demoMode.ts`, imported in `app/simulation/page.tsx` ✅
- `spawnThreatFromLevel` signature updated with optional `typeOverride?: ThreatType` — backward compatible (all existing callers pass only 2 args) ✅
