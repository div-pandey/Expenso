import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveAuthSession,
  getValidAuthSession,
  clearAuthSession,
  getLoginHistory,
  SIXTY_DAYS_MS,
  TWENTY_FOUR_HOURS_MS,
} from '../authSession';
import type { UserProfile } from '../../types';

// Mock localStorage for Node test runner
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Auth Session Token & 60-Day Memory Engine', () => {
  const mockUser: UserProfile = {
    id: 'user_divyansh',
    email: 'divyansh@example.com',
    fullName: 'Divyansh Sharma',
    initials: 'DS',
    avatarColor: '#12543F',
    inviteCode: 'DIVY24',
    createdAt: new Date().toISOString(),
    isOnboarded: true,
  };

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('generates and stores secure login token without saving passwords', () => {
    const session = saveAuthSession(mockUser);

    expect(session.token).toBeDefined();
    expect(session.token.startsWith('exp_tok_')).toBe(true);
    expect(session.userId).toBe('user_divyansh');
    expect(session.userEmail).toBe('divyansh@example.com');
    // Ensure password is not present in session object
    expect((session as unknown as Record<string, unknown>).password).toBeUndefined();

    // Verify session retrieval
    const { session: activeSession, expired } = getValidAuthSession();
    expect(expired).toBe(false);
    expect(activeSession?.userId).toBe('user_divyansh');
    expect(activeSession?.token).toBe(session.token);

    // Verify login history
    const history = getLoginHistory();
    expect(history.length).toBe(1);
    expect(history[0].userEmail).toBe('divyansh@example.com');
    expect((history[0] as unknown as Record<string, unknown>).password).toBeUndefined();
  });

  it('refreshes token every 24 hours while keeping user signed in', () => {
    const initialSession = saveAuthSession(mockUser);
    const initialToken = initialSession.token;

    // Fast-forward 25 hours (greater than 24 hours)
    const twentyFiveHoursLater = Date.now() + TWENTY_FOUR_HOURS_MS + 3600000;
    vi.spyOn(Date, 'now').mockReturnValue(twentyFiveHoursLater);

    const { session: refreshedSession, expired } = getValidAuthSession();
    expect(expired).toBe(false);
    expect(refreshedSession).not.toBeNull();
    // Token should have been refreshed to a new value
    expect(refreshedSession?.token).not.toBe(initialToken);
    expect(refreshedSession?.token.startsWith('exp_tok_')).toBe(true);
    expect(refreshedSession?.userId).toBe('user_divyansh');
  });

  it('clears session memory and sends to login if user did not open app for 60 days', () => {
    saveAuthSession(mockUser);

    // Fast-forward 61 days (user inactive for over 60 days)
    const sixtyOneDaysLater = Date.now() + SIXTY_DAYS_MS + 86400000;
    vi.spyOn(Date, 'now').mockReturnValue(sixtyOneDaysLater);

    const { session, expired } = getValidAuthSession();
    expect(expired).toBe(true);
    expect(session).toBeNull();

    // Session cache must be completely cleared from storage
    const secondCheck = getValidAuthSession();
    expect(secondCheck.session).toBeNull();
  });

  it('clears session upon explicit logout', () => {
    saveAuthSession(mockUser);
    expect(getValidAuthSession().session).not.toBeNull();

    clearAuthSession();
    expect(getValidAuthSession().session).toBeNull();
  });
});
