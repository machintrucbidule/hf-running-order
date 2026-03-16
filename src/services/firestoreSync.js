import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

let writeTimeout = null;
const DEBOUNCE_MS = 2000;

export const getUserDocRef = (userId) => doc(db, 'users', userId);

export const fetchUserData = async (userId) => {
  const docSnap = await getDoc(getUserDocRef(userId));
  if (docSnap.exists()) {
    return { exists: true, data: docSnap.data() };
  }
  return { exists: false, data: null };
};

export const saveUserData = (userId, data) => {
  if (writeTimeout) clearTimeout(writeTimeout);
  writeTimeout = setTimeout(async () => {
    try {
      await setDoc(getUserDocRef(userId), {
        ...data,
        lastModified: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.error('Firestore write failed:', err);
    }
  }, DEBOUNCE_MS);
};

export const saveUserDataImmediate = async (userId, data) => {
  if (writeTimeout) clearTimeout(writeTimeout);
  try {
    await setDoc(getUserDocRef(userId), {
      ...data,
      lastModified: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.error('Firestore immediate write failed:', err);
  }
};
