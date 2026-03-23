import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

let writeTimeout = null;
const DEBOUNCE_MS = 2000;

// Session sync tracking
const syncStats = {
  successCount: 0,
  errorCount: 0,
  requestCount: 0,
  lastSyncDate: null,
  lastError: null,
};

export const getSyncStats = () => ({ ...syncStats });

export const resetSyncStats = () => {
  syncStats.successCount = 0;
  syncStats.errorCount = 0;
  syncStats.requestCount = 0;
  syncStats.lastSyncDate = null;
  syncStats.lastError = null;
};

export const getUserDocRef = (userId) => doc(db, 'users', userId);

export const fetchUserData = async (userId) => {
  syncStats.requestCount++;
  const docSnap = await getDoc(getUserDocRef(userId));
  if (docSnap.exists()) {
    return { exists: true, data: docSnap.data() };
  }
  return { exists: false, data: null };
};

// Callback for sync status updates (set by context)
let onSyncResult = null;
export const setOnSyncResult = (cb) => { onSyncResult = cb; };

export const saveUserData = (userId, data) => {
  if (writeTimeout) clearTimeout(writeTimeout);
  writeTimeout = setTimeout(async () => {
    syncStats.requestCount++;
    try {
      await updateDoc(getUserDocRef(userId), {
        ...data,
        lastModified: serverTimestamp(),
      });
      syncStats.successCount++;
      syncStats.lastSyncDate = new Date();
      syncStats.lastError = null;
      if (onSyncResult) onSyncResult('synced');
    } catch (err) {
      console.error('Firestore write failed:', err);
      syncStats.errorCount++;
      syncStats.lastError = err.message;
      if (onSyncResult) onSyncResult('error', err.message);
    }
  }, DEBOUNCE_MS);
};

export const saveUserDataImmediate = async (userId, data) => {
  if (writeTimeout) clearTimeout(writeTimeout);
  syncStats.requestCount++;
  try {
    await setDoc(getUserDocRef(userId), {
      ...data,
      lastModified: serverTimestamp(),
    });
    syncStats.successCount++;
    syncStats.lastSyncDate = new Date();
    syncStats.lastError = null;
    if (onSyncResult) onSyncResult('synced');
  } catch (err) {
    console.error('Firestore immediate write failed:', err);
    syncStats.errorCount++;
    syncStats.lastError = err.message;
    if (onSyncResult) onSyncResult('error', err.message);
  }
};
