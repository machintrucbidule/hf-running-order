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
import HelpPanel from '../panels/HelpPanel';
import SearchPanel from '../panels/SearchPanel';

const HeaderBar = ({ viewMode, onViewChange, onInteraction, onAddCustomEvent, customEvents, contacts, onDeleteContact, onCheckContact, isGuestMode, guestName, onExitGuestMode, onClearCustomEvents, onGroupClick, playerActive, quickPlay, onTogglePlayer, filterOpen, onFilterClose, onRefreshLineup, lineupRefreshing, groups }) => {
    const { userState, syncStatus, setDay } = useCheckedState();
    const { user } = useAuth();
    const [playlistOpen, setPlaylistOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [creditsOpen, setCreditsOpen] = useState(false);
    const [statsOpen, setStatsOpen] = useState(false);
    const [contactsOpen, setContactsOpen] = useState(false);
    const [friendsOpen, setFriendsOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
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
                                <svg viewBox="0 0 48 48" width="22" height="22" style={{ display: 'block' }}>
                                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                                </svg>
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
                                <i className="fa-solid fa-people-group"></i>
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
                        className={`toolbar-btn ${searchOpen ? 'active' : ''}`}
                        title="Rechercher un groupe"
                        onClick={() => {
                            if (onInteraction) onInteraction();
                            setSearchOpen(true);
                        }}
                    >
                        <i className="fa-solid fa-magnifying-glass"></i>
                    </button>

                    {/* Vue semaine désactivée temporairement
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
                    */}

                    <button
                        className={`toolbar-btn ${helpOpen ? 'active' : ''}`}
                        title="Aide"
                        onClick={() => {
                            if (onInteraction) onInteraction();
                            setHelpOpen(true);
                        }}
                    >
                        <i className="fa-solid fa-circle-question"></i>
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

            <HelpPanel
                isOpen={helpOpen}
                onClose={() => setHelpOpen(false)}
            />

            <SearchPanel
                isOpen={searchOpen}
                onClose={() => setSearchOpen(false)}
                groups={groups}
                onGroupClick={(group) => {
                    setSearchOpen(false);
                    if (group.DAY) setDay(group.DAY);
                    // Wait for day change to render, then position card next to the band element
                    requestAnimationFrame(() => {
                        setTimeout(() => {
                            const bandEl = document.getElementById(`group-${group.id}`);
                            const vw = window.innerWidth;
                            if (bandEl && vw > 600) {
                                // Desktop: place card to the right of the band, or to the left if no space
                                const rect = bandEl.getBoundingClientRect();
                                const cardWidth = 350;
                                let x, y;
                                if (rect.right + cardWidth + 30 < vw) {
                                    x = rect.right + 10;
                                } else {
                                    x = rect.left - cardWidth - 10;
                                }
                                y = Math.max(60, Math.min(rect.top, window.innerHeight - 420));
                                if (onGroupClick) onGroupClick(group, { clientX: x, clientY: y });
                                bandEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
                            } else {
                                // Mobile: just open the card, App.jsx handles scroll to band element
                                if (onGroupClick) onGroupClick(group, { clientX: vw / 2, clientY: 80 });
                            }
                        }, 100);
                    });
                }}
            />

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
