import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, Firestore } from 'firebase/firestore';
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

// Initialize Firestore with Persistence safely
// If already initialized with options or during HMR/reloads, reuse existing instance
let db: Firestore;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (e) {
  db = getFirestore(app);
}

// Initialize Firebase Authentication
const auth = getAuth(app);

export { app, db, auth };
