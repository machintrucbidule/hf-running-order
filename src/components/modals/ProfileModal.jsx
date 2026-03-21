import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const ProfileModal = ({ isOpen, onClose, onOpenPanel, onShare }) => {
    const { user, loginWithGoogle, logout } = useAuth();
    const [authLoading, setAuthLoading] = useState(false);

    if (!isOpen) return null;

    const MENU_ITEMS = [
        { id: 'settings', label: 'Paramètres', icon: 'fa-solid fa-gear', color: '#aaa' },
        { id: 'friends', label: 'Mes Amis', icon: 'fa-solid fa-users', color: '#FF6B35', disabled: !user },
        { id: 'stats', label: 'Stats', icon: 'fa-solid fa-chart-pie', color: '#FFD700' },
        { id: 'playlists', label: 'Playlists', icon: 'fa-solid fa-music', color: '#1DB954' },
        { id: 'share', label: 'Partager', icon: 'fa-solid fa-share-nodes', color: '#9C27B0' },
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

                {/* Auth Section */}
                <div style={{
                    marginBottom: '15px',
                    padding: '12px',
                    backgroundColor: '#222',
                    borderRadius: '10px',
                    border: '1px solid #333',
                }}>
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
                            <button
                                onClick={handleLogout}
                                style={{
                                    background: 'rgba(255,255,255,0.08)',
                                    border: '1px solid #444',
                                    borderRadius: '6px',
                                    color: '#aaa',
                                    padding: '5px 10px',
                                    cursor: 'pointer',
                                    fontSize: '0.75rem',
                                }}
                            >
                                <i className="fa-solid fa-right-from-bracket"></i>
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleLogin}
                            disabled={authLoading}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                padding: '10px',
                                backgroundColor: '#2a2a2a',
                                border: '1px solid #555',
                                borderRadius: '8px',
                                color: '#eee',
                                cursor: authLoading ? 'wait' : 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: 500,
                                transition: '0.2s',
                                opacity: authLoading ? 0.6 : 1,
                            }}
                        >
                            <i className="fa-brands fa-google" style={{ color: '#FFD700' }}></i>
                            {authLoading ? 'Connexion...' : 'Connexion avec Google'}
                        </button>
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
                                if (item.id === 'share') {
                                    onShare();
                                } else {
                                    onOpenPanel(item.id);
                                }
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
