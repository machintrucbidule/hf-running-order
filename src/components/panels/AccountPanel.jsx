import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCheckedState } from '../../context/CheckedStateContext';
import { useFriends } from '../../context/FriendsContext';
import APP_VERSION from '../../version';

const AccountPanel = ({ isOpen, onClose }) => {
    const { user, loginWithGoogle, logout } = useAuth();
    const { userState, syncStatus, lastSyncError, forceSync, getSyncStats } = useCheckedState();
    const { circles } = useFriends();
    const [stats, setStats] = useState(getSyncStats());
    const [confirmLogout, setConfirmLogout] = useState(false);
    const [syncing, setSyncing] = useState(false);

    // Refresh stats periodically while panel is open
    useEffect(() => {
        if (!isOpen) return;
        setStats(getSyncStats());
        const interval = setInterval(() => setStats(getSyncStats()), 2000);
        return () => clearInterval(interval);
    }, [isOpen, getSyncStats]);

    // Reset confirm on close
    useEffect(() => {
        if (!isOpen) setConfirmLogout(false);
    }, [isOpen]);

    if (!isOpen) return null;

    // Not logged in
    if (!user) {
        return (
            <div style={overlayStyle} onClick={onClose}>
                <div style={panelStyle} onClick={e => e.stopPropagation()}>
                    <CloseButton onClick={onClose} />
                    <PanelTitle>MON COMPTE</PanelTitle>
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <i className="fa-solid fa-user-slash" style={{ fontSize: '2.5rem', color: '#555', marginBottom: '15px', display: 'block' }}></i>
                        <p style={{ color: '#888', marginBottom: '20px', fontSize: '0.9rem' }}>
                            Connectez-vous pour synchroniser vos données entre vos appareils et accéder aux cercles d'amis.
                        </p>
                        <button
                            onClick={loginWithGoogle}
                            style={{
                                ...primaryBtnStyle,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                width: '100%',
                                padding: '12px',
                                fontSize: '0.95rem',
                            }}
                        >
                            <i className="fa-brands fa-google"></i>
                            Se connecter avec Google
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Compute stats
    const taggedCount = Object.keys(userState?.taggedBands || {}).length;
    const circlesCount = circles?.length || 0;
    const localStorageSize = (() => {
        try {
            const data = localStorage.getItem('checkedState') || '';
            return (new Blob([data]).size / 1024).toFixed(1);
        } catch { return '?'; }
    })();

    const formatRelativeTime = (date) => {
        if (!date) return 'Jamais';
        const diff = Date.now() - date.getTime();
        if (diff < 5000) return "À l'instant";
        if (diff < 60000) return `Il y a ${Math.floor(diff / 1000)}s`;
        if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
        return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };

    const handleForceSync = async () => {
        setSyncing(true);
        await forceSync();
        setStats(getSyncStats());
        setSyncing(false);
    };

    const handleLogout = async () => {
        await logout();
        onClose();
    };

    const syncColor = syncStatus === 'synced' ? '#4CAF50' : syncStatus === 'error' ? '#e74c3c' : syncStatus === 'syncing' ? '#FFD700' : '#888';
    const syncLabel = syncStatus === 'synced' ? 'Synchronisé' : syncStatus === 'error' ? 'Erreur' : syncStatus === 'syncing' ? 'Synchronisation...' : 'Inactif';

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={panelStyle} onClick={e => e.stopPropagation()}>
                <CloseButton onClick={onClose} />
                <PanelTitle>MON COMPTE</PanelTitle>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>

                    {/* Profile card */}
                    <div style={cardStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                            <img
                                src={user.photoURL}
                                alt=""
                                referrerPolicy="no-referrer"
                                style={{
                                    width: '50px',
                                    height: '50px',
                                    borderRadius: '50%',
                                    border: `2px solid ${syncColor}`,
                                }}
                            />
                            <div>
                                <div style={{ color: '#eee', fontWeight: 600, fontSize: '1rem' }}>
                                    {user.displayName}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                    <span style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        backgroundColor: syncColor,
                                        display: 'inline-block',
                                    }}></span>
                                    <span style={{ color: syncColor, fontSize: '0.8rem' }}>{syncLabel}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sync section */}
                    <SectionTitle>Synchronisation</SectionTitle>
                    <div style={cardStyle}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                            <InfoRow
                                icon="fa-clock-rotate-left"
                                label="Dernière synchro"
                                value={formatRelativeTime(stats.lastSyncDate)}
                            />
                            <InfoRow
                                icon="fa-check-circle"
                                label="Synchros réussies"
                                value={stats.successCount}
                                color="#4CAF50"
                            />
                            {stats.errorCount > 0 && (
                                <InfoRow
                                    icon="fa-circle-exclamation"
                                    label="Synchros échouées"
                                    value={stats.errorCount}
                                    color="#e74c3c"
                                />
                            )}
                            <InfoRow
                                icon="fa-arrow-right-arrow-left"
                                label="Requêtes Firestore"
                                value={stats.requestCount}
                            />
                            {lastSyncError && (
                                <div style={{
                                    backgroundColor: 'rgba(231, 76, 60, 0.15)',
                                    border: '1px solid rgba(231, 76, 60, 0.3)',
                                    borderRadius: '6px',
                                    padding: '8px 10px',
                                    marginTop: '4px',
                                }}>
                                    <span style={{ color: '#e74c3c', fontSize: '0.8rem' }}>
                                        <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '6px' }}></i>
                                        {lastSyncError}
                                    </span>
                                </div>
                            )}
                            <button
                                onClick={handleForceSync}
                                disabled={syncing}
                                style={{
                                    ...secondaryBtnStyle,
                                    flex: 'none',
                                    marginTop: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    opacity: syncing ? 0.6 : 1,
                                }}
                            >
                                <i className={`fa-solid fa-arrows-rotate ${syncing ? 'fa-spin' : ''}`}></i>
                                {syncing ? 'Synchronisation...' : 'Forcer la synchronisation'}
                            </button>
                        </div>
                    </div>

                    {/* Stats section */}
                    <SectionTitle>Informations</SectionTitle>
                    <div style={cardStyle}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                            <InfoRow
                                icon="fa-star"
                                label="Groupes tagués"
                                value={taggedCount}
                                color="#FFD700"
                            />
                            <InfoRow
                                icon="fa-users"
                                label="Cercles d'amis"
                                value={circlesCount}
                            />
                            <InfoRow
                                icon="fa-database"
                                label="Stockage local"
                                value={`${localStorageSize} Ko`}
                            />
                            <InfoRow
                                icon="fa-code-branch"
                                label="Version"
                                value={APP_VERSION}
                            />
                        </div>
                    </div>

                    {/* Logout */}
                    <div style={{ marginTop: '4px' }}>
                        {!confirmLogout ? (
                            <button
                                onClick={() => setConfirmLogout(true)}
                                style={{
                                    ...secondaryBtnStyle,
                                    flex: 'none',
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    color: '#e74c3c',
                                    borderColor: 'rgba(231, 76, 60, 0.3)',
                                }}
                            >
                                <i className="fa-solid fa-right-from-bracket"></i>
                                Se déconnecter
                            </button>
                        ) : (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={handleLogout}
                                    style={{
                                        ...primaryBtnStyle,
                                        backgroundColor: '#e74c3c',
                                    }}
                                >
                                    Confirmer
                                </button>
                                <button
                                    onClick={() => setConfirmLogout(false)}
                                    style={secondaryBtnStyle}
                                >
                                    Annuler
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Sub-components
const InfoRow = ({ icon, label, value, color }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#999', fontSize: '0.85rem' }}>
            <i className={`fa-solid ${icon}`} style={{ width: '16px', textAlign: 'center', color: color || '#666' }}></i>
            <span>{label}</span>
        </div>
        <span style={{ color: '#eee', fontSize: '0.85rem', fontWeight: 500 }}>{value}</span>
    </div>
);

const SectionTitle = ({ children }) => (
    <div style={{
        color: '#888',
        fontSize: '0.75rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginTop: '4px',
    }}>
        {children}
    </div>
);

const CloseButton = ({ onClick }) => (
    <button
        onClick={onClick}
        style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'transparent',
            border: 'none',
            color: '#666',
            fontSize: '1.2rem',
            cursor: 'pointer',
            padding: '5px',
        }}
    >
        <i className="fa-solid fa-xmark"></i>
    </button>
);

const PanelTitle = ({ children }) => (
    <h2 style={{
        marginTop: 0,
        marginBottom: '15px',
        color: '#FFD700',
        textAlign: 'center',
        fontFamily: '"Metal Mania", cursive',
        letterSpacing: '1px',
    }}>
        {children}
    </h2>
);

// Styles
const overlayStyle = {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    zIndex: 1500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(3px)',
    animation: 'fadeIn 0.2s',
};

const panelStyle = {
    backgroundColor: '#1a1a1a',
    borderRadius: '16px',
    padding: '20px',
    width: '90%',
    maxWidth: '380px',
    border: '1px solid #333',
    boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
    position: 'relative',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
};

const cardStyle = {
    backgroundColor: '#2a2a2a',
    borderRadius: '8px',
    padding: '12px',
    border: '1px solid #444',
};

const primaryBtnStyle = {
    flex: 1,
    padding: '10px',
    backgroundColor: '#FF6B35',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: '0.2s',
};

const secondaryBtnStyle = {
    flex: 1,
    padding: '10px',
    backgroundColor: '#2a2a2a',
    border: '1px solid #555',
    borderRadius: '8px',
    color: '#eee',
    fontWeight: 500,
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: '0.2s',
};

export default AccountPanel;
