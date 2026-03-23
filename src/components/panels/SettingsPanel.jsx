import React, { useState, useEffect } from 'react';
import { useCheckedState } from '../../context/CheckedStateContext';
import { INTEREST_LEVELS, INTEREST_ORDER } from '../../constants';
import { getLineupMeta } from '../../hooks/useLineup';

const SettingsPanel = ({ isOpen, onClose, onClearCustomEvents, onRefreshLineup, lineupRefreshing }) => {
    const { state, setState, getInterestColor, setInterestColor, resetInterestColors, clearAllFavorites } = useCheckedState();
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [cacheClearing, setCacheClearing] = useState(false);
    const [lineupMeta, setLineupMeta] = useState({});

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const canUseExtendedView = windowWidth >= 1200;

    const toggleCompact = () => {
        setState(prev => ({ ...prev, compact: !prev.compact }));
    };

    const toggleReverse = () => {
        setState(prev => ({ ...prev, reverse: !prev.reverse }));
    };

    const handleLanguageChange = (lang) => {
        setState(prev => ({ ...prev, language: lang }));
    };

    // Refresh lineup meta when panel opens or after refresh
    useEffect(() => {
        if (isOpen) setLineupMeta(getLineupMeta());
    }, [isOpen, lineupRefreshing]);

    const formatDate = (ts) => {
        if (!ts) return '—';
        // If it's a string like "23/03/2026 14:47:19", return as-is
        if (typeof ts === 'string') return ts;
        // If it's a timestamp number
        return new Date(ts).toLocaleString('fr-FR');
    };

    if (!isOpen) return null;

    return (
        <div className="panel-overlay" onClick={onClose}>
            <div className="settings-panel" onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
                <div className="panel-header">
                    <h2 style={{ fontFamily: 'Metal Mania', letterSpacing: '2px' }}>
                        <i className="fa-solid fa-gear"></i>
                        Paramètres
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: '15px',
                            right: '15px',
                            background: 'transparent',
                            border: 'none',
                            color: '#666',
                            fontSize: '1.2rem',
                            cursor: 'pointer',
                            padding: '5px'
                        }}
                    >
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                {/* Section Couleurs des favoris */}
                <div className="settings-section">
                    <div className="settings-section-header">
                        <h3>Couleurs des favoris</h3>
                        <button className="settings-reset-btn" onClick={resetInterestColors}>
                            Réinitialiser
                        </button>
                    </div>
                    <p className="settings-section-desc">
                        Personnalisez les couleurs pour chaque niveau d'intérêt
                    </p>

                    <div className="color-options">
                        {INTEREST_ORDER.map(levelId => {
                            const level = INTEREST_LEVELS[levelId];
                            const currentColor = getInterestColor(levelId);

                            return (
                                <div key={levelId} className="color-option">
                                    <div className="color-option-info">
                                        <span
                                            className="color-preview-star"
                                            style={{ color: currentColor }}
                                        >
                                            ★
                                        </span>
                                        <span className="color-option-label">{level.label}</span>
                                    </div>
                                    <input
                                        type="color"
                                        value={currentColor}
                                        onChange={(e) => setInterestColor(levelId, e.target.value)}
                                        className="color-picker"
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Section Affichage */}
                <div className="settings-section">
                    <h3>Affichage</h3>

                    <label className="settings-option">
                        <div className="settings-option-info">
                            <i className="fa-solid fa-arrow-down-up-across-line"></i>
                            <div>
                                <span className="settings-option-title">Inverser l'ordre</span>
                                <span className="settings-option-desc">Matin en haut, soir en bas</span>
                            </div>
                        </div>
                        <div className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={state.reverse || false}
                                onChange={toggleReverse}
                            />
                            <span className="toggle-slider"></span>
                        </div>
                    </label>

                    {/* (Option Vue étendue déplacée dans DayView) */}


                </div>

                {/* Données du lineup */}
                <div className="settings-section">
                    <h3>Données du lineup</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: '#ccc' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#888' }}>
                                <i className="fa-solid fa-clock" style={{ marginRight: '6px', width: '14px', textAlign: 'center' }}></i>
                                Dern. refresh
                            </span>
                            <span>{formatDate(lineupMeta.lastRefresh)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#888' }}>
                                <i className="fa-solid fa-users" style={{ marginRight: '6px', width: '14px', textAlign: 'center' }}></i>
                                Groupes chargés
                            </span>
                            <span>{lineupMeta.groupCount ?? '—'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#888' }}>
                                <i className="fa-solid fa-layer-group" style={{ marginRight: '6px', width: '14px', textAlign: 'center' }}></i>
                                Overrides appliqués
                            </span>
                            <span>{lineupMeta.overrideCount ?? '—'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#888' }}>
                                <i className="fa-solid fa-database" style={{ marginRight: '6px', width: '14px', textAlign: 'center' }}></i>
                                Source
                            </span>
                            <span style={{ color: lineupMeta.source === 'google-sheets' ? '#4CAF50' : '#ff9800' }}>
                                {lineupMeta.source === 'google-sheets' ? 'Google Sheets' : lineupMeta.source === 'fallback' ? 'Fichier local' : '—'}
                            </span>
                        </div>
                    </div>
                    <button
                        className="settings-reset-btn"
                        style={{
                            width: '100%',
                            marginTop: '12px',
                            backgroundColor: '#2a2a2a',
                            border: '1px solid #555',
                            opacity: lineupRefreshing ? 0.6 : 1,
                        }}
                        disabled={lineupRefreshing}
                        onClick={async () => {
                            if (onRefreshLineup) {
                                await onRefreshLineup();
                                setLineupMeta(getLineupMeta());
                            }
                        }}
                    >
                        <i className={`fa-solid ${lineupRefreshing ? 'fa-spinner fa-spin' : 'fa-arrows-rotate'}`} style={{ marginRight: '8px' }}></i>
                        {lineupRefreshing ? 'Mise à jour en cours...' : 'Forcer la mise à jour du lineup'}
                    </button>
                </div>

                {/* Maintenance */}
                <div className="settings-section">
                    <h3>Maintenance</h3>
                    <button
                        className="settings-reset-btn"
                        style={{
                            width: '100%',
                            marginTop: '10px',
                            backgroundColor: '#2a2a2a',
                            border: '1px solid #555',
                            opacity: cacheClearing ? 0.6 : 1,
                        }}
                        disabled={cacheClearing}
                        onClick={async () => {
                            setCacheClearing(true);
                            try {
                                // Unregister all service workers
                                const registrations = await navigator.serviceWorker.getRegistrations();
                                for (const reg of registrations) {
                                    await reg.unregister();
                                }
                                // Clear all caches
                                const cacheNames = await caches.keys();
                                for (const name of cacheNames) {
                                    await caches.delete(name);
                                }
                                // Reload to re-download everything
                                window.location.reload(true);
                            } catch (err) {
                                console.error('Cache clear failed:', err);
                                setCacheClearing(false);
                            }
                        }}
                    >
                        <i className={`fa-solid ${cacheClearing ? 'fa-spinner fa-spin' : 'fa-arrows-rotate'}`} style={{ marginRight: '8px' }}></i>
                        {cacheClearing ? 'Nettoyage en cours...' : "Vider le cache et recharger l'application"}
                    </button>
                    <p style={{ color: '#888', fontSize: '0.75em', marginTop: '5px', textAlign: 'center' }}>
                        Force le re-téléchargement de l'application. Vos données sont conservées.
                    </p>
                </div>

                {/* Zone de danger */}
                <div className="settings-section">
                    <h3>Zone de danger</h3>
                    <button
                        className="settings-reset-btn danger"
                        style={{
                            width: '100%',
                            marginTop: '10px',
                            backgroundColor: confirmDelete ? '#b91c1c' : '#dc2829',
                            fontWeight: confirmDelete ? 'bold' : 'normal'
                        }}
                        onClick={() => {
                            if (confirmDelete) {
                                clearAllFavorites();
                                if (onClearCustomEvents) onClearCustomEvents();
                                onClose();
                                setConfirmDelete(false);
                            } else {
                                setConfirmDelete(true);
                                // Reset confirmation after 3 seconds if not clicked
                                setTimeout(() => setConfirmDelete(false), 3000);
                            }
                        }}
                    >
                        <i className={`fa-solid ${confirmDelete ? 'fa-triangle-exclamation' : 'fa-trash'}`} style={{ marginRight: '8px' }}></i>
                        {confirmDelete ? "CONFIRMER LA RÉINITIALISATION ?" : "Réinitialiser mon Running Order"}
                    </button>
                    {confirmDelete && (
                        <p style={{ color: '#ff6b6b', fontSize: '0.8em', marginTop: '5px', textAlign: 'center' }}>
                            Action irréversible : Efface tous les favoris et les créneaux personnalisés.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SettingsPanel;
