import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';

const AuthContext = createContext();

const googleProvider = new GoogleAuthProvider();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    try {
      return await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (err.code === 'auth/popup-blocked') {
        return signInWithRedirect(auth, googleProvider);
      }
      throw err;
    }
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
