import React, { useState, useEffect } from 'react';
import { useCheckedState } from '../../context/CheckedStateContext';
import { STAGE_CONFIG } from '../../constants';
import Band from '../common/Band';
import TagMenu from '../common/TagMenu';

// Composant HourTag (comme dans running-order original)
const HourTag = ({ hour }) => (
    <div className='hours' style={{ top: `${hour.top - 5}px` }}>
        <span className='hourtags'>{hour.label}</span>
    </div>
);

const CustomEventOverlay = ({ event, onEdit, columnCount, windowWidth, dayStartMinutes, dayEndMinutes }) => {
    const { state } = useCheckedState();

    // 1. Parse times
    if (typeof event.startTime !== 'string' || typeof event.endTime !== 'string') return null;

    const [startH, startM] = event.startTime.split(':').map(Number);
    const [endH, endM] = event.endTime.split(':').map(Number);

    // 2. Adjust for night hours (< 6h)
    let hDebut = startH;
    let hFin = endH;
    if (hDebut < 6) hDebut += 24;
    // Special handling if end < start (e.g. 23:00 - 01:00) where 01 < 6 is true, so +24 -> 25.
    if (hFin < 6) hFin += 24;

    const debutMinutes = hDebut * 60 + startM;
    const finMinutes = hFin * 60 + endM;
    const duration = finMinutes - debutMinutes;
    const height = duration; // 1px = 1min

    // 3. Calculate Top using Dynamic Bounds
    const getTop = () => {
        if (state.reverse) {
            return debutMinutes - dayStartMinutes;
        } else {
            return dayEndMinutes - finMinutes;
        }
    };

    // Offset due to Scene Header (~85px) + Margin (10px) + 5px calibration
    // Must match CSS .compact-scene-couple-header min-height + .scene-bands margin-top
    const HEADER_OFFSET = 100;
    const top = getTop() + HEADER_OFFSET;

    const colWidth = 300 + (windowWidth * 0.02);
    const calculatedWidth = columnCount * colWidth;

    const [isMasked, setIsMasked] = useState(false);

    return (
        <div
            className="custom-event-overlay"
            style={{
                position: 'absolute',
                top: `${top}px`,
                height: `${height}px`,
                left: '50%',
                transform: 'translateX(-50%)',
                width: `${calculatedWidth}px`,
                maxWidth: '98%',
                backgroundColor: isMasked ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.45)',
                border: isMasked ? '1px solid rgba(255, 255, 255, 0.5)' : '1px solid rgba(255, 255, 255, 0.4)',
                borderRadius: '8px',
                zIndex: 50, // Above everything
                pointerEvents: isMasked ? 'none' : 'auto', // Allow clicks through when masked
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center', // Center content
                padding: '0 15px',
                color: '#FFFFFF',
                textShadow: isMasked ? 'none' : '0 1px 2px rgba(0,0,0,0.8)',
                backdropFilter: isMasked ? 'none' : 'blur(2px)',
                transition: 'all 0.2s ease'
            }}
        >
            {/* Left Button: Mask/Unmask */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsMasked(!isMasked);
                }}
                style={{
                    position: 'absolute',
                    left: '15px',
                    background: 'rgba(0,0,0,0.3)',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.2s',
                    zIndex: 51,
                    pointerEvents: 'auto'
                }}
                title={isMasked ? "Afficher" : "Masquer"}
            >
                <i className={isMasked ? "fa-solid fa-eye" : "fa-solid fa-eye-slash"}></i>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', opacity: isMasked ? 0.1 : 1, transition: 'opacity 0.2s' }}>
                <span style={{ fontSize: '1.8rem' }}>
                    {event.type === 'apero' && '🍺'}
                    {event.type === 'repas' && '🍔'}
                    {event.type === 'dodo' && '💤'}
                    {event.type === 'transport' && '🚗'}
                    {event.type === 'course' && '🛒'}
                    {event.type === 'camping' && '⛺'}
                    {event.type === 'ami' && '👥'}
                    {event.type === 'autre' && '📍'}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{event.title}</div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.9, fontWeight: '500' }}>{event.startTime} - {event.endTime}</div>
                </div>
            </div>

            <div style={{ position: 'absolute', right: '15px', display: 'flex', gap: '8px', pointerEvents: 'auto' }}>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onEdit) onEdit(event);
                        else alert('Modification bientôt disponible');
                    }}
                    style={{
                        background: 'rgba(0,0,0,0.3)',
                        border: 'none',
                        color: '#fff',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.2s'
                    }}
                    title="Modifier"
                >
                    <i className="fa-solid fa-pen"></i>
                </button>
            </div>
        </div>
    );
};

const DayView = ({ groups, selectGroup, selectedGroupId, playerGroupId, day, bandFilter, customEvents = [], onDeleteCustomEvent, onEditCustomEvent }) => {
    const { state } = useCheckedState();
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [tagMenuState, setTagMenuState] = useState({ open: false, groupId: null, position: { x: 0, y: 0 } });

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Vérifier si une scène est visible
    const isSceneVisible = (sceneName) => {
        if (!sceneName) return false;
        const config = STAGE_CONFIG[sceneName];
        return config ? state.scenes[config.slug] !== false : false;
    };

    // Construire les paires de scènes (logique originale CompactDay.js)
    const buildSceneCouples = () => {
        if (!groups) return [];

        const isSmallScreen = windowWidth < 1200;
        let sceneCouples = [];

        // Couples scènes annexes (HELLSTAGE + METAL_CORNER ensemble selon demande)
        const annexCouples = [
            ["HELLSTAGE", "METAL_CORNER"],
            ["PURPLE_HOUSE", null]
        ];

        // Couples scènes principales
        let mainCouples = [["MAINSTAGE 1", "MAINSTAGE 2"], ["WARZONE", "VALLEY"], ["TEMPLE", "ALTAR"]];

        // Réarrangement si certaines scènes sont masquées (logique originale)
        if (
            (!state.scenes["warzone"] && !state.scenes["altar"] && state.scenes["temple"] && state.scenes["valley"]) ||
            (state.scenes["warzone"] && state.scenes["altar"] && !state.scenes["temple"] && !state.scenes["valley"])
        ) {
            mainCouples = [["MAINSTAGE 1", "MAINSTAGE 2"], ["WARZONE", "ALTAR"], ["TEMPLE", "VALLEY"]];
        }

        if (state.sideScenes) {
            if (isSmallScreen) {
                // < 1200px : Afficher UNIQUEMENT les scènes annexes (Toggle exclusif)
                sceneCouples = annexCouples;
            } else {
                // >= 1200px : Afficher TOUT (Principales + Annexes à la suite)
                sceneCouples = [...mainCouples, ...annexCouples];
            }
        } else {
            // SideScenes OFF : Afficher uniquement les principales
            sceneCouples = mainCouples;
        }

        // Filtrer les couples qui sont entièrement vides (aucun groupe programmé ce jour-là sur aucune des 2 scènes)
        return sceneCouples.filter(couple => {
            const s1 = couple[0];
            const s2 = couple[1];

            const hasGroups1 = s1 && groups.some(g => g.SCENE === s1);
            const hasGroups2 = s2 && groups.some(g => g.SCENE === s2);

            return hasGroups1 || hasGroups2;
        });
    };

    const handleTagClick = (groupId, position) => {
        const menuWidth = 240;
        const menuHeight = 350;
        let x = position.x;
        let y = position.y;

        if (x + menuWidth > window.innerWidth) {
            x = window.innerWidth - menuWidth - 10;
        }
        if (y + menuHeight > window.innerHeight) {
            y = window.innerHeight - menuHeight - 10;
        }

        setTagMenuState({ open: true, groupId, position: { x, y } });
    };

    const closeTagMenu = () => {
        setTagMenuState({ open: false, groupId: null, position: { x: 0, y: 0 } });
    };

    const sceneCouples = buildSceneCouples();

    const currentDay = day || (groups && groups.length > 0 ? groups[0].DAY : 'Vendredi');

    // Filter Custom Events for this day
    const todaysEvents = customEvents.filter(e => e.day === currentDay);

    // Filtrer les couples : on n'affiche la colonne que si au moins une des deux scènes est visible
    const visibleCouples = sceneCouples.filter(couple => {
        const s1 = couple[0];
        const s2 = couple[1];
        return isSceneVisible(s1) || (s2 && isSceneVisible(s2));
    });

    // --- DYNAMIC DAY BOUNDS (100% data-driven) ---
    const getDayBounds = () => {
        const visibleSceneNames = new Set();
        visibleCouples.forEach(([s1, s2]) => {
            if (s1 && isSceneVisible(s1)) visibleSceneNames.add(s1);
            if (s2 && isSceneVisible(s2)) visibleSceneNames.add(s2);
        });

        let minStart = Infinity;
        let maxEnd = -Infinity;

        groups.forEach(group => {
            if (!visibleSceneNames.has(group.SCENE)) return;
            if (typeof group.DEBUT !== 'string' || typeof group.FIN !== 'string') return;
            const dParts = group.DEBUT.split('h');
            const fParts = group.FIN.split('h');
            let dH = +dParts[0], fH = +fParts[0];
            const dM = +(dParts[1] || 0), fM = +(fParts[1] || 0);
            if (dH < 6) dH += 24;
            if (fH < 6) fH += 24;
            const groupStart = dH * 60 + dM;
            const groupEnd = fH * 60 + fM;
            if (groupStart < minStart) minStart = groupStart;
            if (groupEnd > maxEnd) maxEnd = groupEnd;
        });

        todaysEvents.forEach(event => {
            const [sH, sM] = event.startTime.split(':').map(Number);
            const [eH, eM] = event.endTime.split(':').map(Number);
            let startMins = sH * 60 + sM;
            let endMins = eH * 60 + eM;
            if (sH < 6) startMins += 24 * 60;
            if (eH < 6) endMins += 24 * 60;
            if (endMins < startMins) endMins += 24 * 60;
            if (startMins < minStart) minStart = startMins;
            if (endMins > maxEnd) maxEnd = endMins;
        });

        if (minStart === Infinity) minStart = 10 * 60;
        if (maxEnd === -Infinity) maxEnd = 26 * 60;

        return { startMin: minStart, endMin: maxEnd };
    };

    const { startMin, endMin } = getDayBounds();
    const dayStartMinutes = startMin;
    const dayEndMinutes = endMin;
    const getSceneBandsHeight = () => `${dayEndMinutes - dayStartMinutes}px`;

    if (!groups) return null;

    return (
        <div className="compact-day" style={{ position: 'relative', overflowX: 'auto' }}>
            {visibleCouples.map((sceneCouple, index) => {
                const scene1 = sceneCouple[0];
                const scene2 = sceneCouple[1];

                const showS1 = isSceneVisible(scene1);
                const showS2 = scene2 && isSceneVisible(scene2);

                // Couleurs pour le gradient ou couleur unie
                const config1 = STAGE_CONFIG[scene1];
                const config2 = scene2 ? STAGE_CONFIG[scene2] : null;

                let background;
                if (showS1 && showS2) {
                    background = `linear-gradient(to right, ${config1?.themeColor} 0%, ${config1?.themeColor} 50%, ${config2?.themeColor} 50%, ${config2?.themeColor} 100%)`;
                } else if (showS1) {
                    background = config1?.themeColor;
                } else if (showS2) {
                    background = config2?.themeColor;
                }

                const bgStyle = {
                    background: background,
                };

                const groups1 = groups.filter(g => g.SCENE === scene1);
                const groups2 = scene2 ? groups.filter(g => g.SCENE === scene2) : [];

                return (
                    <div key={index} className="scene-column compact-scene-column" style={bgStyle}>
                        {/* HEADER */}
                        <div className="compact-scene-couple-header">
                            {showS1 && (
                                <div className="header-half" style={{ width: showS2 ? '50%' : '100%' }}>
                                    <img className="scene-image" src={config1?.icon} alt={scene1} />
                                    <h3>{config1?.name}</h3>
                                </div>
                            )}
                            {showS2 && (
                                <div className="header-half" style={{ width: showS1 ? '50%' : '100%' }}>
                                    <img className="scene-image" src={config2?.icon} alt={scene2} />
                                    <h3>{config2?.name}</h3>
                                </div>
                            )}
                        </div>

                        {/* BANDS */}
                        <div className="scene-bands" style={{ height: getSceneBandsHeight() }}>
                            {/* Groupes Scène 1 */}
                            {showS1 && groups1.map(group => (
                                <Band
                                    key={group.id}
                                    group={group}
                                    selectGroup={selectGroup}
                                    selectedGroupId={selectedGroupId}
                                    playerGroupId={playerGroupId}
                                    halfWidth={showS1 && showS2}
                                    side="left"
                                    onTagClick={handleTagClick}
                                    dayStartMinutes={dayStartMinutes}
                                    dayEndMinutes={dayEndMinutes}
                                    bandFilter={bandFilter}
                                />
                            ))}

                            {/* Groupes Scène 2 */}
                            {showS2 && groups2.map(group => (
                                <Band
                                    key={group.id}
                                    group={group}
                                    selectGroup={selectGroup}
                                    selectedGroupId={selectedGroupId}
                                    playerGroupId={playerGroupId}
                                    halfWidth={showS1 && showS2}
                                    side="right"
                                    onTagClick={handleTagClick}
                                    dayStartMinutes={dayStartMinutes}
                                    dayEndMinutes={dayEndMinutes}
                                    bandFilter={bandFilter}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}

            {tagMenuState.open && (
                <TagMenu
                    groupId={tagMenuState.groupId}
                    position={tagMenuState.position}
                    onClose={closeTagMenu}
                />
            )}

            {/* Custom Events Overlay */}
            {todaysEvents.map(event => (
                <CustomEventOverlay
                    key={event.id}
                    event={event}
                    onEdit={onEditCustomEvent}
                    columnCount={visibleCouples.length}
                    windowWidth={windowWidth}
                    dayStartMinutes={dayStartMinutes}
                    dayEndMinutes={dayEndMinutes}
                />
            ))}
        </div>
    );
};

export default DayView;
