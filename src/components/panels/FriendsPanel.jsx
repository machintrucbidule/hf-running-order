import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFriends } from '../../context/FriendsContext';
import { useCheckedState } from '../../context/CheckedStateContext';

const FriendsPanel = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const { circles, activeCircleId, setActiveCircleId, circleMembers, loadingCircles, createCircle, joinCircle, leaveCircle } = useFriends();
    const { setGuestRo } = useCheckedState();

    const [view, setView] = useState('list'); // 'list' | 'create' | 'join' | 'members'
    const [circleName, setCircleName] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [createdCode, setCreatedCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);
    const [confirmLeave, setConfirmLeave] = useState(null);
    const [viewingCircleName, setViewingCircleName] = useState('');

    if (!isOpen) return null;

    if (!user) {
        return (
            <div style={overlayStyle} onClick={onClose}>
                <div style={panelStyle} onClick={e => e.stopPropagation()}>
                    <CloseButton onClick={onClose} />
                    <PanelTitle>MES AMIS</PanelTitle>
                    <p style={{ color: '#888', textAlign: 'center', padding: '30px 0' }}>
                        <i className="fa-solid fa-lock" style={{ fontSize: '2rem', marginBottom: '10px', display: 'block', color: '#555' }}></i>
                        Connectez-vous avec Google pour accéder à vos amis.
                    </p>
                </div>
            </div>
        );
    }

    const handleCreate = async () => {
        if (!circleName.trim()) return;
        setLoading(true);
        setError('');
        try {
            const result = await createCircle(circleName.trim());
            setCreatedCode(result.inviteCode);
            setCircleName('');
        } catch (err) {
            setError(err.message);
        }
        setLoading(false);
    };

    const handleJoin = async () => {
        if (inviteCode.trim().length < 7) {
            setError('Le code doit contenir 7 caractères');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await joinCircle(inviteCode.trim().toUpperCase());
            setInviteCode('');
            setView('list');
        } catch (err) {
            setError(err.message);
        }
        setLoading(false);
    };

    const handleLeave = async (circleId) => {
        try {
            await leaveCircle(circleId);
            setConfirmLeave(null);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleCopyCode = (code) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    const handleViewMembers = (circle) => {
        setActiveCircleId(circle.id);
        setViewingCircleName(circle.name);
        setView('members');
    };

    const handleViewMemberRo = (member) => {
        setGuestRo({
            username: member.displayName,
            bands: member.taggedBands || {},
            customEvents: [],
        });
        onClose();
    };

    const handleBack = () => {
        setView('list');
        setError('');
        setCreatedCode('');
        setCircleName('');
        setInviteCode('');
    };

    // ---- List View ----
    if (view === 'list') {
        return (
            <div style={overlayStyle} onClick={onClose}>
                <div style={panelStyle} onClick={e => e.stopPropagation()}>
                    <CloseButton onClick={onClose} />
                    <PanelTitle>MES AMIS</PanelTitle>

                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
                        {loadingCircles ? (
                            <p style={{ color: '#888', textAlign: 'center', padding: '20px' }}>Chargement...</p>
                        ) : circles.length === 0 ? (
                            <p style={{ color: '#666', textAlign: 'center', fontStyle: 'italic', padding: '20px' }}>
                                Aucun cercle d'amis.<br />
                                Créez ou rejoignez un cercle d'amis pour voir les sélections de vos potes !
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {circles.map(circle => (
                                    <div key={circle.id} style={cardStyle}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.95rem' }}>
                                                {circle.name}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '2px' }}>
                                                {circle.members?.length || 1} membre{(circle.members?.length || 1) > 1 ? 's' : ''}
                                            </div>
                                            <button
                                                onClick={() => handleCopyCode(circle.inviteCode)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#FFD700',
                                                    fontSize: '0.7rem',
                                                    cursor: 'pointer',
                                                    padding: '2px 0',
                                                    fontFamily: 'monospace',
                                                    letterSpacing: '2px',
                                                }}
                                                title="Copier le code d'invitation"
                                            >
                                                <i className="fa-solid fa-copy" style={{ marginRight: '4px' }}></i>
                                                {circle.inviteCode}
                                            </button>
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button
                                                onClick={() => handleViewMembers(circle)}
                                                title="Voir les membres"
                                                style={actionBtnStyle('#FF6B35')}
                                            >
                                                <i className="fa-solid fa-users" style={{ color: '#000', fontSize: '0.8rem' }}></i>
                                            </button>
                                            {confirmLeave === circle.id ? (
                                                <button
                                                    onClick={() => handleLeave(circle.id)}
                                                    title="Confirmer"
                                                    style={actionBtnStyle('#ff4444')}
                                                >
                                                    <i className="fa-solid fa-check" style={{ color: '#fff', fontSize: '0.8rem' }}></i>
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        setConfirmLeave(circle.id);
                                                        setTimeout(() => setConfirmLeave(null), 3000);
                                                    }}
                                                    title="Quitter le cercle"
                                                    style={actionBtnStyle('rgba(255,255,255,0.1)', '1px solid #555')}
                                                >
                                                    <i className="fa-solid fa-right-from-bracket" style={{ color: '#ff6b6b', fontSize: '0.8rem' }}></i>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                        <button onClick={() => { setView('create'); setError(''); }} style={primaryBtnStyle}>
                            <i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i>
                            Créer
                        </button>
                        <button onClick={() => { setView('join'); setError(''); }} style={secondaryBtnStyle}>
                            <i className="fa-solid fa-right-to-bracket" style={{ marginRight: '6px' }}></i>
                            Rejoindre
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ---- Create View ----
    if (view === 'create') {
        return (
            <div style={overlayStyle} onClick={onClose}>
                <div style={panelStyle} onClick={e => e.stopPropagation()}>
                    <CloseButton onClick={onClose} />
                    <PanelTitle>CRÉER UN CERCLE</PanelTitle>

                    {createdCode ? (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <div style={{ color: '#4CAF50', fontSize: '1.2rem', marginBottom: '15px' }}>
                                <i className="fa-solid fa-check-circle"></i> Cercle créé !
                            </div>
                            <p style={{ color: '#ccc', fontSize: '0.85rem', marginBottom: '10px' }}>
                                Partagez ce code d'invitation :
                            </p>
                            <div
                                onClick={() => handleCopyCode(createdCode)}
                                style={{
                                    fontFamily: 'monospace',
                                    fontSize: '1.8rem',
                                    letterSpacing: '4px',
                                    color: '#FFD700',
                                    backgroundColor: '#2a2a2a',
                                    padding: '15px 20px',
                                    borderRadius: '10px',
                                    border: '1px solid #555',
                                    cursor: 'pointer',
                                    userSelect: 'all',
                                }}
                            >
                                {createdCode}
                            </div>
                            <p style={{ color: '#888', fontSize: '0.75rem', marginTop: '8px' }}>
                                {copiedCode ? 'Copié !' : 'Cliquez pour copier'}
                            </p>
                            <button onClick={handleBack} style={{ ...primaryBtnStyle, marginTop: '15px', width: '100%' }}>
                                Retour
                            </button>
                        </div>
                    ) : (
                        <>
                            <input
                                type="text"
                                value={circleName}
                                onChange={e => setCircleName(e.target.value)}
                                placeholder="Nom du cercle"
                                maxLength={40}
                                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                                style={inputStyle}
                            />
                            {error && <p style={errorStyle}>{error}</p>}
                            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                <button onClick={handleBack} style={secondaryBtnStyle}>Retour</button>
                                <button
                                    onClick={handleCreate}
                                    disabled={loading || !circleName.trim()}
                                    style={{ ...primaryBtnStyle, opacity: loading || !circleName.trim() ? 0.5 : 1 }}
                                >
                                    {loading ? 'Création...' : 'Créer'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }

    // ---- Join View ----
    if (view === 'join') {
        return (
            <div style={overlayStyle} onClick={onClose}>
                <div style={panelStyle} onClick={e => e.stopPropagation()}>
                    <CloseButton onClick={onClose} />
                    <PanelTitle>REJOINDRE UN CERCLE</PanelTitle>

                    <p style={{ color: '#888', fontSize: '0.85rem', textAlign: 'center', marginBottom: '15px' }}>
                        Entrez le code d'invitation de 7 caractères
                    </p>
                    <input
                        type="text"
                        value={inviteCode}
                        onChange={e => setInviteCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 7))}
                        placeholder="EX: HF2026X"
                        maxLength={7}
                        onKeyDown={e => e.key === 'Enter' && handleJoin()}
                        style={{
                            ...inputStyle,
                            textAlign: 'center',
                            fontFamily: 'monospace',
                            fontSize: '1.3rem',
                            letterSpacing: '4px',
                        }}
                    />
                    {error && <p style={errorStyle}>{error}</p>}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                        <button onClick={handleBack} style={secondaryBtnStyle}>Retour</button>
                        <button
                            onClick={handleJoin}
                            disabled={loading || inviteCode.length < 7}
                            style={{ ...primaryBtnStyle, opacity: loading || inviteCode.length < 7 ? 0.5 : 1 }}
                        >
                            {loading ? 'Connexion...' : 'Rejoindre'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ---- Members View ----
    if (view === 'members') {
        return (
            <div style={overlayStyle} onClick={onClose}>
                <div style={panelStyle} onClick={e => e.stopPropagation()}>
                    <CloseButton onClick={onClose} />
                    <PanelTitle>{viewingCircleName.toUpperCase()}</PanelTitle>

                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
                        {circleMembers.length === 0 ? (
                            <p style={{ color: '#888', textAlign: 'center', padding: '20px' }}>Chargement des membres...</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {circleMembers.map(member => {
                                    const isMe = member.id === user.uid;
                                    const bandCount = Object.keys(member.taggedBands || {}).length;
                                    return (
                                        <div key={member.id} style={cardStyle}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                                {member.photoURL ? (
                                                    <img
                                                        src={member.photoURL}
                                                        alt=""
                                                        referrerPolicy="no-referrer"
                                                        style={{
                                                            width: '28px', height: '28px',
                                                            borderRadius: '50%',
                                                            border: isMe ? '2px solid #FFD700' : '2px solid #444',
                                                        }}
                                                    />
                                                ) : (
                                                    <div style={{
                                                        width: '28px', height: '28px',
                                                        borderRadius: '50%',
                                                        backgroundColor: '#444',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '0.7rem', color: '#aaa',
                                                    }}>
                                                        {(member.displayName || '?')[0].toUpperCase()}
                                                    </div>
                                                )}
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{
                                                        fontWeight: isMe ? 'bold' : 'normal',
                                                        color: isMe ? '#FFD700' : '#eee',
                                                        fontSize: '0.85rem',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}>
                                                        {member.displayName || 'Anonyme'} {isMe && '(moi)'}
                                                    </div>
                                                    <div style={{ fontSize: '0.7rem', color: '#888' }}>
                                                        {bandCount} band{bandCount > 1 ? 's' : ''} taggué{bandCount > 1 ? 's' : ''}
                                                    </div>
                                                </div>
                                            </div>
                                            {!isMe && (
                                                <button
                                                    onClick={() => handleViewMemberRo(member)}
                                                    title="Voir son RO"
                                                    style={actionBtnStyle('#FFD700')}
                                                >
                                                    <i className="fa-solid fa-eye" style={{ color: '#000', fontSize: '0.8rem' }}></i>
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <button onClick={handleBack} style={{ ...secondaryBtnStyle, marginTop: '15px', width: '100%' }}>
                        <i className="fa-solid fa-arrow-left" style={{ marginRight: '6px' }}></i>
                        Retour aux cercles
                    </button>
                </div>
            </div>
        );
    }

    return null;
};

// ---- Shared styles ----

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
    maxWidth: '400px',
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
};

const inputStyle = {
    width: '100%',
    padding: '12px',
    backgroundColor: '#2a2a2a',
    border: '1px solid #555',
    borderRadius: '8px',
    color: '#eee',
    fontSize: '0.95rem',
    outline: 'none',
    boxSizing: 'border-box',
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

const errorStyle = {
    color: '#ff6b6b',
    fontSize: '0.8rem',
    textAlign: 'center',
    marginTop: '8px',
};

const actionBtnStyle = (bg, border) => ({
    background: bg,
    border: border || 'none',
    borderRadius: '50%',
    width: '28px',
    height: '28px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
});

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

export default FriendsPanel;
