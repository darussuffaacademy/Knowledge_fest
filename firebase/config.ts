import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentSingleTabManager, Firestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAxxGX9AnyzT-CPDFetszJoOyJZ3SEGSkI",
  authDomain: "knowledge-fest.firebaseapp.com",
  projectId: "knowledge-fest",
  storageBucket: "knowledge-fest.firebasestorage.app",
  messagingSenderId: "826635813322",
  appId: "1:826635813322:web:928e2e9b87442697eacf33",
  measurementId: "G-FECWRGE030"
};

// Initialize Firebase idempotently
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with single-tab persistence and force ownership safely.
// Avoiding persistentMultipleTabManager prevents the cross-tab lease clock skew error:
// "Detected an update time that is in the future"
let db: Firestore;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentSingleTabManager({ forceOwnership: true })
    })
  });
} catch (e) {
  db = getFirestore(app);
}

// Initialize Firebase Authentication
const auth = getAuth(app);

export { app, db, auth };
