import { spawnThreat, getCorrectCountermeasure, getDifficultyConfig } from '@/lib/scenario';

describe('spawnThreat', () => {
  it('returns a threat with required fields', () => {
    const threat = spawnThreat('easy');
    expect(threat.id).toBeDefined();
    expect(threat.type).toBeDefined();
    expect(threat.intent).toBeDefined();
    expect(threat.neutralized).toBe(false);
  });

  it('spawns only commercial threats on easy', () => {
    for (let i = 0; i < 30; i++) {
      const threat = spawnThreat('easy');
      expect(threat.type).toBe('commercial');
    }
  });

  it('spawns all types on hard', () => {
    const types = new Set<string>();
    for (let i = 0; i < 100; i++) {
      types.add(spawnThreat('hard').type);
    }
    expect(types.has('commercial')).toBe(true);
    expect(types.has('military')).toBe(true);
    expect(types.has('swarm')).toBe(true);
  });

  it('spawns decoy with neutral intent', () => {
    const threat = spawnThreat('hard', true);
    expect(threat.isDecoy).toBe(true);
    expect(threat.intent).toBe('neutral');
  });

  it('non-decoy threat has hostile intent', () => {
    for (let i = 0; i < 20; i++) {
      const threat = spawnThreat('easy', false);
      expect(threat.intent).toBe('hostile');
    }
  });
});

describe('getCorrectCountermeasure', () => {
  it('returns rf-jammer for hostile commercial', () => {
    expect(getCorrectCountermeasure('commercial', 'hostile')).toBe('rf-jammer');
  });

  it('returns interceptor for hostile military', () => {
    expect(getCorrectCountermeasure('military', 'hostile')).toBe('interceptor');
  });

  it('returns ew for hostile swarm', () => {
    expect(getCorrectCountermeasure('swarm', 'hostile')).toBe('ew');
  });

  it('returns alert-evacuate for neutral intent regardless of type', () => {
    expect(getCorrectCountermeasure('military', 'neutral')).toBe('alert-evacuate');
    expect(getCorrectCountermeasure('commercial', 'friendly')).toBe('alert-evacuate');
  });
});

describe('getDifficultyConfig', () => {
  it('easy allows max 1 concurrent threat', () => {
    expect(getDifficultyConfig('easy').maxConcurrent).toBe(1);
  });

  it('hard allows up to 10 concurrent threats', () => {
    expect(getDifficultyConfig('hard').maxConcurrent).toBe(10);
  });
});
