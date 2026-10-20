import { getSessions, saveSession, clearSessions } from '@/lib/storage';
import { Session } from '@/types';

const mockSession: Session = {
  id: 'test-1',
  difficulty: 'easy',
  level: 1,
  score: 75,
  startedAt: 1000,
  endedAt: 2000,
  decisions: [],
};

beforeEach(() => {
  localStorage.clear();
});

describe('getSessions', () => {
  it('returns empty array when nothing stored', () => {
    expect(getSessions()).toEqual([]);
  });
});

describe('saveSession + getSessions', () => {
  it('persists and retrieves a session', () => {
    saveSession(mockSession);
    const sessions = getSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe('test-1');
    expect(sessions[0].score).toBe(75);
  });

  it('accumulates multiple sessions', () => {
    saveSession(mockSession);
    saveSession({ ...mockSession, id: 'test-2' });
    expect(getSessions()).toHaveLength(2);
  });
});

describe('clearSessions', () => {
  it('removes all sessions', () => {
    saveSession(mockSession);
    clearSessions();
    expect(getSessions()).toEqual([]);
  });
});
