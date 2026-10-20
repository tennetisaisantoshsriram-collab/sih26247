import { scoreDecision, computeSessionScore, avgResponseTime, classificationAccuracy } from '@/lib/scoring';
import { Decision } from '@/types';

const makeDecision = (overrides: Partial<Decision> = {}): Decision => ({
  threatId: 'id-1',
  threatType: 'commercial',
  intent: 'hostile',
  classifiedAs: 'commercial',
  classifiedIntent: 'hostile',
  countermeasure: 'rf-jammer',
  correct: true,
  responseTimeMs: 0,
  detectionTimeMs: 0,
  timestamp: Date.now(),
  path: [],
  spawnLat: 0,
  spawnLng: 0,
  ...overrides,
});

describe('scoreDecision', () => {
  it('returns 0 for incorrect decision', () => {
    expect(scoreDecision(makeDecision({
      classifiedAs: 'military',
      classifiedIntent: 'neutral',
      countermeasure: 'interceptor',
      detectionTimeMs: 15000,
      responseTimeMs: 10000,
    }))).toBe(0);
  });

  it('returns 100 for instant correct decision', () => {
    expect(scoreDecision(makeDecision({ responseTimeMs: 0 }))).toBe(100);
  });

  it('returns lower score for slower response', () => {
    const fast = scoreDecision(makeDecision({ responseTimeMs: 1000 }));
    const slow = scoreDecision(makeDecision({ responseTimeMs: 8000 }));
    expect(fast).toBeGreaterThan(slow);
  });

  it('never returns negative', () => {
    expect(scoreDecision(makeDecision({ responseTimeMs: 99999 }))).toBeGreaterThanOrEqual(0);
  });
});

describe('computeSessionScore', () => {
  it('returns 0 for empty session', () => {
    expect(computeSessionScore([])).toBe(0);
  });

  it('returns 600 for all perfect decisions (500 base + 100 consistency bonus)', () => {
    const decisions = Array(5).fill(null).map(() => makeDecision({ responseTimeMs: 0 }));
    expect(computeSessionScore(decisions)).toBe(600);
  });

  it('returns 0 for all wrong decisions', () => {
    const decisions = Array(5).fill(null).map(() => makeDecision({
      classifiedAs: 'military',
      classifiedIntent: 'neutral',
      countermeasure: 'interceptor',
      correct: false,
      detectionTimeMs: 15000,
      responseTimeMs: 10000,
    }));
    expect(computeSessionScore(decisions)).toBe(0);
  });
});

describe('avgResponseTime', () => {
  it('returns 0 for empty array', () => {
    expect(avgResponseTime([])).toBe(0);
  });

  it('returns average of response times', () => {
    const decisions = [
      makeDecision({ responseTimeMs: 2000 }),
      makeDecision({ responseTimeMs: 4000 }),
    ];
    expect(avgResponseTime(decisions)).toBe(3000);
  });
});

describe('classificationAccuracy', () => {
  it('returns 0 for empty array', () => {
    expect(classificationAccuracy([])).toBe(0);
  });

  it('returns 50 for half correct', () => {
    const decisions = [
      makeDecision({ correct: true }),
      makeDecision({ correct: false }),
    ];
    expect(classificationAccuracy(decisions)).toBe(50);
  });
});
