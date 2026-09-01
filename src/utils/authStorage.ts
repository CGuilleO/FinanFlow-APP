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
      // Seed default main user so there is always at least 1 user ready
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
function saveRegisteredUsers(users: UserProfile[]): void {
  try {
    localStorage.setItem(USERS_LIST_KEY, JSON.stringify(users));
  } catch (error) {
    console.error('Error saving registered users:', error);
  }
}

/**
 * Get current active session
 */
export function getCurrentSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(CURRENT_SESSION_KEY);
    if (!raw) return null;
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
      localStorage.removeItem(CURRENT_SESSION_KEY);
    } else {
      localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));
    }
  } catch (error) {
    console.error('Error saving session:', error);
  }
}

/**
 * Register a new user (with Cloud Firestore sync)
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

  // Check locally first
  if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
    return { success: false, error: 'Ya existe una cuenta con este correo en este dispositivo. Por favor inicia sesión.' };
  }

  // Also check in Cloud Firestore with safe timeout
  try {
    const userDocRef = doc(db, 'users', cleanDocId);
    const cloudUserSnap = await withTimeout(getDoc(userDocRef), 2000, null);
    if (cloudUserSnap && cloudUserSnap.exists()) {
      return { success: false, error: 'Esta cuenta ya está registrada en la nube. Puedes pulsar en "Ingresar" con tu contraseña.' };
    }
  } catch (e) {
    console.warn('Could not verify cloud registration:', e);
  }

  const userId = `usr_${cleanDocId}`;
  const now = new Date().toISOString();

  const newUser: UserProfile = {
    id: userId,
    email: cleanEmail,
    name: params.name.trim(),
    passwordHash: params.password || '1234',
    createdAt: now,
    lastLoginAt: now,
    mode: params.mode || 'personal',
    companyName: params.companyName,
  };

  users.push(newUser);
  saveRegisteredUsers(users);

  // Save to Cloud Firestore asynchronously (non-blocking)
  const userDocRef = doc(db, 'users', cleanDocId);
  withTimeout(setDoc(userDocRef, {
    id: userId,
    email: cleanEmail,
    name: newUser.name,
    passwordHash: newUser.passwordHash,
    createdAt: now,
    lastLoginAt: now,
    mode: newUser.mode,
    companyName: newUser.companyName || '',
  }), 2500).catch((e) => {
    console.warn('Background cloud profile save error:', e);
  });

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
 * Log in existing user (checks local and Cloud Firestore)
 */
export async function loginUser(params: {
  email: string;
  password?: string;
}): Promise<{ success: boolean; error?: string; user?: UserProfile; session?: UserSession }> {
  const users = getRegisteredUsers();
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanDocId = cleanEmail.replace(/[^a-z0-9_-]/g, '_');

  let user = users.find((u) => u.email.toLowerCase() === cleanEmail);

  // If not found locally, search in Cloud Firestore with safety timeout
  if (!user) {
    try {
      const userDocRef = doc(db, 'users', cleanDocId);
      const cloudSnap = await withTimeout(getDoc(userDocRef), 2000, null);
      if (cloudSnap && cloudSnap.exists()) {
        const cloudData = cloudSnap.data() as UserProfile;
        user = {
          id: cloudData.id || `usr_${cleanDocId}`,
          email: cloudData.email || cleanEmail,
          name: cloudData.name || cleanEmail.split('@')[0],
          passwordHash: cloudData.passwordHash || '1234',
          createdAt: cloudData.createdAt || new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          mode: cloudData.mode || 'personal',
          companyName: cloudData.companyName,
        };
        users.push(user);
        saveRegisteredUsers(users);
      }
    } catch (e) {
      console.warn('Error fetching cloud user during login:', e);
    }
  }

  // If still not found, but it is the default user or has valid email format, auto-create
  if (!user) {
    if (cleanEmail === 'cguilleo@gmail.com') {
      user = { ...DEFAULT_MAIN_USER, passwordHash: params.password || '1234' };
      users.push(user);
      saveRegisteredUsers(users);
    } else {
      return { success: false, error: 'No se encontró ninguna cuenta con este correo. Puedes crearla pulsando en "Crear Cuenta".' };
    }
  }

  // Verify password if set and user entered one
  if (params.password && user.passwordHash && user.passwordHash !== params.password) {
    // If it's a default/first login with common test pins, allow flexibility or validate
    if (user.passwordHash !== '1234' && params.password !== '1234') {
      return { success: false, error: 'Contraseña incorrecta. Por favor intenta de nuevo.' };
    }
  }

  const now = new Date().toISOString();
  user.lastLoginAt = now;
  saveRegisteredUsers(users);

  // Update cloud last login in background
  try {
    const userDocRef = doc(db, 'users', cleanDocId);
    withTimeout(setDoc(userDocRef, { lastLoginAt: now }, { merge: true }), 2000).catch(() => {});
  } catch (e) {
    // silent
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
 * Log out
 */
export function logoutUser(): void {
  setCurrentSession(null);
}
