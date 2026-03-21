import React, { useState, useEffect, useRef } from 'react';
import { useCheckedState } from '../../context/CheckedStateContext';

const GroupPopover = ({ group, position, onClose, onShowDetails }) => {
    const popoverRef = useRef(null);
    const { state, toggleBand, setInterest, setContext, getBandTag, getInterestColor } = useCheckedState();

    const isTagged = !!state.taggedBands[group.id];

    // Couleurs des scènes
    const sceneColors = {
        'MAINSTAGE 1': '#0055a5',
        'MAINSTAGE 2': '#a6a19b',
        'WARZONE': '#949b1a',
        'VALLEY': '#ce7c19',
        'ALTAR': '#dc2829',
        'TEMPLE': '#93a7b0',
    };

    const sceneColor = sceneColors[group.SCENE] || '#333';

    // Calculer la position du popover pour qu'il reste visible
    const [adjustedPosition, setAdjustedPosition] = useState(position);

    useEffect(() => {
        if (popoverRef.current) {
            const rect = popoverRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let newX = position.x;
            let newY = position.y;

            // Ajuster horizontalement
            if (position.x + rect.width > viewportWidth - 20) {
                newX = position.x - rect.width - 20;
            }

            // Ajuster verticalement
            if (position.y + rect.height > viewportHeight - 20) {
                newY = viewportHeight - rect.height - 20;
            }
            if (newY < 60) newY = 60;

            setAdjustedPosition({ x: newX, y: newY });
        }
    }, [position]);

    // Fermer au clic en dehors
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return (
        <div
            ref={popoverRef}
            className="group-popover"
            style={{
                left: adjustedPosition.x,
                top: adjustedPosition.y,
                '--scene-color': sceneColor
            }}
        >
            {/* Header avec nom du groupe */}
            <div className="popover-header" style={{ backgroundColor: sceneColor }}>
                <h3>{group.GROUPE}</h3>
                <button className="popover-close" onClick={onClose}>
                    <i className="fa-solid fa-xmark"></i>
                </button>
            </div>

            {/* Actions Contextuelles (6 éléments) */}
            <div className="popover-actions-grid">
                {/* INTEREST */}
                <div className="popover-section-title">Intérêt</div>
                <div className="popover-buttons-row">
                    <button
                        className={`popover-action-btn ${getBandTag(group.id)?.interest === 'must_see' ? 'active' : ''}`}
                        onClick={() => { setInterest(group.id, getBandTag(group.id)?.interest === 'must_see' ? null : 'must_see'); onClose(); }}
                        style={{ '--btn-color': getInterestColor('must_see') }}
                    >
                        <i className="fa-solid fa-star"></i> Incontournable
                    </button>
                    <button
                        className={`popover-action-btn ${getBandTag(group.id)?.interest === 'interested' ? 'active' : ''}`}
                        onClick={() => { setInterest(group.id, getBandTag(group.id)?.interest === 'interested' ? null : 'interested'); onClose(); }}
                        style={{ '--btn-color': getInterestColor('interested') }}
                    >
                        <i className="fa-solid fa-star-half-stroke"></i> Intéressé
                    </button>
                    <button
                        className={`popover-action-btn ${getBandTag(group.id)?.interest === 'curious' ? 'active' : ''}`}
                        onClick={() => { setInterest(group.id, getBandTag(group.id)?.interest === 'curious' ? null : 'curious'); onClose(); }}
                        style={{ '--btn-color': getInterestColor('curious') }}
                    >
                        <i className="fa-regular fa-star"></i> Curieux
                    </button>
                </div>

                {/* CONTEXT */}
                <div className="popover-section-title">Contexte</div>
                <div className="popover-buttons-row">
                    <button
                        className={`popover-action-btn ${getBandTag(group.id)?.context === 'with_friend' ? 'active' : ''}`}
                        onClick={() => { setContext(group.id, getBandTag(group.id)?.context === 'with_friend' ? null : 'with_friend'); onClose(); }}
                    >
                        <i className="fa-solid fa-user-group"></i> Avec Potes
                    </button>
                    <button
                        className={`popover-action-btn ${getBandTag(group.id)?.context === 'strategic' ? 'active' : ''}`}
                        onClick={() => { setContext(group.id, getBandTag(group.id)?.context === 'strategic' ? null : 'strategic'); onClose(); }}
                    >
                        <i className="fa-solid fa-chess"></i> Stratégique
                    </button>
                    <button
                        className={`popover-action-btn ${getBandTag(group.id)?.context === 'skip' ? 'active' : ''}`}
                        onClick={() => { setContext(group.id, getBandTag(group.id)?.context === 'skip' ? null : 'skip'); onClose(); }}
                    >
                        <i className="fa-solid fa-ban"></i> Au Bar
                    </button>
                </div>
            </div>

            {/* Footer minime */}
            <div className="popover-footer">
                <button className="popover-details-link" onClick={() => onShowDetails(group)}>
                    Voir la fiche complète
                </button>
            </div>
        </div>
    );
};

export default GroupPopover;
