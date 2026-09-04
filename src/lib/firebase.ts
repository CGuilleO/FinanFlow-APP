import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  collection, 
  getDocs,
  writeBatch 
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Database ID configured for this project
export const FIRESTORE_DB_ID = 'ai-studio-finanflowinsight-57940131-7500-48b2-9226-2b1063c6630f';
export const db = getFirestore(app, FIRESTORE_DB_ID);
export const auth = getAuth(app);

/**
 * Utility to run any async promise with a max timeout to prevent infinite freezes
 */
export async function withTimeout<T>(promise: Promise<T>, ms: number = 2500, fallbackVal?: T): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((resolve, reject) => {
    timer = setTimeout(() => {
      if (fallbackVal !== undefined) {
        resolve(fallbackVal);
      } else {
        reject(new Error(`Timeout de operación después de ${ms}ms`));
      }
    }, ms);
  });

  return Promise.race([
    promise.then((res) => {
      clearTimeout(timer);
      return res;
    }),
    timeoutPromise
  ]);
}

// Configure Google Auth Provider with Gmail Scopes
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/gmail.readonly');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Cache the access token in memory (never localStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Request token via Google Identity Services (GSI) OAuth 2.0 Token Client (bypasses Firebase authorized domain restrictions)
export const requestGsiAccessToken = (scope: string = 'https://www.googleapis.com/auth/gmail.readonly'): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Window no disponible'));
    }

    const clientId = firebaseConfig.oAuthClientId || '605478708901-1ti160pvujhi09nhhhcj5etdqf9o0g13.apps.googleusercontent.com';

    const triggerClient = () => {
      try {
        const googleObj = (window as any).google;
        if (!googleObj?.accounts?.oauth2) {
          return reject(new Error('Google Identity Services no está disponible.'));
        }

        const client = googleObj.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: scope,
          callback: (tokenResponse: any) => {
            if (tokenResponse && tokenResponse.access_token) {
              resolve(tokenResponse.access_token);
            } else if (tokenResponse && tokenResponse.error) {
              const errMsg = tokenResponse.error_description || tokenResponse.error;
              reject(new Error(errMsg));
            } else {
              reject(new Error('No se recibió token de acceso de Google.'));
            }
          },
          error_callback: (error: any) => {
            reject(new Error(error?.message || 'Error en la autorización de Google.'));
          }
        });

        client.requestAccessToken({ prompt: 'consent' });
      } catch (err) {
        reject(err);
      }
    };

    if ((window as any).google?.accounts?.oauth2) {
      triggerClient();
    } else {
      // Dynamically load GSI script if not yet loaded
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setTimeout(triggerClient, 150);
      };
      script.onerror = () => {
        reject(new Error('No se pudo cargar el script de Google Identity Services'));
      };
      document.head.appendChild(script);
    }
  });
};

export const initGoogleAuthListener = (
  onSuccess?: (user: User, token: string) => void,
  onSignedOut?: () => void
) => {
  return onAuthStateChanged(auth, (user) => {
    if (user && cachedAccessToken) {
      if (onSuccess) onSuccess(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      if (onSignedOut) onSignedOut();
    }
  });
};

export const signInWithGoogleForGmail = async (): Promise<{ user?: Partial<User> | null; accessToken: string; email?: string }> => {
  if (isSigningIn) {
    throw new Error('Ya hay una solicitud de conexión en proceso.');
  }

  isSigningIn = true;

  try {
    // Method 1: Try Google Identity Services (GSI) Token Client first (Works natively on custom domains)
    try {
      const gsiToken = await requestGsiAccessToken('https://www.googleapis.com/auth/gmail.readonly');
      if (gsiToken) {
        cachedAccessToken = gsiToken;

        // Try to fetch user info with access token
        let userEmail: string | undefined;
        try {
          const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${gsiToken}` }
          });
          if (userRes.ok) {
            const uData = await userRes.json();
            userEmail = uData.email;
          }
        } catch {
          // Non-blocking
        }

        return {
          user: { email: userEmail || 'usuario@gmail.com' } as any,
          email: userEmail,
          accessToken: gsiToken,
        };
      }
    } catch (gsiErr: any) {
      console.warn('GSI Token Client notice, attempting Firebase Auth fallback:', gsiErr?.message || gsiErr);
    }

    // Method 2: Fallback to Firebase Popup
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;
    if (!token) {
      throw new Error('No se obtuvo el token de acceso de Google para Gmail.');
    }
    cachedAccessToken = token;
    return { user: result.user, email: result.user.email || undefined, accessToken: token };
  } catch (error: any) {
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request' ||
      error?.message?.includes('popup-closed-by-user')
    ) {
      console.info('Ventana emergente de inicio de sesión de Google cerrada por el usuario.');
    } else {
      console.warn('Error signing in with Google for Gmail:', error?.message || error);
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getCachedGmailAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setCachedGmailAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const signOutGoogle = async () => {
  cachedAccessToken = null;
  await auth.signOut();
};

export interface CloudUserData {
  transactions?: any[];
  accounts?: any[];
  categories?: any[];
  bills?: any[];
  goals?: any[];
  settings?: any;
  updatedAt?: string;
  updatedByDevice?: string;
  totalTransactions?: number;
  chunkCount?: number;
}

const CHUNK_SIZE = 300;

function normalizeUserId(userId: string): string {
  if (!userId) return 'guest_user';
  return userId.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
}

// Fetch all transactions from chunks if needed
async function loadFullTransactions(cleanId: string, mainData: any): Promise<any[]> {
  if (mainData.chunkCount && mainData.chunkCount > 0) {
    try {
      const chunksCol = collection(db, 'userData', cleanId, 'chunks');
      const chunksSnap = await withTimeout(getDocs(chunksCol), 4000, null);
      if (!chunksSnap) return mainData.transactions || [];

      const chunksMap = new Map<number, any[]>();
      chunksSnap.forEach((chunkDoc) => {
        const cData = chunkDoc.data();
        if (cData && typeof cData.index === 'number' && Array.isArray(cData.items)) {
          chunksMap.set(cData.index, cData.items);
        }
      });

      const fullTx: any[] = [];
      for (let i = 0; i < mainData.chunkCount; i++) {
        const items = chunksMap.get(i) || [];
        fullTx.push(...items);
      }
      return fullTx;
    } catch (e) {
      console.warn('Error fetching transaction chunks:', e);
      return mainData.transactions || [];
    }
  }
  return mainData.transactions || [];
}

// Subscribe to real-time updates for a user account
export function subscribeToUserCloudData(userId: string, onData: (data: CloudUserData) => void) {
  if (!userId) return () => {};
  try {
    const cleanId = normalizeUserId(userId);
    const userDocRef = doc(db, 'userData', cleanId);

    return onSnapshot(userDocRef, async (docSnap) => {
      try {
        if (docSnap.exists()) {
          const rawData = docSnap.data() as any;
          const transactions = await loadFullTransactions(cleanId, rawData);
          
          onData({
            ...rawData,
            transactions,
          });
        }
      } catch (err) {
        console.warn('Error processing snapshot data:', err);
      }
    }, (error) => {
      console.warn('Firestore sync snapshot notice:', error?.message || error);
    });
  } catch (err) {
    console.warn('Could not initialize cloud listener:', err);
    return () => {};
  }
}

// Push local data to cloud (handles large sets of 2000+ transactions seamlessly)
export async function pushUserCloudData(userId: string, data: CloudUserData) {
  if (!userId) return false;
  try {
    const cleanId = normalizeUserId(userId);
    const userDocRef = doc(db, 'userData', cleanId);
    
    const transactions = data.transactions || [];
    const totalTransactions = transactions.length;

    // If transactions are large, store them in chunk sub-documents to prevent 1MB Firestore limit
    if (totalTransactions > CHUNK_SIZE) {
      const chunkCount = Math.ceil(totalTransactions / CHUNK_SIZE);
      const batch = writeBatch(db);

      // Write chunks
      for (let i = 0; i < chunkCount; i++) {
        const chunkDocRef = doc(db, 'userData', cleanId, 'chunks', `chunk_${i}`);
        const chunkItems = transactions.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        batch.set(chunkDocRef, {
          index: i,
          items: chunkItems,
          updatedAt: new Date().toISOString()
        });
      }

      // Write main document without heavy transactions array
      batch.set(userDocRef, {
        accounts: data.accounts || [],
        categories: data.categories || [],
        bills: data.bills || [],
        goals: data.goals || [],
        settings: data.settings || {},
        totalTransactions,
        chunkCount,
        updatedAt: new Date().toISOString(),
        updatedByDevice: navigator.userAgent.includes('Mobile') ? 'Móvil' : 'Web / PC'
      }, { merge: true });

      await withTimeout(batch.commit(), 5000);
    } else {
      // Normal size, store directly
      await withTimeout(setDoc(userDocRef, {
        transactions,
        accounts: data.accounts || [],
        categories: data.categories || [],
        bills: data.bills || [],
        goals: data.goals || [],
        settings: data.settings || {},
        totalTransactions,
        chunkCount: 0,
        updatedAt: new Date().toISOString(),
        updatedByDevice: navigator.userAgent.includes('Mobile') ? 'Móvil' : 'Web / PC'
      }, { merge: true }), 4000);
    }

    console.log(`Cloud sync successful: ${totalTransactions} transactions saved for user ${cleanId}`);
    return true;
  } catch (error) {
    console.warn('Error saving data to cloud:', error);
    return false;
  }
}

// Fetch once from cloud
export async function fetchUserCloudData(userId: string): Promise<CloudUserData | null> {
  if (!userId) return null;
  try {
    const cleanId = normalizeUserId(userId);
    const userDocRef = doc(db, 'userData', cleanId);
    const docSnap = await withTimeout(getDoc(userDocRef), 3000, null);
    if (docSnap && docSnap.exists()) {
      const rawData = docSnap.data() as any;
      const transactions = await loadFullTransactions(cleanId, rawData);
      return {
        ...rawData,
        transactions,
      };
    }
    return null;
  } catch (error) {
    console.warn('Notice fetching data from cloud:', error);
    return null;
  }
}
