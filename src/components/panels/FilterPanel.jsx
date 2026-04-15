import React, { useState, useEffect } from 'react';
import { useCheckedState } from '../../context/CheckedStateContext';

const FilterPanel = ({ isOpen, onClose }) => {
    const { state, toggleScene, setScenes, setState } = useCheckedState();
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const mainScenes = [
        { id: 'mainstage1', name: 'Mainstage 1', color: '#0055a5' },
        { id: 'mainstage2', name: 'Mainstage 2', color: '#a6a19b' },
        { id: 'warzone', name: 'Warzone', color: '#949b1a' },
        { id: 'valley', name: 'Valley', color: '#ce7c19' },
        { id: 'temple', name: 'Temple', color: '#93a7b0' },
        { id: 'altar', name: 'Altar', color: '#dc2829' }
    ];

    const sideScenesList = [
        { id: 'hellstage', name: 'Hellstage', color: '#239c60' },
        { id: 'purple_house', name: 'Purple House', color: '#9500c6' },
        { id: 'metal_corner', name: 'Metal Corner', color: '#9f9c78' }
    ];

    const isSmallScreen = windowWidth < 1200;

    let scenesList;
    if (state.sideScenes) {
        if (isSmallScreen) {
            // Mobile + SideScenes = Annexes only
            scenesList = sideScenesList;
        } else {
            // Desktop + SideScenes = All
            scenesList = [...mainScenes, ...sideScenesList];
        }
    } else {
        // SideScenes OFF = Main only
        scenesList = mainScenes;
    }

    const handleSelectAll = () => {
        // Vérifier si toutes les scènes AJOUTÉES sont cochées
        const allOn = scenesList.every(s => state.scenes[s.id] !== false);
        const newScenes = { ...state.scenes };
        scenesList.forEach(s => newScenes[s.id] = !allOn);
        setScenes(newScenes);
    };

    if (!isOpen) return null;

    return (
        <div className="panel-overlay" onClick={onClose}>
            <div className="filter-panel" onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
                <div className="panel-header">
                    <h2 style={{ fontFamily: 'Metal Mania', letterSpacing: '2px' }}>
                        <i className="fa-solid fa-tent"></i>
                        Scènes
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

                <div className="filter-section">

                    {/* Toggle Inverser l'ordre */}
                    <div style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
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
                                    onChange={() => setState(prev => ({ ...prev, reverse: !prev.reverse }))}
                                />
                                <span className="toggle-slider"></span>
                            </div>
                        </label>
                    </div>

                    {/* Toggle global Scènes Annexes */}
                    <div style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <label className="settings-option">
                            <div className="settings-option-info">
                                <i className="fa-solid fa-tent"></i>
                                <div>
                                    <span className="settings-option-title">Activer Scènes Annexes</span>
                                    <span className="settings-option-desc">Hell Stage, Purple House, Metal Corner</span>
                                </div>
                            </div>
                            <div className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={state.sideScenes || false}
                                    onChange={() => setState(prev => ({ ...prev, sideScenes: !prev.sideScenes }))}
                                />
                                <span className="toggle-slider"></span>
                            </div>
                        </label>
                    </div>

                    <div className="filter-section-header">
                        <h3>Scènes visibles</h3>
                        <button className="filter-toggle-all" onClick={handleSelectAll}>
                            {scenesList.every(s => state.scenes[s.id] !== false) ? 'Tout désélectionner' : 'Tout sélectionner'}
                        </button>
                    </div>

                    <div className="filter-scenes-grid">
                        {scenesList.map((scene) => (
                            <label
                                key={scene.id}
                                className={`filter-scene-item ${state.scenes[scene.id] !== false ? 'active' : ''}`}
                                style={{
                                    '--scene-color': scene.color,
                                    backgroundColor: state.scenes[scene.id] !== false ? scene.color : 'rgba(255, 255, 255, 0.05)'
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={state.scenes[scene.id] !== false}
                                    onChange={() => toggleScene(scene.id)}
                                />
                                <span className="filter-scene-name">{scene.name}</span>
                                <i className={`fa-solid ${state.scenes[scene.id] !== false ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FilterPanel;
