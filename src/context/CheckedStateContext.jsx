import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { DEFAULT_COLORS, INTEREST_LEVELS, CONTEXT_TAGS } from '../constants';
import { migrateOldData } from '../utils/migrationUtils';
import { useAuth } from './AuthContext';
import { fetchUserData, saveUserData, saveUserDataImmediate } from '../services/firestoreSync';

export const CheckedStateContext = createContext();

const getDefaultInterestColors = () => {
    const colors = {};
    Object.keys(INTEREST_LEVELS).forEach(levelId => {
        colors[levelId] = INTEREST_LEVELS[levelId].defaultColor;
    });
    return colors;
};

// Anciennes couleurs par défaut — migration automatique vers les nouvelles
const OLD_DEFAULT_COLORS = {
    must_see: '#FFD700',
    interested: '#4A90D9',
    curious: '#50C878',
};

const migrateInterestColors = (stateData) => {
    const ic = stateData.interestColors;
    if (ic &&
        ic.must_see === OLD_DEFAULT_COLORS.must_see &&
        ic.interested === OLD_DEFAULT_COLORS.interested &&
        ic.curious === OLD_DEFAULT_COLORS.curious) {
        return { ...stateData, interestColors: getDefaultInterestColors() };
    }
    return stateData;
};

const INITIAL_STATE = {
    scenes: {
        mainstage1: true,
        mainstage2: true,
        warzone: true,
        valley: true,
        altar: true,
        temple: true,
        hellstage: true,
        purple_house: true,
        metal_corner: true,
    },
    color: 'nocolor',
    ...DEFAULT_COLORS,
    taggedBands: {},
    interestColors: getDefaultInterestColors(),
    reverse: false,
    compact: true,
    notes: {},
    myRo: {
        color1: "full",
        color2: "full",
        color3: "full",
        others: "none",
    },
    day: "Jeudi",
    sideScenes: false,
    language: "fr",
};

const mergeWithInitialState = (data) => ({
    ...INITIAL_STATE,
    ...data,
    scenes: {
        ...INITIAL_STATE.scenes,
        ...(data.scenes || {})
    },
    interestColors: {
        ...getDefaultInterestColors(),
        ...(data.interestColors || {})
    }
});

export const CheckedStateProvider = ({ children }) => {
    const { user, loading: authLoading } = useAuth();
    const [syncStatus, setSyncStatus] = useState('idle');
    const [hasSynced, setHasSynced] = useState(false);
    const skipNextFirestoreWrite = useRef(false);

    const [state, setState] = useState(() => {
        try {
            const saved = localStorage.getItem('checkedState');
            if (saved) {
                const parsed = JSON.parse(saved);
                const migrated = migrateOldData(parsed);
                return migrateInterestColors(mergeWithInitialState(migrated));
            }
        } catch (e) {
            console.error("Failed to load state", e);
        }
        return INITIAL_STATE;
    });

    const [guestRo, setGuestRo] = useState(null);

    const displayState = React.useMemo(() => {
        if (guestRo && guestRo.bands) {
            return {
                ...state,
                taggedBands: guestRo.bands
            };
        }
        return state;
    }, [state, guestRo]);

    // Persist to localStorage
    useEffect(() => {
        localStorage.setItem('checkedState', JSON.stringify(state));
        // Only update the timestamp after initial sync, otherwise the freshly-written
        // local timestamp would always beat the remote one on a new browser.
        if (hasSynced) {
            localStorage.setItem('checkedState_lastModified', String(Date.now()));
        }
    }, [state, hasSynced]);

    // Initial sync on login
    useEffect(() => {
        if (authLoading || !user || hasSynced) return;

        const doSync = async () => {
            setSyncStatus('syncing');
            try {
                const result = await fetchUserData(user.uid);
                if (!result.exists) {
                    // First login: upload localStorage to Firestore
                    await saveUserDataImmediate(user.uid, {
                        checkedState: state,
                        displayName: user.displayName || '',
                    });
                } else if (result.data.checkedState) {
                    const localModified = parseInt(localStorage.getItem('checkedState_lastModified') || '0');
                    const remoteModified = result.data.lastModified?.toMillis?.() || 0;

                    if (remoteModified > localModified) {
                        const remoteMigrated = migrateOldData(result.data.checkedState);
                        skipNextFirestoreWrite.current = true;
                        setState(migrateInterestColors(mergeWithInitialState(remoteMigrated)));
                    }
                }
                setSyncStatus('synced');
            } catch (err) {
                console.error('Sync failed:', err);
                setSyncStatus('error');
            }
            setHasSynced(true);
        };
        doSync();
    }, [user, authLoading]);

    // Write to Firestore on state changes (debounced)
    useEffect(() => {
        if (!user || !hasSynced) return;
        if (skipNextFirestoreWrite.current) {
            skipNextFirestoreWrite.current = false;
            return;
        }
        saveUserData(user.uid, { checkedState: state });
    }, [state, user, hasSynced]);

    // Reset sync state on logout
    useEffect(() => {
        if (!user && !authLoading) {
            setHasSynced(false);
            setSyncStatus('idle');
        }
    }, [user, authLoading]);

    const resetState = () => {
        setState(INITIAL_STATE);
    };

    const setDay = (day) => {
        setState(prev => ({ ...prev, day }));
    };

    const setInterest = (groupId, interestLevel) => {
        if (guestRo) return;
        setState(prev => {
            const newTaggedBands = { ...prev.taggedBands };
            const existing = newTaggedBands[groupId] || {};

            if (interestLevel === null && !existing.context) {
                delete newTaggedBands[groupId];
            } else {
                newTaggedBands[groupId] = {
                    ...existing,
                    interest: interestLevel,
                    taggedAt: Date.now()
                };
            }
            return { ...prev, taggedBands: newTaggedBands };
        });
    };

    const setContext = (groupId, contextType) => {
        if (guestRo) return;
        setState(prev => {
            const newTaggedBands = { ...prev.taggedBands };
            const existing = newTaggedBands[groupId] || {};

            if (contextType === null && !existing.interest) {
                delete newTaggedBands[groupId];
            } else {
                newTaggedBands[groupId] = {
                    ...existing,
                    context: contextType,
                    taggedAt: Date.now()
                };
            }
            return { ...prev, taggedBands: newTaggedBands };
        });
    };

    const cycleInterest = (groupId) => {
        const currentTag = getBandTag(groupId);
        const currentInterest = currentTag?.interest;

        let nextInterest;
        if (!currentInterest) {
            nextInterest = 'curious';
        } else if (currentInterest === 'curious') {
            nextInterest = 'interested';
        } else if (currentInterest === 'interested') {
            nextInterest = 'must_see';
        } else {
            nextInterest = null;
        }

        setInterest(groupId, nextInterest);
    };

    const getBandTag = (groupId) => {
        const tag = displayState.taggedBands?.[groupId];
        if (!tag) return null;

        if (typeof tag === 'string') {
            return {
                interest: 'must_see',
                context: null,
                taggedAt: Date.now()
            };
        }

        if (tag.category && !tag.interest) {
            const cat = tag.category;
            if (['must_see', 'interested', 'curious'].includes(cat)) {
                return { interest: cat, context: null, taggedAt: tag.taggedAt };
            } else if (['with_friend', 'strategic', 'skip'].includes(cat)) {
                return { interest: null, context: cat, taggedAt: tag.taggedAt };
            }
        }

        return tag;
    };

    const getInterestColor = (interestLevel) => {
        return state.interestColors?.[interestLevel] || INTEREST_LEVELS[interestLevel]?.defaultColor || '#888';
    };

    const setInterestColor = (interestLevel, color) => {
        setState(prev => ({
            ...prev,
            interestColors: {
                ...prev.interestColors,
                [interestLevel]: color
            }
        }));
    };

    const resetInterestColors = () => {
        setState(prev => ({
            ...prev,
            interestColors: getDefaultInterestColors()
        }));
    };

    const updateNote = (groupId, note) => {
        setState(prev => ({
            ...prev,
            notes: {
                ...prev.notes,
                [groupId]: note
            }
        }));
    };

    const toggleScene = (sceneId) => {
        setState(prev => ({
            ...prev,
            scenes: {
                ...prev.scenes,
                [sceneId]: !prev.scenes[sceneId]
            }
        }));
    };

    const setScenes = (scenes) => {
        setState(prev => ({
            ...prev,
            scenes
        }));
    };

    const clearAllFavorites = () => {
        setState(prev => ({
            ...prev,
            taggedBands: {}
        }));
    };

    return (
        <CheckedStateContext.Provider value={{
            state: displayState,
            userState: state,
            isGuestMode: !!guestRo,
            guestRo,
            setGuestRo,
            setState,
            resetState,
            setDay,
            setInterest,
            setContext,
            cycleInterest,
            getBandTag,
            getInterestColor,
            setInterestColor,
            resetInterestColors,
            updateNote,
            toggleScene,
            setScenes,
            clearAllFavorites,
            syncStatus,
        }}>
            {children}
        </CheckedStateContext.Provider>
    );
};

export const useCheckedState = () => {
    const context = useContext(CheckedStateContext);
    if (!context) {
        throw new Error('useCheckedState must be used within a CheckedStateProvider');
    }
    return context;
};
