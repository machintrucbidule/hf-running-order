import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useCheckedState } from './CheckedStateContext';
import {
  createCircle as createCircleService,
  joinCircleByCode,
  leaveCircle as leaveCircleService,
  fetchUserCircles,
  subscribeToCircleMembers,
  updateMemberBands
} from '../services/friendsService';

const FriendsContext = createContext();

const CACHE_KEY_ACTIVE = 'friends_activeCircleId';
const CACHE_KEY_MEMBERS = 'friends_circleMembers';

export const FriendsProvider = ({ children }) => {
  const { user } = useAuth();
  const { userState } = useCheckedState();

  const [circles, setCircles] = useState([]);
  const [activeCircleId, setActiveCircleId] = useState(() => {
    return localStorage.getItem(CACHE_KEY_ACTIVE) || null;
  });
  const [circleMembers, setCircleMembers] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_MEMBERS);
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [loadingCircles, setLoadingCircles] = useState(false);
  const unsubMembersRef = useRef(null);
  const bandsSyncTimeout = useRef(null);

  // Persist activeCircleId to localStorage
  useEffect(() => {
    if (activeCircleId) {
      localStorage.setItem(CACHE_KEY_ACTIVE, activeCircleId);
    } else {
      localStorage.removeItem(CACHE_KEY_ACTIVE);
    }
  }, [activeCircleId]);

  // Cache circleMembers to localStorage
  useEffect(() => {
    if (circleMembers.length > 0) {
      localStorage.setItem(CACHE_KEY_MEMBERS, JSON.stringify(circleMembers));
    }
  }, [circleMembers]);

  // Fetch user's circles on login, auto-activate first if needed
  useEffect(() => {
    if (!user) {
      setCircles([]);
      setActiveCircleId(null);
      setCircleMembers([]);
      localStorage.removeItem(CACHE_KEY_ACTIVE);
      localStorage.removeItem(CACHE_KEY_MEMBERS);
      return;
    }
    setLoadingCircles(true);
    fetchUserCircles(user.uid)
      .then(c => {
        setCircles(c);
        if (c.length > 0) {
          setActiveCircleId(prev => {
            // Keep current if still valid, otherwise pick first
            if (prev && c.some(circle => circle.id === prev)) return prev;
            return c[0].id;
          });
        } else {
          setActiveCircleId(null);
        }
      })
      .catch(err => console.error('Failed to fetch circles:', err))
      .finally(() => setLoadingCircles(false));
  }, [user]);

  // Subscribe to active circle members (live updates + cache refresh)
  useEffect(() => {
    if (unsubMembersRef.current) {
      unsubMembersRef.current();
      unsubMembersRef.current = null;
    }
    if (!activeCircleId) {
      setCircleMembers([]);
      return;
    }

    unsubMembersRef.current = subscribeToCircleMembers(activeCircleId, (members) => {
      setCircleMembers(members);
    });

    return () => {
      if (unsubMembersRef.current) unsubMembersRef.current();
    };
  }, [activeCircleId]);

  // Sync own bands to active circle (debounced 3s)
  useEffect(() => {
    if (!user || !activeCircleId) return;
    if (bandsSyncTimeout.current) clearTimeout(bandsSyncTimeout.current);
    bandsSyncTimeout.current = setTimeout(() => {
      updateMemberBands(activeCircleId, user.uid, userState.taggedBands).catch(err =>
        console.error('Failed to sync bands to circle:', err)
      );
    }, 3000);
    return () => {
      if (bandsSyncTimeout.current) clearTimeout(bandsSyncTimeout.current);
    };
  }, [userState.taggedBands, activeCircleId, user]);

  const handleCreateCircle = async (name) => {
    if (!user) return;
    const result = await createCircleService(user.uid, name, user.displayName, user.photoURL);
    const newCircle = {
      id: result.id,
      name,
      inviteCode: result.inviteCode,
      members: [user.uid],
      createdBy: user.uid,
    };
    setCircles(prev => [...prev, newCircle]);
    // Auto-activate if first circle
    setActiveCircleId(prev => prev || result.id);
    return result;
  };

  const handleJoinCircle = async (code) => {
    if (!user) return;
    const result = await joinCircleByCode(code, user.uid, user.displayName, user.photoURL);
    const updated = await fetchUserCircles(user.uid);
    setCircles(updated);
    // Auto-activate if first circle
    setActiveCircleId(prev => prev || result.id);
    return result;
  };

  const handleLeaveCircle = async (circleId) => {
    if (!user) return;
    await leaveCircleService(circleId, user.uid);
    const remaining = circles.filter(c => c.id !== circleId);
    setCircles(remaining);
    if (activeCircleId === circleId) {
      setActiveCircleId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  return (
    <FriendsContext.Provider value={{
      circles,
      activeCircleId,
      setActiveCircleId,
      circleMembers,
      loadingCircles,
      createCircle: handleCreateCircle,
      joinCircle: handleJoinCircle,
      leaveCircle: handleLeaveCircle,
    }}>
      {children}
    </FriendsContext.Provider>
  );
};

export const useFriends = () => {
  const context = useContext(FriendsContext);
  if (!context) throw new Error('useFriends must be used within FriendsProvider');
  return context;
};
