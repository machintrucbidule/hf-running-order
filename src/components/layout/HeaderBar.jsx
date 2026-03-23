import React, { useState } from 'react';
import PlaylistPanel from '../panels/PlaylistPanel';
import FilterPanel from '../panels/FilterPanel';
import SettingsPanel from '../panels/SettingsPanel';
import CreditsPanel from '../panels/CreditsPanel';
import ContactsPanel from '../panels/ContactsPanel';
import FriendsPanel from '../panels/FriendsPanel';
import AccountPanel from '../panels/AccountPanel';
import ProfileModal from '../modals/ProfileModal';
import { useCheckedState } from '../../context/CheckedStateContext';
import { useAuth } from '../../context/AuthContext';
import StatsPanel from '../panels/StatsPanel';

const HeaderBar = ({ viewMode, onViewChange, onInteraction, onAddCustomEvent, customEvents, contacts, onDeleteContact, onCheckContact, isGuestMode, guestName, onExitGuestMode, onClearCustomEvents, onGroupClick, playerActive, quickPlay, onTogglePlayer, filterOpen, onFilterClose, onRefreshLineup, lineupRefreshing }) => {
    const { userState, syncStatus } = useCheckedState();
    const { user } = useAuth();
    const [playlistOpen, setPlaylistOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [creditsOpen, setCreditsOpen] = useState(false);
    const [statsOpen, setStatsOpen] = useState(false);
    const [contactsOpen, setContactsOpen] = useState(false);
    const [friendsOpen, setFriendsOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    React.useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const handleOpenPanel = (id) => {
        if (id === 'stats') setStatsOpen(true);
        if (id === 'playlists') setPlaylistOpen(true);
        if (id === 'contacts') setContactsOpen(true);
        if (id === 'friends') setFriendsOpen(true);
        if (id === 'settings') setSettingsOpen(true);
        if (id === 'credits') setCreditsOpen(true);
    };

    // Account button: color based on sync status when logged in
    const getAccountBtnStyle = () => {
        if (!user) return undefined;
        if (syncStatus === 'synced' && isOnline) return { color: '#4CAF50' };
        if (syncStatus === 'syncing') return { color: '#FFD700' };
        if (syncStatus === 'error' || !isOnline) return { color: '#e74c3c' };
        return { color: '#888' };
    };

    const handleAccountClick = () => {
        if (onInteraction) onInteraction();
        if (!user) {
            // Open account panel which shows login
            setAccountOpen(true);
        } else {
            setAccountOpen(true);
        }
    };

    return (
        <>
            <header>
                <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <img
                            src={`${import.meta.env.BASE_URL}icons/icon-192x192.png`}
                            alt="RO Planner Logo"
                            style={{
                                height: '35px',
                                width: '35px',
                                borderRadius: '8px',
                                boxShadow: '0 0 10px rgba(0,0,0,0.5)',
                                border: '1px solid rgba(255,255,255,0.05)'
                            }}
                        />
                        {/* Account button */}
                        {user ? (
                            <button
                                className={`toolbar-btn ${accountOpen ? 'active' : ''}`}
                                title="Mon compte"
                                onClick={handleAccountClick}
                                style={{ position: 'relative', padding: '3px 7px', marginLeft: '6px' }}
                            >
                                <img
                                    src={user.photoURL}
                                    alt=""
                                    referrerPolicy="no-referrer"
                                    style={{
                                        width: '30px',
                                        height: '30px',
                                        borderRadius: '50%',
                                        display: 'block',
                                        border: `2px solid ${syncStatus === 'synced' ? '#4CAF50' : syncStatus === 'error' ? '#e74c3c' : syncStatus === 'syncing' ? '#FFD700' : '#555'}`,
                                    }}
                                />
                                {syncStatus === 'syncing' && (
                                    <i className="fa-solid fa-arrows-rotate" style={{
                                        position: 'absolute',
                                        bottom: '2px',
                                        right: '4px',
                                        fontSize: '0.55rem',
                                        color: '#FFD700',
                                        animation: 'pulse 1.5s infinite',
                                        backgroundColor: '#1a1a1a',
                                        borderRadius: '50%',
                                        padding: '2px',
                                    }}></i>
                                )}
                            </button>
                        ) : (
                            <button
                                className={`toolbar-btn ${accountOpen ? 'active' : ''}`}
                                title="Se connecter"
                                onClick={handleAccountClick}
                            >
                                <i className="fa-solid fa-right-to-bracket"></i>
                            </button>
                        )}
                        {/* Friends button - only when logged in */}
                        {user && (
                            <button
                                className={`toolbar-btn ${friendsOpen ? 'active' : ''}`}
                                title="Mes amis"
                                onClick={() => {
                                    if (onInteraction) onInteraction();
                                    setFriendsOpen(true);
                                }}
                            >
                                <i className="fa-solid fa-user-group"></i>
                            </button>
                        )}
                    </div>
                    {isGuestMode && (
                        <div style={{
                            fontSize: '0.8rem',
                            color: '#FFD700',
                            marginLeft: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                        }}>
                            <i className="fa-solid fa-eye"></i>
                            <span>{guestName}</span>
                            <button
                                onClick={onExitGuestMode}
                                style={{
                                    background: 'rgba(255,255,255,0.1)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '20px',
                                    height: '20px',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                ×
                            </button>
                        </div>
                    )}
                </div>

                <div className="toolbar">
                    <button
                        className={`toolbar-btn ${playerActive ? 'active' : ''}`}
                        title={playerActive ? 'Fermer le lecteur' : 'Ouvrir le lecteur'}
                        onClick={() => {
                            if (onInteraction) onInteraction();
                            onTogglePlayer();
                        }}
                        style={playerActive ? { color: quickPlay ? '#ff9800' : '#4CAF50' } : undefined}
                    >
                        <i className="fa-solid fa-headphones"></i>
                    </button>

                    <button
                        className={`toolbar-btn ${viewMode === 'week' ? 'active' : ''}`}
                        title={viewMode === 'week' ? "Vue Journalière" : "Vue Semaine"}
                        onClick={() => {
                            if (onInteraction) onInteraction();
                            onViewChange(viewMode === 'week' ? 'day' : 'week');
                        }}
                    >
                        <i className={`fa-solid ${viewMode === 'week' ? 'fa-calendar-day' : 'fa-calendar-week'}`}></i>
                    </button>

                    <button
                        className={`toolbar-btn ${profileOpen ? 'active' : ''}`}
                        title="Menu Profil"
                        onClick={() => {
                            if (onInteraction) onInteraction();
                            setProfileOpen(true);
                        }}
                        style={{ marginLeft: '5px' }}
                    >
                        <i className="fa-solid fa-bars"></i>
                    </button>
                </div>
            </header>

            <FilterPanel
                isOpen={filterOpen}
                onClose={onFilterClose}
            />

            <PlaylistPanel
                isOpen={playlistOpen}
                onClose={() => setPlaylistOpen(false)}
            />

            <SettingsPanel
                isOpen={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                onClearCustomEvents={onClearCustomEvents}
                onRefreshLineup={onRefreshLineup}
                lineupRefreshing={lineupRefreshing}
            />

            <CreditsPanel
                isOpen={creditsOpen}
                onClose={() => setCreditsOpen(false)}
            />

            <ContactsPanel
                isOpen={contactsOpen}
                onClose={() => setContactsOpen(false)}
                contacts={contacts}
                onDeleteContact={onDeleteContact}
                onCheckContact={onCheckContact}
            />

            <FriendsPanel
                isOpen={friendsOpen}
                onClose={() => setFriendsOpen(false)}
            />

            <AccountPanel
                isOpen={accountOpen}
                onClose={() => setAccountOpen(false)}
            />

            {statsOpen && (
                <StatsPanel
                    onClose={() => setStatsOpen(false)}
                    customEvents={customEvents}
                    onGroupClick={onGroupClick}
                />
            )}

            <ProfileModal
                isOpen={profileOpen}
                onClose={() => setProfileOpen(false)}
                onOpenPanel={handleOpenPanel}
                onOpenAccount={() => setAccountOpen(true)}
            />

        </>
    );
};

export default HeaderBar;
