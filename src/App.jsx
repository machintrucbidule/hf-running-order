import React, { useState, useEffect, useRef } from 'react';
import { useSwipeable } from 'react-swipeable';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import { DAYS } from './constants';
import { CheckedStateProvider, useCheckedState } from './context/CheckedStateContext';
import { useAuth } from './context/AuthContext';
import { FriendsProvider } from './context/FriendsContext';
import { useLineup } from './hooks/useLineup';
import { fetchUserData, saveUserData } from './services/firestoreSync';
import HeaderBar from './components/layout/HeaderBar';
import Navigation from './components/layout/Navigation';
import FilterBar from './components/layout/FilterBar';
import DayView from './components/views/DayView';
import WeeklyView from './components/views/WeeklyView';
import GroupCard from './components/common/GroupCard';
import './styles/App.css';

import CustomEventModal from './components/modals/CustomEventModal';
import ImportModal from './components/modals/ImportModal';
import ConfirmationModal from './components/modals/ConfirmationModal';
import ContactsPanel from './components/panels/ContactsPanel';
import WelcomeModal from './components/modals/WelcomeModal';
import { parseShareData } from './utils/sharingUtils';

function AppContent() {
  const { data: groups, loading, error } = useLineup();
  const { state, setDay, setState, isGuestMode, guestRo, setGuestRo } = useCheckedState();
  const { user } = useAuth();
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [popoverPosition, setPopoverPosition] = useState(null);
  const [viewMode, setViewMode] = useState('day');

  const [customEvents, setCustomEvents] = useState(() => {
    const saved = localStorage.getItem('customEvents');
    return saved ? JSON.parse(saved) : [];
  });
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  const [editingEvent, setEditingEvent] = useState(null);

  const [bandFilter, setBandFilter] = useState(() => localStorage.getItem('bandFilter') || 'all');

  const [importData, setImportData] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [contacts, setContacts] = useState(() => {
    const saved = localStorage.getItem('contacts');
    return saved ? JSON.parse(saved) : [];
  });
  const [contactToOverwrite, setContactToOverwrite] = useState(null);

  const appDataSynced = useRef(false);

  // Persist to localStorage (unchanged)
  useEffect(() => {
    localStorage.setItem('contacts', JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem('customEvents', JSON.stringify(customEvents));
  }, [customEvents]);

  useEffect(() => {
    localStorage.setItem('bandFilter', bandFilter);
  }, [bandFilter]);

  // Initial sync of customEvents/contacts from Firestore
  useEffect(() => {
    if (!user || appDataSynced.current) return;
    appDataSynced.current = true;

    const doSync = async () => {
      try {
        const result = await fetchUserData(user.uid);
        if (result.exists && result.data) {
          if (result.data.customEvents) setCustomEvents(result.data.customEvents);
          if (result.data.contacts) setContacts(result.data.contacts);
        }
      } catch (err) {
        console.error('App data sync failed:', err);
      }
    };
    doSync();
  }, [user]);

  // Write customEvents/contacts to Firestore on changes
  useEffect(() => {
    if (!user || !appDataSynced.current) return;
    saveUserData(user.uid, { customEvents });
  }, [customEvents, user]);

  useEffect(() => {
    if (!user || !appDataSynced.current) return;
    saveUserData(user.uid, { contacts });
  }, [contacts, user]);

  // Reset sync flag on logout
  useEffect(() => {
    if (!user) appDataSynced.current = false;
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareToken = params.get('share');
    if (shareToken) {
      const data = parseShareData(shareToken);
      if (data) {
        setImportData(data);
        setIsImportModalOpen(true);
      }
      window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
    }
  }, []);


  const handleImportReplace = (data) => {
    setState(prev => ({
      ...prev,
      taggedBands: data.bands
    }));

    setCustomEvents(data.customEvents);
    setIsImportModalOpen(false);
  };

  const handleSaveContact = (data) => {
    if (contacts.some(c => c.username === data.username)) {
      setContactToOverwrite(data);
    } else {
      saveContactDirectly(data);
      setIsImportModalOpen(false);
    }
  };

  const saveContactDirectly = (data) => {
    setContacts(prev => {
      if (prev.some(c => c.username === data.username)) {
        return prev.map(c => c.username === data.username ? { ...c, data: data, importedAt: new Date().toISOString() } : c);
      }
      const newContact = {
        id: Date.now(),
        username: data.username,
        data: data,
        importedAt: new Date().toISOString()
      };
      return [...prev, newContact];
    });
  };

  const handleConfirmOverwrite = () => {
    if (contactToOverwrite) {
      setContacts(prev => prev.map(c => c.username === contactToOverwrite.username ? { ...c, data: contactToOverwrite, importedAt: new Date().toISOString() } : c));
      setContactToOverwrite(null);
      setIsImportModalOpen(false);
    }
  };

  const handleDeleteContact = (id) => {
    setContacts(prev => prev.filter(c => c.id !== id));
  };


  const handleCheckContactFromPanel = (data, mode) => {
    if (mode === 'replace') handleImportReplace(data);
    if (mode === 'view') {
      setGuestRo(data);
      setIsImportModalOpen(false);
    }
  };

  const handleAddCustomEvent = (event) => {
    setCustomEvents(prev => {
      const index = prev.findIndex(e => e.id === event.id);
      if (index !== -1) {
        const newEvents = [...prev];
        newEvents[index] = event;
        return newEvents;
      }
      return [...prev, event];
    });
    setEditingEvent(null);
  };

  const handleEditCustomEvent = (event) => {
    setEditingEvent(event);
    setIsCustomModalOpen(true);
  };

  const handleDeleteCustomEvent = (id) => {
    setCustomEvents(customEvents.filter(e => e.id !== id));
  };

  const handleClearCustomEvents = () => {
    setCustomEvents([]);
  };


  const swipeHandlers = useSwipeable({
    onSwipedLeft: (eventData) => {
      if (eventData.event.target.closest('.group-card')) return;

      if (viewMode === 'day') {
        const currentIndex = DAYS.indexOf(state.day);
        if (currentIndex !== -1 && currentIndex < DAYS.length - 1) {
          setDay(DAYS[currentIndex + 1]);
        }
      }
    },
    onSwipedRight: (eventData) => {
      if (eventData.event.target.closest('.group-card')) return;

      if (viewMode === 'day') {
        const currentIndex = DAYS.indexOf(state.day);
        if (currentIndex > 0) {
          setDay(DAYS[currentIndex - 1]);
        }
      }
    },
    preventScrollOnSwipe: false,
    trackMouse: false
  });

  const handleCardPositionChange = (newPos) => {
    setPopoverPosition(newPos);
  };

  const handleGroupSelect = (group, event) => {
    if (group) {
      setSelectedGroup(group);

      if (!selectedGroup && event) {
        let x = event.clientX + 20;
        let y = event.clientY;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (viewportWidth > 600) {
          if (x + 350 > viewportWidth) x = event.clientX - 370;
          if (y + 400 > viewportHeight) y = viewportHeight - 420;
          if (y < 60) y = 60;
        }

        setPopoverPosition({ x, y });
      }

      if (window.innerWidth <= 600) {
        setTimeout(() => {
          const element = document.getElementById(`group-${group.id}`);
          if (element) {
            element.scrollIntoView({ block: 'center', behavior: 'smooth' });
          }
        }, 350);
      }

    } else {
      setSelectedGroup(null);
      setPopoverPosition(null);
    }
  };

  if (loading) return <div className="loading">Chargement du Hellfest... 🤘</div>;
  if (error) return <div className="error">Erreur : {error.message}</div>;

  const currentDayGroups = groups.filter(group => group.DAY === state.day);

  return (
    <div className={`App ${selectedGroup ? 'group-selected' : ''}`}>
      <HeaderBar
        viewMode={viewMode}
        onViewChange={setViewMode}
        onInteraction={() => setSelectedGroup(null)}
        onAddCustomEvent={() => setIsCustomModalOpen(true)}
        customEvents={isGuestMode ? (guestRo.customEvents || []) : customEvents}
        contacts={contacts}
        onSaveContact={handleSaveContact}
        onDeleteContact={handleDeleteContact}
        onCheckContact={handleCheckContactFromPanel}
        isGuestMode={isGuestMode}
        guestName={isGuestMode ? guestRo.username : null}
        onExitGuestMode={() => setGuestRo(null)}
        onClearCustomEvents={handleClearCustomEvents}
      />

      {isGuestMode && (
        <div style={{
          backgroundColor: '#2196F3',
          color: 'white',
          padding: '10px 15px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.9rem',
          fontWeight: 'bold',
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
          zIndex: 90
        }}>
          <span>
            <i className="fa-solid fa-eye" style={{ marginRight: '8px' }}></i>
            Running-Order de {guestRo.username || 'Un ami'}
          </span>
          <button
            onClick={() => setGuestRo(null)}
            style={{
              background: 'rgba(0,0,0,0.2)',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              padding: '5px 10px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.8rem'
            }}
          >
            Sortir du mode invité
          </button>
        </div>
      )}

      {viewMode === 'day' && (
        <FilterBar activeFilter={bandFilter} onFilterChange={setBandFilter} />
      )}
      {viewMode === 'day' && <Navigation />}

      <main className="content" {...swipeHandlers}>
        <Routes>
          <Route path="/" element={
            viewMode === 'day' ? (
              <DayView
                groups={currentDayGroups}
                selectGroup={handleGroupSelect}
                selectedGroupId={selectedGroup?.id}
                day={state.day}
                bandFilter={bandFilter}
                customEvents={isGuestMode ? (guestRo.customEvents || []) : customEvents}
                onDeleteCustomEvent={isGuestMode ? () => { } : handleDeleteCustomEvent}
                onEditCustomEvent={isGuestMode ? () => { } : handleEditCustomEvent}
              />
            ) : (
              <WeeklyView
                groups={groups}
                onGroupClick={(g) => handleGroupSelect(g, { clientX: window.innerWidth / 2 - 200, clientY: window.innerHeight / 2 - 200 })}
                customEvents={isGuestMode ? (guestRo.customEvents || []) : customEvents}
                onEditCustomEvent={isGuestMode ? () => { } : handleEditCustomEvent}
              />
            )
          } />
        </Routes>
      </main>

      <CustomEventModal
        isOpen={isCustomModalOpen}
        onClose={() => {
          setIsCustomModalOpen(false);
          setEditingEvent(null);
        }}
        onSave={handleAddCustomEvent}
        onDelete={handleDeleteCustomEvent}
        defaultDay={state.day}
        eventToEdit={editingEvent}
      />

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        data={importData}
        onReplace={handleImportReplace}
        onSave={handleSaveContact}
        onView={(data) => {
          setGuestRo(data);
          setIsImportModalOpen(false);
        }}
      />

      {selectedGroup && (
        <>
          <div
            className="group-card-overlay"
            onClick={() => setSelectedGroup(null)}
          />
          <div className="group-card-container">
            <GroupCard
              group={selectedGroup}
              onClose={() => setSelectedGroup(null)}
              position={popoverPosition}
              onPositionChange={handleCardPositionChange}
            />
          </div>
        </>
      )}

      <ConfirmationModal
        isOpen={!!contactToOverwrite}
        onClose={() => setContactToOverwrite(null)}
        onConfirm={handleConfirmOverwrite}
        title="Contact existant"
        message={`Le contact "${contactToOverwrite?.username}" existe déjà. Voulez-vous mettre à jour son Running Order ?`}
        confirmText="Mettre à jour"
      />
      <WelcomeModal />
    </div>
  );
}

function App() {
  return (
    <CheckedStateProvider>
      <Router>
        <FriendsProvider>
          <AppContent />
        </FriendsProvider>
      </Router>
    </CheckedStateProvider>
  );
}

export default App;
