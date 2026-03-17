import { db } from '../firebase';
import {
  collection, doc, setDoc, getDocs,
  query, where, arrayUnion, arrayRemove,
  deleteDoc, serverTimestamp, onSnapshot
} from 'firebase/firestore';

const circlesRef = collection(db, 'circles');

const generateInviteCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 7; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const createCircle = async (userId, circleName, displayName, photoURL) => {
  const inviteCode = generateInviteCode();
  const circleRef = doc(circlesRef);
  await setDoc(circleRef, {
    name: circleName,
    createdBy: userId,
    members: [userId],
    inviteCode,
    createdAt: serverTimestamp(),
  });
  await setDoc(doc(db, 'circles', circleRef.id, 'members', userId), {
    displayName,
    photoURL: photoURL || '',
    taggedBands: {},
    lastModified: serverTimestamp(),
  });
  return { id: circleRef.id, inviteCode };
};

export const joinCircleByCode = async (inviteCode, userId, displayName, photoURL) => {
  const q = query(circlesRef, where('inviteCode', '==', inviteCode.toUpperCase()));
  const snapshot = await getDocs(q);
  if (snapshot.empty) throw new Error('Code invalide');

  const circleDoc = snapshot.docs[0];
  const circleData = circleDoc.data();

  if (circleData.members.includes(userId)) {
    throw new Error('Vous êtes déjà membre de ce cercle');
  }

  try {
    await setDoc(circleDoc.ref, { members: arrayUnion(userId) }, { merge: true });
  } catch (err) {
    throw new Error('Impossible de rejoindre ce cercle. Réessayez.');
  }
  await setDoc(doc(db, 'circles', circleDoc.id, 'members', userId), {
    displayName,
    photoURL: photoURL || '',
    taggedBands: {},
    lastModified: serverTimestamp(),
  });
  return { id: circleDoc.id, name: circleData.name };
};

export const leaveCircle = async (circleId, userId) => {
  // Supprimer le sous-document AVANT de se retirer du tableau members
  // sinon les security rules bloquent car l'user n'est plus membre
  await deleteDoc(doc(db, 'circles', circleId, 'members', userId));
  await setDoc(doc(db, 'circles', circleId), { members: arrayRemove(userId) }, { merge: true });
};

export const fetchUserCircles = async (userId) => {
  const q = query(circlesRef, where('members', 'array-contains', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const subscribeToCircleMembers = (circleId, callback) => {
  const membersRef = collection(db, 'circles', circleId, 'members');
  return onSnapshot(membersRef, (snapshot) => {
    const members = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(members);
  });
};

export const updateMemberBands = (circleId, userId, taggedBands) => {
  return setDoc(doc(db, 'circles', circleId, 'members', userId), {
    taggedBands,
    lastModified: serverTimestamp(),
  }, { merge: true });
};
