import React, { useState, useRef, useEffect, useMemo } from 'react';
import './SearchPanel.css';
import { useCheckedState } from '../../context/CheckedStateContext';
import { INTEREST_LEVELS, INTEREST_ORDER, CONTEXT_TAGS, CONTEXT_ORDER } from '../../constants';

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

const sceneLabels = {
    "MAINSTAGE 1": 'MS1',
    "MAINSTAGE 2": 'MS2',
    "WARZONE": 'Warzone',
    "VALLEY": 'Valley',
    "ALTAR": 'Altar',
    "TEMPLE": 'Temple',
    "HELLSTAGE": 'Hellstage',
    "PURPLE_HOUSE": 'Purple House',
    "METAL_CORNER": 'Metal Corner'
};

const dayLabels = {
    "Mercredi": 'Mer.',
    "Jeudi": 'Jeu.',
    "Vendredi": 'Ven.',
    "Samedi": 'Sam.',
    "Dimanche": 'Dim.'
};

function normalize(str) {
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function renderStars(levelId, isActive) {
    const level = INTEREST_LEVELS[levelId];
    const stars = [];
    for (let i = 0; i < level.stars; i++) {
        stars.push(
            <i
                key={i}
                className="fa-solid fa-star"
                style={{ color: isActive ? level.defaultColor : '#666', fontSize: '0.65em', marginRight: '1px' }}
            />
        );
    }
    return <span className="search-tag-stars">{stars}</span>;
}

const SearchPanel = ({ isOpen, onClose, groups, onGroupClick }) => {
    const [query, setQuery] = useState('');
    const [tagDropdownId, setTagDropdownId] = useState(null);
    const inputRef = useRef(null);
    const { getBandTag, getInterestColor, setInterest, setContext } = useCheckedState();

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setTagDropdownId(null);
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                }
            }, 50);
        }
    }, [isOpen]);

    const normalizedQuery = query.trim().length >= 2 ? normalize(query.trim()) : '';

    const results = useMemo(() => {
        if (!normalizedQuery) return [];
        const matches = (groups || []).filter(g =>
            normalize(g.GROUPE).includes(normalizedQuery)
        );
        // Sort alphabetically
        matches.sort((a, b) => a.GROUPE.localeCompare(b.GROUPE));
        return matches;
    }, [groups, normalizedQuery]);

    const showResults = normalizedQuery.length > 0;
    const tooMany = results.length > 20;
    const displayedResults = tooMany ? [] : results;

    if (!isOpen) return null;

    return (
        <div className="panel-overlay search-overlay" onClick={onClose}>
            <div className="search-panel" onClick={(e) => e.stopPropagation()}>
                <div className="search-panel-header">
                    <div className="search-panel-header-content">
                        <h2>
                            <i className="fa-solid fa-magnifying-glass" style={{ color: '#FFD700' }}></i>
                            Recherche
                        </h2>
                        <button className="search-close-btn" onClick={onClose}>
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    <div className="search-input-wrapper">
                        <i className="fa-solid fa-magnifying-glass search-input-icon"></i>
                        <input
                            ref={inputRef}
                            type="text"
                            className="search-input"
                            placeholder="Nom du groupe..."
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setTagDropdownId(null);
                            }}
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck="false"
                        />
                        {query && (
                            <button className="search-clear-btn" onClick={() => setQuery('')}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        )}
                    </div>
                </div>

                <div className="search-results">
                    {!showResults && (
                        <div className="search-placeholder">
                            <i className="fa-solid fa-guitar"></i>
                            <p>Tapez au moins 2 caractères pour rechercher</p>
                        </div>
                    )}

                    {showResults && tooMany && (
                        <div className="search-placeholder">
                            <i className="fa-solid fa-filter"></i>
                            <p>{results.length} résultats — affinez votre recherche</p>
                        </div>
                    )}

                    {showResults && !tooMany && results.length === 0 && (
                        <div className="search-placeholder">
                            <i className="fa-solid fa-face-sad-tear"></i>
                            <p>Aucun groupe trouvé</p>
                        </div>
                    )}

                    {displayedResults.map(group => {
                        const bandTag = getBandTag(group.id);
                        const hasInterest = !!bandTag?.interest;
                        const hasContext = !!bandTag?.context;
                        const isTagged = hasInterest || hasContext;
                        const interestColor = hasInterest ? getInterestColor(bandTag.interest) : null;
                        const sceneColor = sceneColors[group.SCENE] || '#666';
                        const sceneLabel = sceneLabels[group.SCENE] || group.SCENE;
                        const dayLabel = dayLabels[group.DAY] || group.DAY;
                        const isDropdownOpen = tagDropdownId === group.id;

                        return (
                            <div key={group.id} className="search-result-item-wrapper">
                                <div className="search-result-item">
                                    <button
                                        className={`search-star-btn ${isTagged ? 'tagged' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setTagDropdownId(isDropdownOpen ? null : group.id);
                                        }}
                                        title="Marquer ce groupe"
                                    >
                                        {hasInterest ? (
                                            <i className="fa-solid fa-star" style={{ color: interestColor }}></i>
                                        ) : hasContext ? (
                                            <span className="search-star-context-icon">{CONTEXT_TAGS[bandTag.context]?.icon}</span>
                                        ) : (
                                            <i className="fa-regular fa-star"></i>
                                        )}
                                    </button>

                                    <div className="search-result-info" onClick={() => onGroupClick(group)}>
                                        <span className="search-result-name">{group.GROUPE}</span>
                                        <div className="search-result-meta">
                                            <span className="search-result-day">{dayLabel}</span>
                                            <span className="search-result-time">{group.DEBUT}</span>
                                            <span
                                                className="search-scene-badge"
                                                style={{ backgroundColor: sceneColor }}
                                            >
                                                {sceneLabel}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {isDropdownOpen && (
                                    <div className="search-tag-dropdown" onClick={(e) => e.stopPropagation()}>
                                        <div className="search-tag-section-title">Intérêt</div>
                                        {INTEREST_ORDER.map(levelId => {
                                            const level = INTEREST_LEVELS[levelId];
                                            const isActive = bandTag?.interest === levelId;
                                            return (
                                                <button
                                                    key={levelId}
                                                    className={`search-tag-item ${isActive ? 'active' : ''}`}
                                                    onClick={() => setInterest(group.id, isActive ? null : levelId)}
                                                >
                                                    {renderStars(levelId, isActive)}
                                                    <span className="search-tag-label">{level.label}</span>
                                                    {isActive && <span className="search-tag-check">✓</span>}
                                                </button>
                                            );
                                        })}
                                        <div className="search-tag-section-title" style={{ marginTop: '6px' }}>Contexte</div>
                                        {CONTEXT_ORDER.map(contextId => {
                                            const ctx = CONTEXT_TAGS[contextId];
                                            const isActive = bandTag?.context === contextId;
                                            return (
                                                <button
                                                    key={contextId}
                                                    className={`search-tag-item ${isActive ? 'active' : ''}`}
                                                    onClick={() => setContext(group.id, isActive ? null : contextId)}
                                                >
                                                    <span className="search-tag-ctx-icon">{ctx.icon}</span>
                                                    <span className="search-tag-label">{ctx.label}</span>
                                                    {isActive && <span className="search-tag-check">✓</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default SearchPanel;
