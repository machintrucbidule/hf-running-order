import React, { useState, useMemo } from 'react';
import chroma from 'chroma-js';
import { useCheckedState } from '../../context/CheckedStateContext';
import { useAuth } from '../../context/AuthContext';
import { useFriends } from '../../context/FriendsContext';
import { useLineup } from '../../hooks/useLineup'; // Assuming this hook exists or we pass groups as prop
import { STAGE_CONFIG, INTEREST_LEVELS } from '../../constants';
// Reuse timeToMinutes for layout calcs
import TagMenu from '../common/TagMenu';
import { PDFDownloadLink } from '@react-pdf/renderer';
import WeeklyPDF from './WeeklyPDF';
import { calculateWeeklyLayout } from '../../utils/pdfLayout';
import './WeeklyView.css';

const START_HOUR = 10; // Start at 10:00
const PIXELS_PER_MINUTE = 0.9; // Adjusted scale as per request

const ICONS = {
    apero: '🍺',
    repas: '🍔',
    dodo: '💤',
    transport: '🚗',
    course: '🛒',
    camping: '⛺',
    ami: '👥',
    autre: '📍'
};

// --- LAYOUT LOGIC MOVED TO UTILS/PDFLAYOUT.JS ---

const WeeklyView = ({ groups, onGroupClick, customEvents = [], onEditCustomEvent }) => {
    const { state, getInterestColor, getBandTag, cycleInterest } = useCheckedState();
    const { user } = useAuth();
    const { activeCircleId, circleMembers } = useFriends();
    const [filterMode, setFilterMode] = useState('favorites'); // 'favorites' or 'all'
    const [colorMode, setColorMode] = useState('transparent'); // 'transparent' or 'scene'
    const [friendsMode, setFriendsMode] = useState(false); // false = mine only, true = mine + friends
    const [selectedScenes, setSelectedScenes] = useState(() => [...Object.keys(STAGE_CONFIG), 'CUSTOM']);
    const [tagMenuState, setTagMenuState] = useState({ open: false, groupId: null, position: { x: 0, y: 0 } });

    // Handle Right Click (Context Menu)
    const handleContextMenu = (e, group) => {
        e.preventDefault();
        e.stopPropagation();

        const menuWidth = 240;
        const menuHeight = 350;
        let x = e.clientX;
        let y = e.clientY;

        if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10;
        if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 10;

        setTagMenuState({ open: true, groupId: group.id, position: { x, y } });
    };

    const closeTagMenu = () => {
        setTagMenuState({ open: false, groupId: null, position: { x: 0, y: 0 } });
    };

    // Handle Double Click (Quick Cycle)
    const handleDoubleClick = (e, group) => {
        e.stopPropagation();
        cycleInterest(group.id);
    };

    // Toggle scene visibility
    const toggleScene = (sceneId) => {
        setSelectedScenes(prev =>
            prev.includes(sceneId)
                ? prev.filter(s => s !== sceneId)
                : [...prev, sceneId]
        );
    };

    // Toggle All Scenes
    const toggleAllScenes = () => {
        const allKeys = [...Object.keys(STAGE_CONFIG), 'CUSTOM'];
        if (selectedScenes.length >= Object.keys(STAGE_CONFIG).length) { // Loose check: if mostly full, clear all
            if (selectedScenes.length === allKeys.length) setSelectedScenes([]);
            else setSelectedScenes(allKeys);
        } else {
            setSelectedScenes(allKeys);
        }
    };

    // Build set of band IDs tagged by friends
    const friendsTaggedIds = useMemo(() => {
        if (!friendsMode || !activeCircleId || !circleMembers.length || !user) return new Set();
        const ids = new Set();
        circleMembers
            .filter(m => m.id !== user.uid)
            .forEach(m => {
                Object.entries(m.taggedBands || {}).forEach(([bandId, tag]) => {
                    if (tag?.interest) ids.add(bandId);
                });
            });
        return ids;
    }, [friendsMode, activeCircleId, circleMembers, user]);

    // --- 1. FILTERING ---
    const filteredGroups = useMemo(() => {
        if (!groups) return [];
        let selection = groups.filter(g => selectedScenes.includes(g.SCENE));

        // If 'favorites' mode, keep only tagged bands (mine + friends if enabled)
        if (filterMode === 'favorites') {
            selection = selection.filter(g =>
                state.taggedBands[g.id] || (friendsMode && friendsTaggedIds.has(String(g.id)))
            );
        }

        return selection;
    }, [groups, filterMode, state.taggedBands, selectedScenes, friendsMode, friendsTaggedIds]);

    // --- 2. LAYOUT ALGORITHM (The "Clashfinder" Logic) ---
    const dayColumns = useMemo(() => {
        const days = ['Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
        const columns = {};

        days.forEach(day => {
            let dayBands = filteredGroups.filter(g => g.JOUR === day);
            if (dayBands.length === 0) dayBands = filteredGroups.filter(g => g.DAY === day);

            columns[day] = calculateWeeklyLayout(dayBands, PIXELS_PER_MINUTE, state.reverse, filterMode, selectedScenes);
        });

        return columns;
    }, [filteredGroups, filterMode, state.reverse, selectedScenes]);

    return (
        <div className="weekly-view">
            <div className="weekly-header">
                {/* Left: Title */}
                <div className="weekly-header-left">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <h2>Résumé Semaine</h2>
                        <PDFDownloadLink
                            document={
                                <WeeklyPDF
                                    groups={groups}
                                    customEvents={customEvents}
                                    selectedScenes={selectedScenes}
                                    filterMode={filterMode}
                                    colorMode={colorMode}
                                    taggedBands={state.taggedBands}
                                    reverse={state.reverse}
                                />
                            }
                            fileName={`Hellfest2026_RunningOrder_${filterMode}.pdf`}
                            className="export-pdf-btn"
                        >
                            {({ blob, url, loading, error }) => (
                                <>
                                    <i className="fa-solid fa-file-pdf"></i>
                                    <span>{loading ? '...' : 'PDF'}</span>
                                </>
                            )}
                        </PDFDownloadLink>
                    </div>
                </div>

                {/* Center: Scene Filters */}
                <div className="weekly-header-center">
                    <button
                        className="scene-filter-tiny-btn all"
                        onClick={toggleAllScenes}
                        title={selectedScenes.length >= Object.keys(STAGE_CONFIG).length ? "Tout masquer" : "Tout afficher"}
                    >
                        {selectedScenes.length >= Object.keys(STAGE_CONFIG).length ? <i className="fa-solid fa-eye-slash"></i> : <i className="fa-solid fa-eye"></i>}
                    </button>
                    {Object.entries(STAGE_CONFIG).map(([key, config]) => (
                        <button
                            key={key}
                            className={`scene-filter-tiny-btn ${selectedScenes.includes(key) ? 'active' : ''}`}
                            onClick={() => toggleScene(key)}
                            style={{
                                '--scene-color': config.themeColor,
                                opacity: selectedScenes.includes(key) ? 1 : 0.4
                            }}
                            title={config.name}
                        >
                            <img src={config.icon} alt={config.name} className="mini-icon" />
                        </button>
                    ))}
                    {/* CUSTOM EVENTS TOGGLE */}
                    <button
                        className={`scene-filter-tiny-btn ${selectedScenes.includes('CUSTOM') ? 'active' : ''}`}
                        onClick={() => toggleScene('CUSTOM')}
                        style={{
                            '--scene-color': '#adb5bd', // Grey for generic custom
                            opacity: selectedScenes.includes('CUSTOM') ? 1 : 0.4,
                            marginLeft: '8px'
                        }}
                        title="Créneaux perso"
                    >
                        <span style={{ fontSize: '1.2em' }}>👤</span>
                    </button>
                </div>

                {/* Right: View Mode Filters */}
                <div className="weekly-header-right">
                    <div className="weekly-filters">
                        <button
                            className={`weekly-filter-btn ${filterMode === 'favorites' ? 'active' : ''}`}
                            onClick={() => setFilterMode('favorites')}
                        >
                            Les Favoris
                        </button>
                        <button
                            className={`weekly-filter-btn ${filterMode === 'all' ? 'active' : ''}`}
                            onClick={() => setFilterMode('all')}
                        >
                            Tout le monde
                        </button>
                    </div>
                    <div className="weekly-filters">
                        <button
                            className={`weekly-filter-btn ${colorMode === 'transparent' ? 'active' : ''}`}
                            onClick={() => setColorMode('transparent')}
                        >
                            Transparent
                        </button>
                        <button
                            className={`weekly-filter-btn ${colorMode === 'scene' ? 'active' : ''}`}
                            onClick={() => setColorMode('scene')}
                        >
                            Couleurs Scènes
                        </button>
                    </div>
                    {user && activeCircleId && circleMembers.length > 1 && (
                        <div className="weekly-filters">
                            <button
                                className={`weekly-filter-btn ${!friendsMode ? 'active' : ''}`}
                                onClick={() => setFriendsMode(false)}
                            >
                                Mes groupes
                            </button>
                            <button
                                className={`weekly-filter-btn ${friendsMode ? 'active' : ''}`}
                                onClick={() => setFriendsMode(true)}
                            >
                                <i className="fa-solid fa-users" style={{ marginRight: '4px', fontSize: '0.75rem' }}></i>
                                + Amis
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="weekly-grid">
                {['Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map((day, dayIdx) => (
                    <div key={day} className={`weekly-day-column col-${dayIdx}`}>
                        {/* Time Ruler (every hour) - Now inside each column for responsive 2x2 alignment */}
                        <div className="weekly-time-ruler">
                            {Array.from({ length: 18 }).map((_, i) => {
                                const h = START_HOUR + i;
                                const label = h >= 24 ? `${h - 24}h` : `${h}h`;

                                // Calculate position
                                const minutesFromStart = i * 60;
                                const originalTop = minutesFromStart * PIXELS_PER_MINUTE;
                                const TOTAL_MINUTES = 18 * 60;
                                const MAX_HEIGHT = TOTAL_MINUTES * PIXELS_PER_MINUTE;

                                const top = state.reverse
                                    ? originalTop
                                    : MAX_HEIGHT - originalTop;

                                return (
                                    <div
                                        key={i}
                                        className="time-marker"
                                        style={{ top: top }}
                                    >
                                        <span>{label}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="weekly-day-header">{day}</div>
                        <div className="weekly-day-content">
                            {dayColumns[day].map((item, idx) => {
                                const stageColor = STAGE_CONFIG[item.band.SCENE]?.themeColor || '#555';
                                const tagData = getBandTag(item.band.id);
                                const isTagged = !!tagData;
                                const isOnlyFriendTagged = !isTagged && friendsMode && friendsTaggedIds.has(String(item.band.id));

                                // Dynamic Color Logic
                                const interestColor = isTagged && tagData.interest
                                    ? getInterestColor(tagData.interest)
                                    : 'white'; // Fallback to white if no specific color? Or default Gold? 
                                // Actually original was "white". But if interest logic works, getInterestColor returns hex.

                                return (
                                    <div
                                        id={`group-${item.band.id}`}
                                        key={item.band.id}
                                        className="weekly-band-card"
                                        style={{
                                            top: item.top,
                                            height: item.height,
                                            left: `${item.leftPct}%`,
                                            width: `${item.widthPct}%`,
                                            backgroundColor: colorMode === 'scene' ? stageColor : '#2a2a2a',
                                            border: isTagged ? '0px solid white' : (isOnlyFriendTagged ? '1px dashed rgba(255,255,255,0.3)' : (colorMode === 'scene' ? `1px solid ${chroma(stageColor).darken(1.5).hex()}` : '1px solid rgba(255,255,255,0.1)')),
                                            borderLeft: `4px solid ${colorMode === 'scene' ? chroma(stageColor).darken(1.5).hex() : stageColor}`,
                                            color: '#fff',
                                            opacity: isOnlyFriendTagged ? 0.7 : 1,
                                            boxShadow: colorMode === 'scene' ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 4px rgba(0,0,0,0.4)'
                                        }}
                                        onClick={() => onGroupClick(item.band)}
                                        onContextMenu={(e) => handleContextMenu(e, item.band)}
                                        onDoubleClick={(e) => handleDoubleClick(e, item.band)}
                                    // title={`${item.band.GROUPE} (${item.band.SCENE})`} // Disabled as per user request
                                    >
                                        <div className="weekly-band-content">
                                            <div className="weekly-band-name">{item.band.GROUPE}</div>
                                            <div className="weekly-band-info">
                                                <span>{item.band.DEBUT}-{item.band.FIN}</span>
                                            </div>
                                            {isTagged && (
                                                <div
                                                    className="weekly-band-star"
                                                    style={{ color: interestColor }}
                                                >
                                                    ★
                                                </div>
                                            )}
                                            {isOnlyFriendTagged && (
                                                <div
                                                    className="weekly-band-star"
                                                    style={{ color: '#FF6B35', fontSize: '0.7rem' }}
                                                >
                                                    <i className="fa-solid fa-users"></i>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* CUSTOM EVENTS LAYER (Filtered) */}
                            {selectedScenes.includes('CUSTOM') && (customEvents || []).filter(e => e.day === day).map(event => {
                                // Time Parsing & Position Logic matching WeeklyView layout
                                if (typeof event.startTime !== 'string' || typeof event.endTime !== 'string') return null;

                                const [startH, startM] = event.startTime.split(':').map(Number);
                                const [endH, endM] = event.endTime.split(':').map(Number);

                                let sH = startH;
                                let eH = endH;

                                // Adjust for night hours (< 6h) to match DayView/Band logic
                                if (sH < 6) sH += 24;
                                if (eH < 6) eH += 24;
                                if (eH < sH) eH += 24; // Handle wrap around

                                const start = sH * 60 + startM;
                                const end = eH * 60 + endM;
                                const duration = end - start;

                                const height = Math.max(20, duration * PIXELS_PER_MINUTE);
                                const originalTop = (start - (START_HOUR * 60)) * PIXELS_PER_MINUTE;
                                const TOTAL_MINUTES = 18 * 60;
                                const MAX_HEIGHT = TOTAL_MINUTES * PIXELS_PER_MINUTE;

                                const top = state.reverse
                                    ? originalTop
                                    : MAX_HEIGHT - (originalTop + height);

                                return (
                                    <div
                                        key={event.id}
                                        className="weekly-custom-event"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onEditCustomEvent) onEditCustomEvent(event);
                                        }}
                                        style={{
                                            position: 'absolute',
                                            top: `${top}px`,
                                            height: `${height}px`,
                                            left: '2%',
                                            width: '96%',
                                            zIndex: 50,
                                            backgroundColor: 'rgba(255, 255, 255, 0.45)', // Matching DayView opacity
                                            border: '1px solid rgba(255, 255, 255, 0.5)',
                                            borderRadius: '6px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#fff',
                                            backdropFilter: 'blur(2px)',
                                            cursor: 'pointer',
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                                            textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                                            overflow: 'hidden'
                                        }}
                                        title={`${event.title} (${event.startTime} - ${event.endTime})`}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden', padding: '0 5px' }}>
                                            <span style={{ fontSize: '1.2rem' }}>{ICONS[event.type] || '📍'}</span>
                                            {/* Only show title if height allows (event > 20min approx so >20px height) */}
                                            {height > 25 && (
                                                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {event.title}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {tagMenuState.open && (
                <TagMenu
                    groupId={tagMenuState.groupId}
                    position={tagMenuState.position}
                    onClose={closeTagMenu}
                />
            )}
        </div>
    );
};

export default WeeklyView;
