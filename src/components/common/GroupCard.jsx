import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSwipeable } from 'react-swipeable';
import { useCheckedState } from '../../context/CheckedStateContext';
import { useAuth } from '../../context/AuthContext';
import { useFriends } from '../../context/FriendsContext';
import { INTEREST_LEVELS, INTEREST_ORDER, CONTEXT_TAGS, CONTEXT_ORDER } from '../../constants';
// Import Logos
import bandLogos from '../../data/bandLogos.json';

const GroupCard = ({ group, position, onClose, onPositionChange }) => {
    // ... existing content ...
    const cardRef = useRef(null);
    const positionRef = useRef(position);
    const { state, setInterest, setContext, getBandTag, getInterestColor, updateNote } = useCheckedState();
    const { user } = useAuth();
    const { activeCircleId, circleMembers } = useFriends();

    // Friends who tagged this band
    const friendsWhoTagged = useMemo(() => {
        if (!activeCircleId || !circleMembers.length || !user) return [];
        return circleMembers
            .filter(m => m.id !== user.uid)
            .filter(m => m.taggedBands?.[group.id]?.interest)
            .map(m => ({
                name: m.displayName || 'Anonyme',
                interest: m.taggedBands[group.id].interest,
            }));
    }, [activeCircleId, circleMembers, group.id, user]);
    // ...

    // Helper to get logo safely (case insensitive?)
    // The scraper uses exact match from H2, which theoretically matches lineup data.
    const logoUrl = bandLogos[group.GROUPE];
    const [activeTab, setActiveTab] = useState('infos');
    const [note, setNote] = useState('');
    const [cardPosition, setCardPosition] = useState(position);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [measuredHeight, setMeasuredHeight] = useState(null);
    const [expanded, setExpanded] = useState(false);
    const [manualHeight, setManualHeight] = useState(null);

    // Swipe logic for resizing
    const swipeHandlers = useSwipeable({
        onSwipedUp: () => setExpanded(true),
        onSwipedDown: () => setExpanded(false),
        preventDefaultTouchmoveEvent: true,
        trackMouse: true
    });

    // Get current tag info
    const bandTag = getBandTag(group.id);
    const currentInterest = bandTag?.interest;
    const currentContext = bandTag?.context;

    const sceneColors = {
        'MAINSTAGE 1': '#0055a5',
        'MAINSTAGE 2': '#a6a19b',
        'WARZONE': '#949b1a',
        'VALLEY': '#ce7c19',
        'ALTAR': '#dc2829',
        'TEMPLE': '#93a7b0',
    };
    const sceneColor = sceneColors[group.SCENE] || '#333';

    // Init note safely
    useEffect(() => {
        if (state?.notes?.[group.id]) {
            setNote(state.notes[group.id]);
        } else {
            setNote('');
        }
    }, [group.id, state?.notes]);

    // Measure height when on Infos tab
    useEffect(() => {
        if (activeTab === 'infos' && cardRef.current) {
            requestAnimationFrame(() => {
                if (cardRef.current) {
                    const rect = cardRef.current.getBoundingClientRect();
                    setMeasuredHeight(rect.height);
                    // Sync global padding if not manually overridden or just generally
                    if (!manualHeight) {
                        document.documentElement.style.setProperty('--group-card-height', `${rect.height + 20}px`);
                    }
                }
            });
        }
    }, [activeTab, group.id, manualHeight]);

    // Also sync on manual height change
    useEffect(() => {
        if (manualHeight) {
            document.documentElement.style.setProperty('--group-card-height', `${manualHeight + 20}px`);
        }
    }, [manualHeight]);

    const [showTagDropdown, setShowTagDropdown] = useState(false);
    const [openUpwards, setOpenUpwards] = useState(false);
    const tagBtnRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setShowTagDropdown(false);
        if (showTagDropdown) {
            document.addEventListener('click', handleClickOutside);

            // Determine if we should open upwards
            if (tagBtnRef.current) {
                const rect = tagBtnRef.current.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                const dropdownHeight = 350; // Estimated height of the dropdown
                const spaceBelow = viewportHeight - rect.bottom;

                if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
                    setOpenUpwards(true);
                } else {
                    setOpenUpwards(false);
                }
            }
        }
        return () => document.removeEventListener('click', handleClickOutside);
    }, [showTagDropdown]);

    const handleNoteChange = (e) => {
        const newNote = e.target.value;
        setNote(newNote);
        if (updateNote && group.id) {
            updateNote(group.id, newNote);
        }
    };

    // Position adjustment logic (boundaries)
    useEffect(() => {
        if (cardRef.current && !isDragging && position) {
            const rect = cardRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let newX = position.x;
            let newY = position.y;

            if (newX + rect.width > viewportWidth) newX = viewportWidth - rect.width - 20;
            if (newX < 10) newX = 10;
            if (newY + rect.height > viewportHeight) newY = viewportHeight - rect.height - 20;
            if (newY < 60) newY = 60;

            const finalPos = { x: newX, y: newY };
            setCardPosition(finalPos);
            positionRef.current = finalPos;
        }
    }, [position]);

    // Drag handlers
    const handleMouseDown = (e) => {
        if (e.target.closest('button') || e.target.closest('.tag-dropdown')) return;
        setIsDragging(true);
        const rect = cardRef.current.getBoundingClientRect();
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging || !cardRef.current) return;
            e.preventDefault();

            const rect = cardRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let newX = e.clientX - dragOffset.x;
            let newY = e.clientY - dragOffset.y;

            if (newX < 0) newX = 0;
            if (newX + rect.width > viewportWidth) newX = viewportWidth - rect.width;
            if (newY < 0) newY = 0;
            if (newY + rect.height > viewportHeight) newY = viewportHeight - rect.height;

            const newPos = { x: newX, y: newY };
            setCardPosition(newPos);
            positionRef.current = newPos;
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            if (onPositionChange) {
                onPositionChange(positionRef.current);
            }
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

    }, [isDragging, dragOffset, onPositionChange]);
    // Touch Drag Handlers (Mobile Resize)
    const touchStartRef = useRef({ y: 0, height: 0 });
    const isTouchDraggingRef = useRef(false);

    const handleTouchStart = (e) => {
        // Only trigger on header or drag handle
        if (e.target.closest('button') || e.target.closest('.tag-dropdown')) return;

        const touch = e.touches[0];
        const currentHeight = cardRef.current.offsetHeight;

        touchStartRef.current = {
            y: touch.clientY,
            height: currentHeight
        };
        isTouchDraggingRef.current = true;

        // Disable transition for 1:1 following
        if (cardRef.current) {
            cardRef.current.style.transition = 'none';
        }
    };

    const handleTouchMove = (e) => {
        if (!isTouchDraggingRef.current || !cardRef.current) return;

        // Prevent default only if vertical scroll is intended (e.g. body scroll)
        // But here we want to resize.
        if (e.cancelable) e.preventDefault();

        const touch = e.touches[0];
        const deltaY = touchStartRef.current.y - touch.clientY; // Moving UP increases height
        let newHeight = touchStartRef.current.height + deltaY;

        // Constraints
        // MAX: Header touches Toolbar. Toolbar ~50px.
        // Constraints
        // MAX: Fixed limit requested by user.
        const maxHeight = 475;

        // MIN: Provide enough space for header only (header ~50px)
        const minHeight = 55;

        if (newHeight > maxHeight) newHeight = maxHeight;
        if (newHeight < minHeight) newHeight = minHeight;

        // Apply height directly
        cardRef.current.style.setProperty('--mobile-height', `${newHeight}px`);

        // Broadcast to app level (for padding adjustment)
        document.documentElement.style.setProperty('--group-card-height', `${newHeight + 20}px`); // +20px buffer
    };

    const handleTouchEnd = () => {
        isTouchDraggingRef.current = false;
        // Re-enable transition for smooth snaps (if needed)
        // But keep it "sticky" to where user left it.
        if (cardRef.current) {
            // Check if card is very small (closed?) -> user says "completely disappear" at bottom?
            // "en bas : que le contenu de groupCard disparraisse complètement (mais pas le header)"
            // This is matched by minHeight=60 (approx header height).

            // Re-apply transition slightly for UX feel or keep raw?
            cardRef.current.style.transition = '';

            // Save manual height to state
            const currentVar = cardRef.current.style.getPropertyValue('--mobile-height');
            if (currentVar && currentVar.endsWith('px')) {
                setManualHeight(parseFloat(currentVar));
            }
        }
    };

    useEffect(() => {
        const cardHeader = cardRef.current?.querySelector('.card-header');
        if (cardHeader) {
            cardHeader.addEventListener('touchstart', handleTouchStart, { passive: false });
            cardHeader.addEventListener('touchmove', handleTouchMove, { passive: false });
            cardHeader.addEventListener('touchend', handleTouchEnd);
        }

        return () => {
            if (cardHeader) {
                cardHeader.removeEventListener('touchstart', handleTouchStart);
                cardHeader.removeEventListener('touchmove', handleTouchMove);
                cardHeader.removeEventListener('touchend', handleTouchEnd);
            }
        };
    }, []);

    // Render single star for dropdown display
    const renderSingleStar = (level, isActive) => {
        const color = getInterestColor(level);
        return (
            <span className="interest-star-single" style={{ color: isActive ? color : '#555' }}>
                ★
            </span>
        );
    };

    // Current display in header button
    const getHeaderButtonContent = () => {
        if (currentInterest) {
            const color = getInterestColor(currentInterest);
            return (
                <span className="header-star" style={{ color }}>
                    ★
                </span>
            );
        }
        if (currentContext) {
            return <span className="header-context">{CONTEXT_TAGS[currentContext].icon}</span>;
        }
        return <span className="header-star-empty">☆</span>;
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'infos':
                return (
                    <div className="tab-content fade-in">
                        {/* LOGO DISPLAY (Simplified) */}
                        {bandLogos[group.GROUPE] && (
                            <div className="group-logo-container" style={{
                                width: '100%',
                                marginBottom: '10px',
                                display: 'flex',
                                justifyContent: 'center',
                                backgroundColor: 'black',
                                // removed background and padding
                            }}>
                                <img
                                    src={`${import.meta.env.BASE_URL}${bandLogos[group.GROUPE]}`}
                                    alt={group.GROUPE}
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '80px',
                                        objectFit: 'contain'
                                    }}
                                />
                            </div>
                        )}

                        {/* REMOVED INFO HEADER ROW AS REQUESTED */}

                        {group.STYLE && (
                            <div className="info-row">
                                <i className="fa-solid fa-music" style={{ color: sceneColor }}></i>
                                <span>{group.STYLE}</span>
                            </div>
                        )}
                        {group.PAYS && (
                            <div className="info-row">
                                <i className="fa-solid fa-globe" style={{ color: sceneColor }}></i>
                                <span>{group.PAYS}</span>
                            </div>
                        )}
                        {group.PARTICIPATIONS && (
                            <div className="info-row">
                                <i className="fa-solid fa-fire" style={{ color: sceneColor }}></i>
                                <span>{group.PARTICIPATIONS}</span>
                            </div>
                        )}
                        {group.FFO && (
                            <div className="info-block">
                                <div className="info-label">Si vous aimez...</div>
                                <div className="info-value ffo">{group.FFO}</div>
                            </div>
                        )}
                    </div>
                );
            case 'bio':
                return (
                    <div className="tab-content fade-in scrollable">
                        <p className="bio-text">{group.Bio || "Pas de biographie disponible."}</p>
                    </div>
                );
            case 'links':
                return (
                    <div className="tab-content fade-in">
                        <div className="links-grid">
                            {/* Qobuz en premier - Partenaire officiel Hellfest */}
                            {group.QOBUZ && (
                                <a href={group.QOBUZ} target="_blank" rel="noopener noreferrer" className="link-btn qobuz">
                                    <img src={`${import.meta.env.BASE_URL}icons/qobuz_icon.png`} alt="Qobuz" className="qobuz-icon" />
                                    Qobuz
                                </a>
                            )}
                            {group.SPOTIFY && <a href={group.SPOTIFY} target="_blank" rel="noopener noreferrer" className="link-btn spotify"><i className="fa-brands fa-spotify"></i> Spotify</a>}
                            {group.DEEZER && <a href={group.DEEZER} target="_blank" rel="noopener noreferrer" className="link-btn deezer"><i className="fa-brands fa-deezer"></i> Deezer</a>}
                            {group.YOUTUBE && <a href={group.YOUTUBE} target="_blank" rel="noopener noreferrer" className="link-btn youtube"><i className="fa-brands fa-youtube"></i> YouTube</a>}
                            {group.BANDCAMP && <a href={group.BANDCAMP} target="_blank" rel="noopener noreferrer" className="link-btn bandcamp"><i className="fa-brands fa-bandcamp"></i> Bandcamp</a>}
                            {group.SETLISTFM && <a href={group.SETLISTFM} target="_blank" rel="noopener noreferrer" className="link-btn setlistfm"><i className="fa-solid fa-list-ol"></i> Setlist.fm</a>}
                            {group.FACEBOOK && <a href={group.FACEBOOK} target="_blank" rel="noopener noreferrer" className="link-btn facebook"><i className="fa-brands fa-facebook"></i> Facebook</a>}
                            {group.INSTAGRAM && <a href={group.INSTAGRAM} target="_blank" rel="noopener noreferrer" className="link-btn instagram"><i className="fa-brands fa-instagram"></i> Instagram</a>}
                            {group.SITE && <a href={group.SITE} target="_blank" rel="noopener noreferrer" className="link-btn website"><i className="fa-solid fa-globe"></i> Site Web</a>}
                        </div>
                        {!group.SPOTIFY && !group.DEEZER && !group.QOBUZ && !group.YOUTUBE && !group.BANDCAMP && !group.SETLISTFM && !group.FACEBOOK && !group.INSTAGRAM && !group.SITE && (
                            <div className="no-data">Aucun lien disponible</div>
                        )}
                    </div>
                );
            case 'notes':
                return (
                    <div className="tab-content fade-in">
                        <textarea
                            className="note-input"
                            placeholder="Vos notes sur ce groupe..."
                            value={note}
                            onChange={handleNoteChange}
                        ></textarea>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div
            ref={cardRef}
            className={`group-card ${expanded ? 'expanded' : ''}`}
            style={{
                left: cardPosition?.x,
                top: cardPosition?.y,
                '--scene-color': sceneColor,
                '--mobile-height': manualHeight ? `${manualHeight}px` : (activeTab === 'infos' ? 'auto' : (measuredHeight ? `${measuredHeight}px` : 'auto')),
                zIndex: isDragging ? 1100 : 1000
            }}
        >
            <div
                className="card-header"
                style={{
                    backgroundColor: sceneColor,
                    cursor: isDragging ? 'grabbing' : 'grab'
                }}
                onMouseDown={handleMouseDown}
            >
                {/* Drag Handle Indicator */}
                <div
                    className="drag-handle"
                    style={{
                        position: 'absolute',
                        top: '6px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '40px',
                        height: '0',
                        borderTop: '4px solid rgba(255,255,255,0.3)',
                        backgroundColor: 'transparent',
                        borderRadius: '2px',
                        cursor: 'grab',
                        zIndex: 10
                    }}
                />

                <div className="header-top">
                    <h3>{group.GROUPE}</h3>
                    <div className="header-actions">
                        {/* Tag dropdown button */}
                        <div className="tag-dropdown-container" style={{ position: 'relative' }}>
                            <button
                                ref={tagBtnRef}
                                className={`favorite-btn ${(currentInterest || currentContext) ? 'active' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowTagDropdown(!showTagDropdown);
                                }}
                                title="Marquer ce groupe"
                            >
                                {getHeaderButtonContent()}
                            </button>

                            {/* Dropdown menu */}
                            {showTagDropdown && (
                                <div
                                    className={`tag-dropdown ${openUpwards ? 'upwards' : ''}`}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                        position: 'absolute',
                                        top: openUpwards ? 'auto' : '100%',
                                        bottom: openUpwards ? '100%' : 'auto',
                                        right: 0,
                                        width: '200px',
                                        backgroundColor: '#222',
                                        border: '1px solid #444',
                                        borderRadius: '8px',
                                        padding: '10px',
                                        boxShadow: openUpwards ? '0 -4px 12px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.5)',
                                        zIndex: 2000,
                                        marginTop: openUpwards ? '0' : '5px',
                                        marginBottom: openUpwards ? '5px' : '0',
                                        textAlign: 'left'
                                    }}
                                >
                                    {/* Section Intérêt */}
                                    <div className="dropdown-section-title">Intérêt</div>
                                    {INTEREST_ORDER.map(levelId => {
                                        const level = INTEREST_LEVELS[levelId];
                                        const isActive = currentInterest === levelId;
                                        return (
                                            <button
                                                key={levelId}
                                                className={`tag-dropdown-item ${isActive ? 'active' : ''}`}
                                                onClick={() => {
                                                    setInterest(group.id, isActive ? null : levelId);
                                                }}
                                                style={{
                                                    '--tag-color': getInterestColor(levelId),
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    width: '100%',
                                                    padding: '6px',
                                                    marginBottom: '4px',
                                                    background: isActive ? '#333' : 'transparent',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    color: 'white',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {renderSingleStar(levelId, isActive)}
                                                <span>{level.label}</span>
                                                {isActive && <span className="tag-check">✓</span>}
                                            </button>
                                        );
                                    })}

                                    {/* Section Contexte */}
                                    <div className="dropdown-section-title" style={{ marginTop: '10px', marginBottom: '5px', fontSize: '0.85em', color: '#888' }}>Contexte</div>
                                    {CONTEXT_ORDER.map(contextId => {
                                        const ctx = CONTEXT_TAGS[contextId];
                                        const isActive = currentContext === contextId;
                                        return (
                                            <button
                                                key={contextId}
                                                className={`tag-dropdown-item ${isActive ? 'active' : ''}`}
                                                onClick={() => {
                                                    setContext(group.id, isActive ? null : contextId);
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    width: '100%',
                                                    padding: '6px',
                                                    marginBottom: '4px',
                                                    background: isActive ? '#333' : 'transparent',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    color: 'white',
                                                    cursor: 'pointer',
                                                    textAlign: 'left'
                                                }}
                                            >
                                                <span className="tag-item-icon">{ctx.icon}</span>
                                                <span>{ctx.label}</span>
                                                {isActive && <span className="tag-check">✓</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <button className="close-btn" onClick={onClose}>
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </div>
            </div>

            {friendsWhoTagged.length > 0 && (
                <div style={{
                    padding: '4px 12px',
                    fontSize: '0.75rem',
                    color: '#bbb',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexWrap: 'wrap',
                }}>
                    <i className="fa-solid fa-users" style={{ color: '#888', fontSize: '0.65rem' }}></i>
                    <span>Tagué par </span>
                    {friendsWhoTagged.map((ft, i) => (
                        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <span style={{
                                width: '6px', height: '6px',
                                borderRadius: '50%',
                                backgroundColor: getInterestColor(ft.interest),
                                display: 'inline-block',
                            }} />
                            <span style={{ fontWeight: 500 }}>{ft.name}</span>
                            {i < friendsWhoTagged.length - 1 && <span>, </span>}
                        </span>
                    ))}
                </div>
            )}

            <div className="card-tabs">
                <button
                    className={`tab-btn ${activeTab === 'infos' ? 'active' : ''}`}
                    onClick={() => setActiveTab('infos')}
                >
                    <i className="fa-solid fa-circle-info"></i> Infos
                </button>
                <button
                    className={`tab-btn ${activeTab === 'bio' ? 'active' : ''}`}
                    onClick={() => setActiveTab('bio')}
                >
                    <i className="fa-solid fa-align-left"></i> Bio
                </button>
                <button
                    className={`tab-btn ${activeTab === 'links' ? 'active' : ''}`}
                    onClick={() => setActiveTab('links')}
                >
                    <i className="fa-solid fa-link"></i> Liens
                </button>
                <button
                    className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
                    onClick={() => setActiveTab('notes')}
                >
                    <i className="fa-solid fa-pen"></i> Notes
                </button>
            </div>

            <div className="card-body">
                {renderContent()}
            </div>
        </div>
    );
};

export default GroupCard;
