import { db } from '../firebase';
import {
  collection, doc, setDoc, updateDoc, getDocs, getDoc,
  query, where, arrayUnion, arrayRemove,
  deleteDoc, serverTimestamp, onSnapshot
} from 'firebase/firestore';

const circlesRef = collection(db, 'circles');
const metaCodesRef = collection(db, 'metaCodes');

export const generateInviteCode = () => {
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
  return updateDoc(doc(db, 'circles', circleId, 'members', userId), {
    taggedBands,
    isMember: true,
    lastModified: serverTimestamp(),
  });
};

export const clearMemberBands = (circleId, userId) => {
  return updateDoc(doc(db, 'circles', circleId, 'members', userId), {
    taggedBands: {},
    isMember: false,
    lastModified: serverTimestamp(),
  });
};

// Meta codes — un code unique pour rejoindre plusieurs cercles
export const createMetaCode = async (userId, circleIds) => {
  const code = generateInviteCode();
  const metaCodeRef = doc(metaCodesRef);
  await setDoc(metaCodeRef, {
    code: code.toUpperCase(),
    circleIds,
    createdBy: userId,
    createdAt: serverTimestamp(),
  });
  return code;
};

export const joinByMetaCode = async (code, userId, displayName, photoURL) => {
  const q = query(metaCodesRef, where('code', '==', code.toUpperCase()));
  const snapshot = await getDocs(q);
  if (snapshot.empty) throw new Error('Code invalide');

  const metaData = snapshot.docs[0].data();
  const joinedCircles = [];

  for (const circleId of metaData.circleIds) {
    const circleDoc = await getDoc(doc(db, 'circles', circleId));
    if (!circleDoc.exists()) continue;

    const circleData = circleDoc.data();
    if (circleData.members.includes(userId)) {
      joinedCircles.push({ id: circleId, name: circleData.name });
      continue; // déjà membre
    }

    await setDoc(doc(db, 'circles', circleId), { members: arrayUnion(userId) }, { merge: true });
    await setDoc(doc(db, 'circles', circleId, 'members', userId), {
      displayName,
      photoURL: photoURL || '',
      taggedBands: {},
      lastModified: serverTimestamp(),
    });
    joinedCircles.push({ id: circleId, name: circleData.name });
  }

  if (joinedCircles.length === 0) throw new Error('Aucun cercle valide dans ce code');
  return { circleIds: joinedCircles.map(c => c.id), circleNames: joinedCircles.map(c => c.name), circles: joinedCircles };
};

// Orchestrateur : essaie code cercle simple, puis meta code
export const joinByCode = async (code, userId, displayName, photoURL) => {
  try {
    const result = await joinCircleByCode(code, userId, displayName, photoURL);
    return { ...result, isMetaJoin: false };
  } catch (e) {
    if (e.message === 'Vous êtes déjà membre de ce cercle') throw e;
    // Code invalide pour un cercle simple, essayer meta code
    try {
      const metaResult = await joinByMetaCode(code, userId, displayName, photoURL);
      return { ...metaResult, isMetaJoin: true };
    } catch (metaErr) {
      throw new Error('Code invalide');
    }
  }
};
