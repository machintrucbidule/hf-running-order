import React, { useMemo, useRef, useEffect, useState } from 'react';
import chroma from 'chroma-js';
import { useCheckedState } from '../../context/CheckedStateContext';
import { useAuth } from '../../context/AuthContext';
import { useFriends } from '../../context/FriendsContext';
import { INTEREST_LEVELS, INTEREST_ORDER, CONTEXT_TAGS } from '../../constants';

// SVG icons for followed circle indicators (1, 2, 3 people)
const PersonIcon1 = ({ color }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={color}>
        <circle cx="12" cy="8" r="4" />
        <path d="M12 14c-6 0-8 3-8 5v1h16v-1c0-2-2-5-8-5z" />
    </svg>
);
const PersonIcon2 = ({ color }) => (
    <svg width="18" height="14" viewBox="0 0 32 24" fill={color}>
        <circle cx="10" cy="8" r="3.5" />
        <path d="M10 13c-5 0-7 2.5-7 4v1h14v-1c0-1.5-2-4-7-4z" />
        <circle cx="22" cy="8" r="3.5" />
        <path d="M22 13c-5 0-7 2.5-7 4v1h14v-1c0-1.5-2-4-7-4z" />
    </svg>
);
const PersonIcon3 = ({ color }) => (
    <svg width="22" height="14" viewBox="0 0 40 24" fill={color}>
        <circle cx="8" cy="8" r="3" />
        <path d="M8 13c-4.5 0-6 2.5-6 4v1h12v-1c0-1.5-1.5-4-6-4z" />
        <circle cx="20" cy="8" r="3" />
        <path d="M20 13c-4.5 0-6 2.5-6 4v1h12v-1c0-1.5-1.5-4-6-4z" />
        <circle cx="32" cy="8" r="3" />
        <path d="M32 13c-4.5 0-6 2.5-6 4v1h12v-1c0-1.5-1.5-4-6-4z" />
    </svg>
);

const Band = ({ group, selectGroup, selectedGroupId, onTagClick, dayStartMinutes, dayEndMinutes, bandFilter }) => {
    const { GROUPE, SCENE, DEBUT, FIN, id } = group;
    const { state, getBandTag, getInterestColor, cycleInterest } = useCheckedState();
    const { user } = useAuth();
    const { visibleCircleIds, allVisibleMembers, memberCircleId } = useFriends();

    // Refs for auto-scroll overflow detection
    const photosContainerRef = useRef(null);
    const photosContentRef = useRef(null);
    const [photosOverflow, setPhotosOverflow] = useState(false);
    const [scrollOffset, setScrollOffset] = useState(0);

    // Friend indicators split: member circle (left zone) vs followed circles (top right)
    const { memberFriendsTags, followedFriendsTags } = useMemo(() => {
        if (visibleCircleIds.size === 0 || !allVisibleMembers.length || !user) {
            return { memberFriendsTags: [], followedFriendsTags: [] };
        }
        const member = [];
        const followed = [];
        for (const m of allVisibleMembers) {
            if (m.id === user.uid) continue;
            if (!m.taggedBands?.[id]?.interest) continue;
            const tag = {
                name: m.displayName || 'Anonyme',
                photoURL: m.photoURL || '',
                interest: m.taggedBands[id].interest,
            };
            if (memberCircleId && m.memberOfCircle === memberCircleId) {
                member.push(tag);
            } else {
                followed.push(tag);
            }
        }
        return { memberFriendsTags: member, followedFriendsTags: followed };
    }, [visibleCircleIds, allVisibleMembers, id, user, memberCircleId]);

    // Highest interest level among followed circle friends
    const followedHighestInterest = useMemo(() => {
        if (followedFriendsTags.length === 0) return null;
        return INTEREST_ORDER.find(level =>
            followedFriendsTags.some(ft => ft.interest === level)
        ) || null;
    }, [followedFriendsTags]);

    const isSelected = selectedGroupId === id;
    const bandTag = getBandTag(id);
    const hasInterest = !!bandTag?.interest;
    const hasContext = !!bandTag?.context;
    const isTagged = hasInterest || hasContext;

    // Filter visibility based on bandFilter prop
    const isFilterVisible = !bandFilter || bandFilter === 'all'
        || (bandFilter === 'mine' && isTagged)
        || (bandFilter === 'my_circle' && (isTagged || memberFriendsTags.length > 0))
        || (bandFilter === 'all_circles' && (isTagged || memberFriendsTags.length > 0 || followedFriendsTags.length > 0));

    // Parsing des heures
    if (typeof DEBUT !== 'string' || typeof FIN !== 'string') return null;

    const debut = DEBUT.split('h');
    const fin = FIN.split('h');

    if (debut.length < 2) debut[1] = '00';
    if (fin.length < 2) fin[1] = '00';

    let dH = +debut[0];
    let fH = +fin[0];

    if (dH < 4) dH += 24;
    if (fH < 4) fH += 24;

    const debutMinutes = dH * 60 + (+debut[1]);
    const finMinutes = fH * 60 + (+fin[1]);
    const duree = finMinutes - debutMinutes;
    const dureeConcert = duree;
    const bandHeight = dureeConcert;

    // Couleurs des scènes (principales + annexes)
    const sceneColors = {
        "MAINSTAGE 1": '#0055a5',
        "MAINSTAGE 2": '#a6a19b',
        "WARZONE": '#949b1a',
        "VALLEY": '#ce7c19',
        "ALTAR": '#dc2829',
        "TEMPLE": '#93a7b0',
        "HELLSTAGE": '#239c60',
        "PURPLE_HOUSE": '#9500c6',
        "METAL_CORNER": '#9f9c78'
    };

    const getTop = () => {
        let adjustedFin = finMinutes;
        let adjustedDebut = debutMinutes;
        if (finMinutes < 6 * 60) adjustedFin += 24 * 60;
        if (debutMinutes < 6 * 60) adjustedDebut += 24 * 60;

        if (dayStartMinutes !== undefined && dayEndMinutes !== undefined) {
            if (state.reverse) {
                return `${adjustedDebut - dayStartMinutes}px`;
            } else {
                return `${dayEndMinutes - adjustedFin}px`;
            }
        }

        const day = group.DAY;
        let endOfDayMinutes;
        let startOfDayMinutes;

        const isSideStage = ['HELLSTAGE', 'PURPLE_HOUSE', 'METAL_CORNER'].includes(SCENE);
        const extendedEnd = state.sideScenes ? 28 * 60 : 26 * 60;

        if (day === 'Mercredi') {
            endOfDayMinutes = 25 * 60;
            startOfDayMinutes = 16 * 60;
        } else if (day === 'Jeudi') {
            endOfDayMinutes = extendedEnd;
            if (state.sideScenes) {
                startOfDayMinutes = 11 * 60;
            } else {
                startOfDayMinutes = 16 * 60;
            }
        } else if (day === 'Dimanche') {
            endOfDayMinutes = 25 * 60;
            startOfDayMinutes = 10 * 60;
        } else {
            endOfDayMinutes = extendedEnd;
            startOfDayMinutes = 10 * 60;
        }

        if (state.reverse) {
            return `${adjustedDebut - startOfDayMinutes}px`;
        } else {
            return `${endOfDayMinutes - adjustedFin}px`;
        }
    };

    const sceneClass = `band-${SCENE.replace(/\s/g, '')}`;

    const interestColor = hasInterest ? getInterestColor(bandTag.interest) : null;
    const isHighlighted = isTagged || memberFriendsTags.length > 0 || followedFriendsTags.length > 0;

    const getContextDisplay = () => {
        if (!bandTag?.context) return null;
        const ctx = CONTEXT_TAGS[bandTag.context];
        if (!ctx) return null;
        return ctx.icon;
    };
    const contextIcon = getContextDisplay();

    const handleClick = (e) => {
        e.stopPropagation();
        selectGroup(group, e);
    };

    const handleRightClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onTagClick) {
            onTagClick(id, { x: e.clientX, y: e.clientY });
        }
    };

    const handleDoubleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        cycleInterest(id);
    };

    // Detect overflow for auto-scroll animation
    useEffect(() => {
        if (!photosContainerRef.current || !photosContentRef.current) return;
        const containerH = photosContainerRef.current.clientHeight;
        const contentH = photosContentRef.current.scrollHeight;
        if (contentH > containerH) {
            setPhotosOverflow(true);
            setScrollOffset(contentH - containerH);
        } else {
            setPhotosOverflow(false);
            setScrollOffset(0);
        }
    }, [memberFriendsTags]);

    // Dynamic text size based on band height
    const titleFontSize = bandHeight < 35
        ? `clamp(5px, calc(0.5vw + 3px), 10px)`
        : `clamp(5px, ${GROUPE.length > 16 ? 'calc(0.6vw + 5px)' : 'calc(0.9vw + 8px)'}, 16px)`;
    const timeFontSize = bandHeight < 35 ? 'calc(0.4vw + 4px)' : 'calc(0.5vw + 6px)';

    // Followed circle icon component
    const FollowedIcon = followedFriendsTags.length === 1 ? PersonIcon1
        : followedFriendsTags.length === 2 ? PersonIcon2
        : PersonIcon3;

    return (
        <div
            id={`group-${id}`}
            className={`band-container ${sceneClass} band-${id} ${isSelected ? 'selected-group' : ''} ${isTagged ? 'compact-tagged' : ''}`}
            style={{
                position: 'absolute',
                top: getTop(),
                height: `${dureeConcert}px`,
                boxShadow: [
                    isSelected ? 'inset 0 0 0 3px white' : interestColor ? `inset 0 0 0 3px ${interestColor}` : null,
                    isHighlighted ? '0 0 4px 1px rgba(0, 0, 0, 0.85)' : null,
                ].filter(Boolean).join(', ') || undefined,
                backgroundColor: isHighlighted
                    ? chroma.mix(chroma(sceneColors[SCENE]).luminance(0.6), sceneColors[SCENE], 0.5).hex()
                    : chroma(sceneColors[SCENE]).luminance(0.6).hex(),
                zIndex: isHighlighted ? 1 : undefined,
                display: (!state.scenes[SCENE.toLowerCase().replace(' ', '')] || !isFilterVisible) ? 'none' : 'flex',
            }}
            onClick={handleClick}
            onContextMenu={handleRightClick}
            onDoubleClick={handleDoubleClick}
        >
            {/* ZONE GAUCHE 20px — ma sélection (couleur) + photos potes membre */}
            <div
                className="band-left-zone"
                style={interestColor ? { backgroundColor: interestColor } : undefined}
                ref={photosContainerRef}
            >
                {memberFriendsTags.length > 0 && (
                    <div
                        className={`band-left-photos ${photosOverflow ? 'band-left-photos-overflow' : ''}`}
                        ref={photosContentRef}
                        style={photosOverflow ? { '--scroll-offset': `-${scrollOffset}px`, '--scroll-duration': `${Math.max(3, memberFriendsTags.length * 1.5)}s` } : undefined}
                    >
                        {memberFriendsTags.map((ft, i) => (
                            ft.photoURL ? (
                                <img
                                    key={i}
                                    src={ft.photoURL}
                                    alt=""
                                    referrerPolicy="no-referrer"
                                    className="band-friend-avatar"
                                    title={ft.name}
                                    style={{ borderColor: getInterestColor(ft.interest) || '#888' }}
                                />
                            ) : (
                                <span
                                    key={i}
                                    className="band-friend-avatar-fallback"
                                    title={ft.name}
                                    style={{ borderColor: getInterestColor(ft.interest) || '#888' }}
                                >
                                    {(ft.name || '?')[0].toUpperCase()}
                                </span>
                            )
                        ))}
                    </div>
                )}
            </div>

            {/* CONTENU CENTRAL */}
            <div className="compact-band-tag">
                <h4 style={{ fontSize: titleFontSize }}>
                    {GROUPE}
                </h4>
                {bandHeight >= 30 && (
                    <span style={{ fontSize: timeFontSize }}>
                        {DEBUT.replace('h', ':')} - {FIN.replace('h', ':')}
                    </span>
                )}
            </div>

            {/* HAUT À DROITE — icône bonhomme(s) suiveurs */}
            {followedFriendsTags.length > 0 && (
                <div
                    className="band-followed-indicator"
                    title={followedFriendsTags.map(ft => ft.name).join(', ')}
                >
                    <FollowedIcon color={getInterestColor(followedHighestInterest) || '#888'} />
                </div>
            )}

            {/* BAS À DROITE — icône de contexte */}
            {contextIcon && (
                <span
                    className="band-context-bottom-right"
                    title={CONTEXT_TAGS[bandTag.context]?.label}
                >
                    {contextIcon}
                </span>
            )}
        </div>
    );
};

export default Band;
