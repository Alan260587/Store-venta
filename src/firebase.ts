import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  getFirestore,
  setLogLevel,
  doc,
  getDocFromServer,
  collection,
  query,
  where,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { Product, PdfDocument } from './types';

setLogLevel('silent');

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email
        })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot as required
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export async function signInWithGoogleCloud(): Promise<User | null> {
  try {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);
    return credential.user;
  } catch (error) {
    console.warn('Google sign-in cancelled or failed:', error);
    return null;
  }
}

export async function signOutGoogleCloud(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.warn('Error signing out of Google Cloud:', error);
  }
}

export {
  onAuthStateChanged,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
  Timestamp
};
export type { User };
