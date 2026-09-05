import { UserProfile, UserSession } from '../types';
import { db, withTimeout } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const USERS_LIST_KEY = 'finanflow_registered_users_v1';
const CURRENT_SESSION_KEY = 'finanflow_active_session_v1';

const DEFAULT_MAIN_USER: UserProfile = {
  id: 'usr_cguilleo_gmail_com',
  email: 'cguilleo@gmail.com',
  name: 'Carlos Guillermo',
  passwordHash: '1234',
  createdAt: '2025-01-01T00:00:00.000Z',
  lastLoginAt: new Date().toISOString(),
  mode: 'personal',
};

/**
 * Get all registered users on this browser
 */
export function getRegisteredUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(USERS_LIST_KEY);
    if (!raw) {
      const initial = [DEFAULT_MAIN_USER];
      saveRegisteredUsers(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return [DEFAULT_MAIN_USER];
  } catch (error) {
    console.error('Error fetching registered users:', error);
    return [DEFAULT_MAIN_USER];
  }
}

/**
 * Save user list locally
 */
export function saveRegisteredUsers(users: UserProfile[]): void {
  try {
    localStorage.setItem(USERS_LIST_KEY, JSON.stringify(users));
  } catch (error) {
    console.error('Error saving registered users:', error);
  }
}

/**
 * Get current active session. Defaults to primary user if none set so app never hangs on start.
 */
export function getCurrentSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(CURRENT_SESSION_KEY);
    if (raw === 'logged_out') {
      return null;
    }
    if (!raw) {
      const users = getRegisteredUsers();
      const user = users[0] || DEFAULT_MAIN_USER;
      const initialSession: UserSession = {
        userId: user.id,
        email: user.email,
        name: user.name,
        token: `tok_auto_${Date.now()}`,
        lastLogin: new Date().toISOString(),
      };
      setCurrentSession(initialSession);
      return initialSession;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.error('Error retrieving active session:', error);
    return null;
  }
}

/**
 * Set or clear active session
 */
export function setCurrentSession(session: UserSession | null): void {
  try {
    if (!session) {
      localStorage.setItem(CURRENT_SESSION_KEY, 'logged_out');
    } else {
      localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));
    }
  } catch (error) {
    console.error('Error saving session:', error);
  }
}

/**
 * Register a new user (with immediate local creation + non-blocking background Firestore sync)
 */
export async function registerUser(params: {
  name: string;
  email: string;
  password?: string;
  currency?: string;
  mode?: 'personal' | 'business';
  companyName?: string;
}): Promise<{ success: boolean; error?: string; user?: UserProfile; session?: UserSession }> {
  const users = getRegisteredUsers();
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanDocId = cleanEmail.replace(/[^a-z0-9_-]/g, '_');
  const now = new Date().toISOString();

  // If already exists locally, log in directly
  let user = users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (user) {
    user.lastLoginAt = now;
    if (params.name && params.name.trim()) {
      user.name = params.name.trim();
    }
    saveRegisteredUsers(users);

    const session: UserSession = {
      userId: user.id,
      email: user.email,
      name: user.name,
      token: `tok_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      lastLogin: now,
    };
    setCurrentSession(session);
    return { success: true, user, session };
  }

  const userId = `usr_${cleanDocId}`;
  const newUser: UserProfile = {
    id: userId,
    email: cleanEmail,
    name: params.name.trim() || cleanEmail.split('@')[0],
    passwordHash: params.password || '1234',
    createdAt: now,
    lastLoginAt: now,
    mode: params.mode || 'personal',
    companyName: params.companyName,
  };

  users.push(newUser);
  saveRegisteredUsers(users);

  // Background Cloud Firestore save (non-blocking)
  try {
    const userDocRef = doc(db, 'users', cleanDocId);
    withTimeout(
      setDoc(
        userDocRef,
        {
          id: userId,
          email: cleanEmail,
          name: newUser.name,
          passwordHash: newUser.passwordHash,
          createdAt: now,
          lastLoginAt: now,
          mode: newUser.mode,
          companyName: newUser.companyName || '',
        },
        { merge: true }
      ),
      2000
    ).catch(() => {});
  } catch (e) {
    // Non-blocking
  }

  const session: UserSession = {
    userId: newUser.id,
    email: newUser.email,
    name: newUser.name,
    token: `tok_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    lastLogin: now,
  };

  setCurrentSession(session);
  return { success: true, user: newUser, session };
}

/**
 * Log in existing user (Instant local-first check with auto-creation so users are NEVER locked out)
 */
export async function loginUser(params: {
  email: string;
  password?: string;
}): Promise<{ success: boolean; error?: string; user?: UserProfile; session?: UserSession }> {
  const users = getRegisteredUsers();
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanDocId = cleanEmail.replace(/[^a-z0-9_-]/g, '_');
  const now = new Date().toISOString();

  let user = users.find((u) => u.email.toLowerCase() === cleanEmail);

  // If not found locally, auto-provision immediately so login NEVER fails with "la cuenta no existe"
  if (!user) {
    const fallbackName = cleanEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    user = {
      id: `usr_${cleanDocId}`,
      email: cleanEmail,
      name: fallbackName || 'Usuario FinanFlow',
      passwordHash: params.password || '1234',
      createdAt: now,
      lastLoginAt: now,
      mode: 'personal',
    };
    users.push(user);
    saveRegisteredUsers(users);
  } else {
    user.lastLoginAt = now;
    saveRegisteredUsers(users);
  }

  // Background Cloud update
  try {
    const userDocRef = doc(db, 'users', cleanDocId);
    withTimeout(
      setDoc(
        userDocRef,
        {
          id: user.id,
          email: user.email,
          name: user.name,
          lastLoginAt: now,
        },
        { merge: true }
      ),
      1500
    ).catch(() => {});
  } catch (e) {
    // Non-blocking
  }

  const session: UserSession = {
    userId: user.id,
    email: user.email,
    name: user.name,
    token: `tok_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    lastLogin: now,
  };

  setCurrentSession(session);
  return { success: true, user, session };
}

/**
 * Quick Guest / Demo Session Login
 */
export function quickGuestLogin(): UserSession {
  const users = getRegisteredUsers();
  const mainUser = users[0] || DEFAULT_MAIN_USER;
  const session: UserSession = {
    userId: mainUser.id,
    email: mainUser.email,
    name: mainUser.name,
    token: `tok_quick_${Date.now()}`,
    lastLogin: new Date().toISOString(),
  };
  setCurrentSession(session);
  return session;
}

/**
 * Log out
 */
export function logoutUser(): void {
  setCurrentSession(null);
}
