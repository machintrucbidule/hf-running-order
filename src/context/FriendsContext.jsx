import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useCheckedState } from './CheckedStateContext';
import {
  createCircle as createCircleService,
  joinByCode,
  leaveCircle as leaveCircleService,
  fetchUserCircles,
  subscribeToCircleMembers,
  updateMemberBands,
  clearMemberBands,
  createMetaCode as createMetaCodeService
} from '../services/friendsService';

const FriendsContext = createContext();

const CACHE_KEY_VISIBLE = 'friends_visibleCircleIds';
const CACHE_KEY_MEMBERS_MAP = 'friends_circleMembersMap';
const CACHE_KEY_MEMBER = 'friends_memberCircleId';

export const FriendsProvider = ({ children }) => {
  const { user } = useAuth();
  const { userState } = useCheckedState();

  const [circles, setCircles] = useState([]);
  const [visibleCircleIds, setVisibleCircleIds] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_VISIBLE);
      return cached ? new Set(JSON.parse(cached)) : new Set();
    } catch { return new Set(); }
  });
  const [circleMembersMap, setCircleMembersMap] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_MEMBERS_MAP);
      return cached ? new Map(Object.entries(JSON.parse(cached))) : new Map();
    } catch { return new Map(); }
  });
  const [memberCircleId, setMemberCircleIdState] = useState(() => {
    try { return localStorage.getItem(CACHE_KEY_MEMBER) || null; }
    catch { return null; }
  });
  const [loadingCircles, setLoadingCircles] = useState(false);
  const unsubMapRef = useRef(new Map()); // circleId -> unsubscribe fn
  const bandsSyncTimeout = useRef(null);
  const lastCleanedMemberRef = useRef(localStorage.getItem(CACHE_KEY_MEMBER));
  const hasResolvedMemberRef = useRef(false);

  // Persist memberCircleId to localStorage
  const setMemberCircleId = (id) => {
    setMemberCircleIdState(id);
    if (id) localStorage.setItem(CACHE_KEY_MEMBER, id);
    else localStorage.removeItem(CACHE_KEY_MEMBER);
  };

  // Persist visibleCircleIds to localStorage
  useEffect(() => {
    localStorage.setItem(CACHE_KEY_VISIBLE, JSON.stringify([...visibleCircleIds]));
  }, [visibleCircleIds]);

  // Cache circleMembersMap to localStorage
  useEffect(() => {
    if (circleMembersMap.size > 0) {
      localStorage.setItem(CACHE_KEY_MEMBERS_MAP,
        JSON.stringify(Object.fromEntries(circleMembersMap))
      );
    }
  }, [circleMembersMap]);

  // Derive flat deduplicated array of all visible members (for Band.jsx, WeeklyView.jsx)
  // When a user appears in multiple circles, prefer the data from their member circle (isMember: true)
  const allVisibleMembers = useMemo(() => {
    const memberMap = new Map();
    for (const [circleId, members] of circleMembersMap) {
      if (!visibleCircleIds.has(circleId)) continue;
      for (const m of members) {
        if (!memberMap.has(m.id)) {
          memberMap.set(m.id, {
            ...m,
            circles: [circleId],
            memberOfCircle: m.isMember === true ? circleId : null,
          });
        } else {
          const existing = memberMap.get(m.id);
          existing.circles.push(circleId);
          // Prefer data from the member circle (has real taggedBands)
          if (m.isMember === true && !existing.isMember) {
            memberMap.set(m.id, {
              ...m,
              circles: existing.circles,
              memberOfCircle: circleId,
            });
          }
        }
      }
    }
    return Array.from(memberMap.values());
  }, [circleMembersMap, visibleCircleIds]);

  // Derive members grouped by circle (for GroupCard.jsx)
  const circleMembersGrouped = useMemo(() => {
    const result = {};
    for (const [circleId, members] of circleMembersMap) {
      if (!visibleCircleIds.has(circleId)) continue;
      const circle = circles.find(c => c.id === circleId);
      result[circleId] = {
        name: circle?.name || circleId,
        members: members,
      };
    }
    return result;
  }, [circleMembersMap, visibleCircleIds, circles]);

  // Fetch user's circles on login, auto-activate all on first load
  useEffect(() => {
    if (!user) {
      setCircles([]);
      setVisibleCircleIds(new Set());
      setCircleMembersMap(new Map());
      setMemberCircleIdState(null); // Clear state but NOT localStorage
      hasResolvedMemberRef.current = false;
      localStorage.removeItem(CACHE_KEY_VISIBLE);
      localStorage.removeItem(CACHE_KEY_MEMBERS_MAP);
      return;
    }
    setLoadingCircles(true);
    fetchUserCircles(user.uid)
      .then(c => {
        setCircles(c);
        if (c.length > 0) {
          setVisibleCircleIds(prev => {
            const validIds = new Set([...prev].filter(id => c.some(circle => circle.id === id)));
            return validIds.size > 0 ? validIds : new Set(c.map(circle => circle.id));
          });

          // Validate memberCircleId from localStorage, fallback to first circle
          setMemberCircleIdState(prev => {
            const valid = prev && c.some(circle => circle.id === prev);
            if (!valid) {
              const newId = c[0].id;
              localStorage.setItem(CACHE_KEY_MEMBER, newId);
              return newId;
            }
            return prev;
          });
        } else {
          setVisibleCircleIds(new Set());
          setMemberCircleId(null);
        }
      })
      .catch(err => console.error('Failed to fetch circles:', err))
      .finally(() => setLoadingCircles(false));
  }, [user]);

  // Manage Firestore subscriptions for visible circles
  useEffect(() => {
    const currentIds = visibleCircleIds;
    const existingSubs = unsubMapRef.current;

    // Unsubscribe circles no longer visible
    for (const [circleId, unsub] of existingSubs) {
      if (!currentIds.has(circleId)) {
        unsub();
        existingSubs.delete(circleId);
        setCircleMembersMap(prev => {
          const next = new Map(prev);
          next.delete(circleId);
          return next;
        });
      }
    }

    // Subscribe to newly visible circles
    for (const circleId of currentIds) {
      if (!existingSubs.has(circleId)) {
        const unsub = subscribeToCircleMembers(circleId, (members) => {
          setCircleMembersMap(prev => {
            const next = new Map(prev);
            next.set(circleId, members);
            return next;
          });
        });
        existingSubs.set(circleId, unsub);
      }
    }

    return () => {
      for (const unsub of existingSubs.values()) unsub();
      existingSubs.clear();
    };
  }, [visibleCircleIds]);

  // Derive memberCircleId from subscription data ONE-TIME at startup
  // (replaces the old fetchMemberCircleForUser without creating a feedback loop)
  useEffect(() => {
    if (!user || circleMembersMap.size === 0) return;
    if (hasResolvedMemberRef.current) return; // Already resolved, don't re-derive

    for (const [circleId, members] of circleMembersMap) {
      const me = members.find(m => m.id === user.uid);
      if (me?.isMember === true) {
        hasResolvedMemberRef.current = true;
        if (memberCircleId !== circleId) {
          setMemberCircleId(circleId);
        }
        return;
      }
    }
    // No isMember:true found yet — keep trying on next snapshot update
  }, [circleMembersMap, user]);

  // Sync own bands to member circle only
  useEffect(() => {
    if (!user || !memberCircleId) return;
    if (bandsSyncTimeout.current) clearTimeout(bandsSyncTimeout.current);
    bandsSyncTimeout.current = setTimeout(() => {
      updateMemberBands(memberCircleId, user.uid, userState.taggedBands).catch(err =>
        console.error(`Failed to sync bands to member circle ${memberCircleId}:`, err)
      );
    }, 2000);
    return () => {
      if (bandsSyncTimeout.current) clearTimeout(bandsSyncTimeout.current);
    };
  }, [userState.taggedBands, memberCircleId, user]);

  // Cleanup: when memberCircleId changes, clear taggedBands from non-member circles
  useEffect(() => {
    if (!user || !memberCircleId || circles.length === 0) return;
    if (lastCleanedMemberRef.current === memberCircleId) return;
    lastCleanedMemberRef.current = memberCircleId;

    // Write current bands + isMember:true to member circle
    updateMemberBands(memberCircleId, user.uid, userState.taggedBands).catch(err =>
      console.error(`Failed to sync bands to new member circle:`, err)
    );

    // Clear taggedBands + isMember:false from all other circles
    circles.forEach(circle => {
      if (circle.id !== memberCircleId) {
        clearMemberBands(circle.id, user.uid).catch(err =>
          console.error(`Failed to clear bands from circle ${circle.id}:`, err)
        );
      }
    });
  }, [memberCircleId, circles, user]);

  const toggleCircleVisibility = (circleId) => {
    setVisibleCircleIds(prev => {
      const next = new Set(prev);
      if (next.has(circleId)) {
        next.delete(circleId);
      } else {
        next.add(circleId);
      }
      return next;
    });
  };

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
    // Auto-activate new circle
    setVisibleCircleIds(prev => new Set([...prev, result.id]));
    // If no member circle, set this one
    if (!memberCircleId) setMemberCircleId(result.id);
    return result;
  };

  const handleJoinCircle = async (code) => {
    if (!user) return;
    const result = await joinByCode(code, user.uid, user.displayName, user.photoURL);
    const updated = await fetchUserCircles(user.uid);
    setCircles(updated);
    if (result.isMetaJoin) {
      // Meta join: activate all joined circles
      setVisibleCircleIds(prev => {
        const next = new Set(prev);
        result.circleIds.forEach(id => next.add(id));
        return next;
      });
      // Don't auto-assign member circle — let UI handle choice
    } else {
      // Simple join: activate the circle
      setVisibleCircleIds(prev => new Set([...prev, result.id]));
      // If no member circle, set this one
      if (!memberCircleId) setMemberCircleId(result.id);
    }
    return result;
  };

  const handleLeaveCircle = async (circleId) => {
    if (!user) return;
    await leaveCircleService(circleId, user.uid);
    const remaining = circles.filter(c => c.id !== circleId);
    setCircles(remaining);
    setVisibleCircleIds(prev => {
      const next = new Set(prev);
      next.delete(circleId);
      return next;
    });
    // If leaving member circle, reassign to first remaining or null
    if (memberCircleId === circleId) {
      setMemberCircleId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleCreateMetaCode = async (circleIds) => {
    if (!user) return;
    return await createMetaCodeService(user.uid, circleIds);
  };

  return (
    <FriendsContext.Provider value={{
      circles,
      visibleCircleIds,
      toggleCircleVisibility,
      allVisibleMembers,
      circleMembersGrouped,
      circleMembersMap,
      memberCircleId,
      setMemberCircleId,
      loadingCircles,
      createCircle: handleCreateCircle,
      joinCircle: handleJoinCircle,
      leaveCircle: handleLeaveCircle,
      createMetaCode: handleCreateMetaCode,
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
