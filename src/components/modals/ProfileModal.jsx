import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const ProfileModal = ({ isOpen, onClose, onOpenPanel, onOpenAccount }) => {
    const { user } = useAuth();

    if (!isOpen) return null;

    const MENU_ITEMS = [
        { id: 'settings', label: 'Paramètres', icon: 'fa-solid fa-gear', color: '#aaa' },
        { id: 'stats', label: 'Stats', icon: 'fa-solid fa-chart-pie', color: '#FFD700' },
        { id: 'playlists', label: 'Playlists', icon: 'fa-solid fa-music', color: '#1DB954' },
        { id: 'credits', label: 'Crédits', icon: 'fa-solid fa-heart', color: '#ff6b6b' },
    ];

    const handleLogin = async () => {
        setAuthLoading(true);
        try {
            await loginWithGoogle();
            onClose();
        } catch (err) {
            if (err.code !== 'auth/popup-closed-by-user') {
                console.error('Login failed:', err);
            }
        }
        setAuthLoading(false);
    };

    const handleLogout = async () => {
        await logout();
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8  )',
            zIndex: 1500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(3px)',
            animation: 'fadeIn 0.2s'
        }} onClick={onClose}>
            <div style={{
                backgroundColor: '#1a1a1a',
                borderRadius: '16px',
                padding: '15px',
                width: '90%',
                maxWidth: '350px',
                border: '1px solid #333',
                boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
                position: 'relative'
            }} onClick={e => e.stopPropagation()}>

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

                <h2 style={{
                    marginTop: 0,
                    marginBottom: '15px',
                    color: '#FFD700',
                    textAlign: 'center',
                    fontFamily: '"Metal Mania", cursive',
                    letterSpacing: '1px'
                }}>
                    MENU
                </h2>

                {/* Auth Section - clickable to open account panel */}
                <div
                    style={{
                        marginBottom: '15px',
                        padding: '12px',
                        backgroundColor: '#222',
                        borderRadius: '10px',
                        border: '1px solid #333',
                        cursor: 'pointer',
                        transition: '0.2s',
                    }}
                    onClick={() => {
                        onClose();
                        onOpenAccount();
                    }}
                >
                    {user ? (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                        }}>
                            <img
                                src={user.photoURL}
                                alt=""
                                referrerPolicy="no-referrer"
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    border: '2px solid #FFD700',
                                }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    color: '#eee',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {user.displayName}
                                </div>
                                <div style={{ color: '#888', fontSize: '0.7rem' }}>
                                    <i className="fa-solid fa-cloud-check" style={{ color: '#4CAF50', marginRight: '4px' }}></i>
                                    Sync active
                                </div>
                            </div>
                            <i className="fa-solid fa-chevron-right" style={{ color: '#555', fontSize: '0.8rem' }}></i>
                        </div>
                    ) : (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            color: '#eee',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                        }}>
                            <i className="fa-solid fa-right-to-bracket" style={{ color: '#FFD700' }}></i>
                            Se connecter
                            <i className="fa-solid fa-chevron-right" style={{ color: '#555', fontSize: '0.8rem', marginLeft: 'auto' }}></i>
                        </div>
                    )}
                </div>

                <div className="profile-menu-grid">
                    {MENU_ITEMS.map(item => (
                        <button
                            key={item.id}
                            className="profile-menu-btn"
                            disabled={item.disabled}
                            style={item.disabled ? { opacity: 0.4, pointerEvents: 'none' } : undefined}
                            onClick={() => {
                                onClose();
                                onOpenPanel(item.id);
                            }}
                        >
                            <div style={{ color: item.color }} className="profile-menu-icon">
                                <i className={item.icon}></i>
                            </div>
                            <span className="profile-menu-label">{item.label}</span>
                        </button>
                    ))}
                </div>

                <div style={{
                    textAlign: 'center',
                    marginTop: '10px',
                    fontSize: '0.8rem',
                    color: '#666'
                }}>
                    {(() => {
                        const now = new Date();
                        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        const festivalStart = new Date(2026, 5, 18);
                        const festivalEnd = new Date(2026, 5, 21);

                        if (today < festivalStart) {
                            const diffTime = festivalStart - today;
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            return `J - ${diffDays} avant l'Enfer`;
                        } else if (today <= festivalEnd) {
                            return "Bon Festival !";
                        } else {
                            return "See you next year !";
                        }
                    })()}
                </div>
            </div>
        </div>
    );
};

export default ProfileModal;
