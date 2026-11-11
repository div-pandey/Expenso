import type { UserProfile } from '../types';

export interface AuthSessionData {
  token: string;
  userId: string;
  userEmail: string;
  userFullName: string;
  inviteCode: string;
  issuedAt: number;
  lastRefreshedAt: number;
  lastActiveAt: number;
}

export interface LoginHistoryEntry {
  userId: string;
  userEmail: string;
  userFullName: string;
  inviteCode: string;
  lastLoginAt: number;
}

export const AUTH_SESSION_KEY = 'expenso_auth_session_token';
export const LOGIN_HISTORY_KEY = 'expenso_login_history';

// 60 days in milliseconds: 60 * 24 * 60 * 60 * 1000 = 5,184,000,000 ms
export const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

// 24 hours in milliseconds: 24 * 60 * 60 * 1000 = 86,400,000 ms
export const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

function generateSecureToken(userId: string): string {
  const randomPart = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const timePart = Date.now().toString(36);
  return `exp_tok_${userId.replace(/[^a-zA-Z0-9]/g, '')}_${randomPart}_${timePart}`;
}

/**
 * Saves a new authentication session token and logs into login history (without password).
 */
export function saveAuthSession(user: UserProfile): AuthSessionData {
  const now = Date.now();
  const token = generateSecureToken(user.id);

  const session: AuthSessionData = {
    token,
    userId: user.id,
    userEmail: user.email || '',
    userFullName: user.fullName || '',
    inviteCode: user.inviteCode || '',
    issuedAt: now,
    lastRefreshedAt: now,
    lastActiveAt: now,
  };

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));

      // Append to login history without storing any sensitive passwords
      const historyRaw = localStorage.getItem(LOGIN_HISTORY_KEY);
      let history: LoginHistoryEntry[] = [];
      if (historyRaw) {
        try {
          history = JSON.parse(historyRaw);
          if (!Array.isArray(history)) history = [];
        } catch {
          history = [];
        }
      }

      // Filter out duplicate and add latest entry
      history = history.filter((h) => h.userId !== user.id);
      history.unshift({
        userId: user.id,
        userEmail: user.email || '',
        userFullName: user.fullName || '',
        inviteCode: user.inviteCode || '',
        lastLoginAt: now,
      });

      // Keep last 10 login history records
      localStorage.setItem(LOGIN_HISTORY_KEY, JSON.stringify(history.slice(0, 10)));
    }
  } catch (e) {
    console.warn('[authSession] Could not save session token to localStorage', e);
  }

  return session;
}

/**
 * Validates the stored session token:
 * - If user didn't open the app for 60+ days, clears session memory and returns null.
 * - If within 60 days, refreshes the token if 24 hours have passed and updates lastActiveAt.
 */
export function getValidAuthSession(): { session: AuthSessionData | null; expired: boolean } {
  try {
    if (typeof localStorage === 'undefined') {
      return { session: null, expired: false };
    }

    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) {
      return { session: null, expired: false };
    }

    const session: AuthSessionData = JSON.parse(raw);
    const now = Date.now();

    // 1. Check if user didn't open app for 60 days in a row
    if (now - session.lastActiveAt > SIXTY_DAYS_MS) {
      clearAuthSession();
      return { session: null, expired: true };
    }

    // 2. Token Refresh: If more than 24 hours have passed since last token refresh, rotate the token
    if (now - session.lastRefreshedAt >= TWENTY_FOUR_HOURS_MS) {
      session.token = generateSecureToken(session.userId);
      session.lastRefreshedAt = now;
    }

    // 3. Update last active timestamp
    session.lastActiveAt = now;
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));

    return { session, expired: false };
  } catch (e) {
    console.warn('[authSession] Error verifying session token', e);
    return { session: null, expired: false };
  }
}

/**
 * Clears the session token from memory/cache (e.g. on manual logout or 60-day expiry).
 */
export function clearAuthSession(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(AUTH_SESSION_KEY);
    }
  } catch (e) {
    console.warn('[authSession] Could not remove session token', e);
  }
}

/**
 * Returns the non-sensitive login history (emails and full names, no passwords).
 */
export function getLoginHistory(): LoginHistoryEntry[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(LOGIN_HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {}
  return [];
}

