import { UserProfile, UserSession } from '../types';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const USERS_LIST_KEY = 'finanflow_registered_users_v1';
const CURRENT_SESSION_KEY = 'finanflow_active_session_v1';

/**
 * Get all registered users on this browser
 */
export function getRegisteredUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(USERS_LIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('Error fetching registered users:', error);
    return [];
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

  // Also check in Cloud Firestore
  try {
    const userDocRef = doc(db, 'users', cleanDocId);
    const cloudUserSnap = await getDoc(userDocRef);
    if (cloudUserSnap.exists()) {
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

  // Save to Cloud Firestore
  try {
    const userDocRef = doc(db, 'users', cleanDocId);
    await setDoc(userDocRef, {
      id: userId,
      email: cleanEmail,
      name: newUser.name,
      passwordHash: newUser.passwordHash,
      createdAt: now,
      lastLoginAt: now,
      mode: newUser.mode,
      companyName: newUser.companyName || '',
    });
  } catch (e) {
    console.error('Error creating user profile in cloud:', e);
  }

  users.push(newUser);
  saveRegisteredUsers(users);

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

  // If not found locally, search in Cloud Firestore (e.g., user created on mobile and logging in on PC)
  if (!user) {
    try {
      const userDocRef = doc(db, 'users', cleanDocId);
      const cloudSnap = await getDoc(userDocRef);
      if (cloudSnap.exists()) {
        const cloudData = cloudSnap.data() as UserProfile;
        user = {
          id: cloudData.id || `usr_${cleanDocId}`,
          email: cloudData.email,
          name: cloudData.name,
          passwordHash: cloudData.passwordHash || '1234',
          createdAt: cloudData.createdAt || new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          mode: cloudData.mode || 'personal',
          companyName: cloudData.companyName,
        };
        // Add to local users
        users.push(user);
        saveRegisteredUsers(users);
      }
    } catch (e) {
      console.error('Error fetching cloud user during login:', e);
    }
  }

  if (!user) {
    return { success: false, error: 'No se encontró ninguna cuenta con este correo. Regístrate primero.' };
  }

  if (params.password && user.passwordHash && user.passwordHash !== params.password) {
    return { success: false, error: 'Contraseña incorrecta. Por favor intenta de nuevo.' };
  }

  const now = new Date().toISOString();
  user.lastLoginAt = now;
  saveRegisteredUsers(users);

  // Update cloud last login
  try {
    const userDocRef = doc(db, 'users', cleanDocId);
    await setDoc(userDocRef, { lastLoginAt: now }, { merge: true });
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
