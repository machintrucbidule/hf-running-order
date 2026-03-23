import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useCheckedState } from '../../context/CheckedStateContext';
import { INTEREST_LEVELS, INTEREST_ORDER, CONTEXT_TAGS, CONTEXT_ORDER } from '../../constants';

function extractDeezerArtistId(url) {
    if (!url) return null;
    const match = url.match(/artist\/(\d+)/);
    return match ? match[1] : null;
}

function formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

const MusicPlayer = ({ group, onClose, quickPlay, onToggleQuickPlay }) => {
    const artistId = extractDeezerArtistId(group.DEEZER);
    const audioRef = useRef(null);
    const [tracks, setTracks] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showTracklist, setShowTracklist] = useState(false);
    const [progress, setProgress] = useState(0);
    const [volume, setVolume] = useState(() => {
        const saved = localStorage.getItem('musicPlayerVolume');
        return saved !== null ? parseFloat(saved) : 0.7;
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showTagDropdown, setShowTagDropdown] = useState(false);

    const { getBandTag, getInterestColor, setInterest, setContext } = useCheckedState();
    const bandTag = getBandTag(group.id);
    const currentInterest = bandTag?.interest;
    const currentContext = bandTag?.context;

    // Close tag dropdown on outside click
    useEffect(() => {
        if (!showTagDropdown) return;
        const handleClick = () => setShowTagDropdown(false);
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [showTagDropdown]);

    // Fetch top tracks from Deezer API
    useEffect(() => {
        if (!artistId) return;
        setLoading(true);
        setError(null);
        setTracks([]);
        setCurrentIndex(0);
        setProgress(0);
        setIsPlaying(false);

        // Try fetch first, fallback to JSONP if CORS blocked
        const controller = new AbortController();
        fetch(`https://api.deezer.com/artist/${artistId}/top?limit=5`, { signal: controller.signal })
            .then(res => res.json())
            .then(data => {
                const validTracks = (data.data || []).filter(t => t.preview);
                if (validTracks.length === 0) {
                    setError('Aucun extrait disponible');
                } else {
                    setTracks(validTracks);
                }
                setLoading(false);
            })
            .catch(err => {
                if (err.name === 'AbortError') return;
                // CORS blocked — fallback to JSONP
                const cbName = `dz_cb_${Date.now()}`;
                const script = document.createElement('script');
                script.src = `https://api.deezer.com/artist/${artistId}/top?limit=5&output=jsonp&callback=${cbName}`;
                window[cbName] = (data) => {
                    const validTracks = (data.data || []).filter(t => t.preview);
                    if (validTracks.length === 0) {
                        setError('Aucun extrait disponible');
                    } else {
                        setTracks(validTracks);
                    }
                    setLoading(false);
                    delete window[cbName];
                    script.remove();
                };
                script.onerror = () => {
                    setError('Impossible de charger les morceaux');
                    setLoading(false);
                    delete window[cbName];
                    script.remove();
                };
                document.head.appendChild(script);
            });

        return () => controller.abort();
    }, [artistId]);

    // Sync volume to audio element
    useEffect(() => {
        if (audioRef.current) audioRef.current.volume = volume;
        localStorage.setItem('musicPlayerVolume', String(volume));
    }, [volume]);

    // Autoplay first track when tracks are loaded
    useEffect(() => {
        if (tracks.length > 0 && audioRef.current) {
            audioRef.current.src = tracks[0].preview;
            audioRef.current.play().then(() => {
                setIsPlaying(true);
            }).catch(() => {
                setIsPlaying(false);
            });
        }
    }, [tracks]);

    // Progress bar update
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const handleTimeUpdate = () => {
            if (audio.duration) {
                setProgress((audio.currentTime / audio.duration) * 100);
            }
        };
        audio.addEventListener('timeupdate', handleTimeUpdate);
        return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
    }, []);

    // Auto-next on track end
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const handleEnded = () => {
            if (currentIndex < tracks.length - 1) {
                playTrack(currentIndex + 1);
            } else {
                setIsPlaying(false);
                setProgress(0);
            }
        };
        audio.addEventListener('ended', handleEnded);
        return () => audio.removeEventListener('ended', handleEnded);
    }, [currentIndex, tracks.length]);

    const playTrack = useCallback((index) => {
        if (!audioRef.current || !tracks[index]) return;
        setCurrentIndex(index);
        setProgress(0);
        audioRef.current.src = tracks[index].preview;
        audioRef.current.play().then(() => {
            setIsPlaying(true);
        }).catch(() => {
            setIsPlaying(false);
        });
    }, [tracks]);

    const togglePlay = useCallback(() => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play().then(() => {
                setIsPlaying(true);
            }).catch(() => {});
        }
    }, [isPlaying]);

    const prevTrack = useCallback(() => {
        if (currentIndex > 0) playTrack(currentIndex - 1);
    }, [currentIndex, playTrack]);

    const nextTrack = useCallback(() => {
        if (currentIndex < tracks.length - 1) playTrack(currentIndex + 1);
    }, [currentIndex, tracks.length, playTrack]);

    const handleClose = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
        }
        onClose();
    }, [onClose]);

    const getTagButtonContent = () => {
        if (currentInterest) {
            return <span style={{ color: getInterestColor(currentInterest), fontSize: '1.6rem' }}>★</span>;
        }
        if (currentContext) {
            return <span style={{ fontSize: '1.4rem' }}>{CONTEXT_TAGS[currentContext].icon}</span>;
        }
        return <span style={{ color: '#888', fontSize: '1.6rem' }}>☆</span>;
    };

    if (!artistId) return null;

    const currentTrack = tracks[currentIndex];

    return (
        <div className="music-player">
            <div
                className="music-player-progress-container"
                onClick={(e) => {
                    if (!audioRef.current || !audioRef.current.duration) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const ratio = (e.clientX - rect.left) / rect.width;
                    audioRef.current.currentTime = ratio * audioRef.current.duration;
                }}
            >
                <div className="music-player-progress" style={{ width: `${progress}%` }} />
            </div>
            <div className="music-player-top">
                <div className="music-player-info">
                    {loading ? (
                        <span className="music-player-track">Chargement…</span>
                    ) : error ? (
                        <span className="music-player-track">{error}</span>
                    ) : currentTrack ? (
                        <>
                            <span className="music-player-track">{currentTrack.title_short || currentTrack.title}</span>
                            <span className="music-player-artist">{group.GROUPE}</span>
                            <span className="music-player-context">{group.SCENE} — {group.DAY} {group.DEBUT}{group.STYLE ? ` — ${group.STYLE}` : ''}</span>
                        </>
                    ) : null}
                </div>
                <div className="music-player-extras">
                    <button
                        className={`music-player-quickplay-btn ${quickPlay ? 'active' : ''}`}
                        onClick={onToggleQuickPlay}
                        title={quickPlay ? 'Désactiver la lecture rapide' : 'Activer la lecture rapide : cliquer sur un artiste lance sa musique'}
                    >
                        <i className="fa-solid fa-bolt"></i>
                    </button>
                    <button className="music-player-close-top" onClick={handleClose} title="Fermer le lecteur">
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>
            </div>
            <div className="music-player-bar">
                <div className="music-player-volume">
                    <i className={`fa-solid ${volume === 0 ? 'fa-volume-xmark' : volume < 0.5 ? 'fa-volume-low' : 'fa-volume-high'}`}></i>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="volume-slider"
                        title={`Volume : ${Math.round(volume * 100)}%`}
                    />
                </div>
                <div className="music-player-controls">
                    <button onClick={prevTrack} disabled={currentIndex === 0 || tracks.length === 0} title="Précédent">
                        <i className="fa-solid fa-backward-step"></i>
                    </button>
                    <button onClick={togglePlay} disabled={tracks.length === 0} title={isPlaying ? 'Pause' : 'Lecture'}>
                        <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
                    </button>
                    <button onClick={nextTrack} disabled={currentIndex >= tracks.length - 1 || tracks.length === 0} title="Suivant">
                        <i className="fa-solid fa-forward-step"></i>
                    </button>
                </div>
                <div className="music-player-actions">
                    {tracks.length > 0 && (
                        <button onClick={() => setShowTracklist(!showTracklist)} className={showTracklist ? 'active' : ''} title="Liste des morceaux">
                            <i className="fa-solid fa-list"></i>
                        </button>
                    )}
                    <div className="music-player-tag" style={{ position: 'relative' }}>
                        <button
                            className="music-player-tag-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowTagDropdown(!showTagDropdown);
                            }}
                            title="Marquer ce groupe"
                        >
                            {getTagButtonContent()}
                        </button>
                        {showTagDropdown && (
                            <div
                                className="tag-dropdown"
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    position: 'absolute',
                                    bottom: '100%',
                                    right: 0,
                                    width: '200px',
                                    backgroundColor: '#222',
                                    border: '1px solid #444',
                                    borderRadius: '8px',
                                    padding: '10px',
                                    boxShadow: '0 -4px 12px rgba(0,0,0,0.5)',
                                    zIndex: 2000,
                                    marginBottom: '5px',
                                    textAlign: 'left'
                                }}
                            >
                                <div className="dropdown-section-title">Intérêt</div>
                                {INTEREST_ORDER.map(levelId => {
                                    const level = INTEREST_LEVELS[levelId];
                                    const isActive = currentInterest === levelId;
                                    return (
                                        <button
                                            key={levelId}
                                            className={`tag-dropdown-item ${isActive ? 'active' : ''}`}
                                            onClick={() => setInterest(group.id, isActive ? null : levelId)}
                                            style={{
                                                '--tag-color': getInterestColor(levelId),
                                                display: 'flex',
                                                alignItems: 'center',
                                                width: '100%',
                                                padding: '6px',
                                                marginBottom: '4px',
                                                background: isActive ? '#333' : 'transparent',
                                                border: 'none',
                                                borderRadius: '4px',
                                                color: 'white',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <span className="interest-star-single" style={{ color: isActive ? getInterestColor(levelId) : '#555' }}>★</span>
                                            <span>{level.label}</span>
                                            {isActive && <span className="tag-check">✓</span>}
                                        </button>
                                    );
                                })}
                                <div className="dropdown-section-title" style={{ marginTop: '10px', marginBottom: '5px', fontSize: '0.85em', color: '#888' }}>Contexte</div>
                                {CONTEXT_ORDER.map(contextId => {
                                    const ctx = CONTEXT_TAGS[contextId];
                                    const isActive = currentContext === contextId;
                                    return (
                                        <button
                                            key={contextId}
                                            className={`tag-dropdown-item ${isActive ? 'active' : ''}`}
                                            onClick={() => setContext(group.id, isActive ? null : contextId)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                width: '100%',
                                                padding: '6px',
                                                marginBottom: '4px',
                                                background: isActive ? '#333' : 'transparent',
                                                border: 'none',
                                                borderRadius: '4px',
                                                color: 'white',
                                                cursor: 'pointer',
                                                textAlign: 'left'
                                            }}
                                        >
                                            <span className="tag-item-icon">{ctx.icon}</span>
                                            <span>{ctx.label}</span>
                                            {isActive && <span className="tag-check">✓</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {showTracklist && tracks.length > 0 && (
                <div className="music-player-tracklist">
                    {tracks.map((track, index) => (
                        <div
                            key={track.id}
                            className={`music-player-tracklist-item ${index === currentIndex ? 'active' : ''}`}
                            onClick={() => playTrack(index)}
                        >
                            <span className="tracklist-title">{track.title_short || track.title}</span>
                            <span className="tracklist-duration">{formatDuration(track.duration)}</span>
                            {index === currentIndex && isPlaying && <i className="fa-solid fa-volume-high tracklist-playing"></i>}
                        </div>
                    ))}
                </div>
            )}
            <audio ref={audioRef} />
        </div>
    );
};

export default MusicPlayer;
