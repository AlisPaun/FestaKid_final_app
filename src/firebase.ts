import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, initializeFirestore, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Firestore with settings to bypass gRPC issues in some environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  cacheSizeBytes: CACHE_SIZE_UNLIMITED
}, firebaseConfig.firestoreDatabaseId);

// Test connection as required by guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'connection-test', 'ping'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore connection check failed: client might be offline.");
    }
  }
}
testConnection();

export const auth = getAuth(app);
