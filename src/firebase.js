import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDp11T4QZeEkVsm92Efm5hrZUNmDk5zIiI",
  authDomain: "hellfest-ro-sync.firebaseapp.com",
  projectId: "hellfest-ro-sync",
  storageBucket: "hellfest-ro-sync.firebasestorage.app",
  messagingSenderId: "1073964826674",
  appId: "1:1073964826674:web:0234caed017667d7de3c2b"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
