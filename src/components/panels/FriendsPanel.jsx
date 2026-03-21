import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFriends } from '../../context/FriendsContext';
import { useCheckedState } from '../../context/CheckedStateContext';
import { subscribeToCircleMembers } from '../../services/friendsService';

const FriendsPanel = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const { circles, visibleCircleIds, toggleCircleVisibility, circleMembersMap, memberCircleId, setMemberCircleId, loadingCircles, createCircle, joinCircle, leaveCircle, createMetaCode } = useFriends();
    const { setGuestRo } = useCheckedState();

    const [view, setView] = useState('list'); // 'list' | 'create' | 'join' | 'members' | 'choose-member'
    const [circleName, setCircleName] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [createdCode, setCreatedCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);
    const [confirmLeave, setConfirmLeave] = useState(null);
    const [viewingCircleId, setViewingCircleId] = useState(null);
    const [viewingCircleName, setViewingCircleName] = useState('');
    const [viewingMembers, setViewingMembers] = useState([]);
    const [metaCode, setMetaCode] = useState('');
    const [metaLoading, setMetaLoading] = useState(false);
    const [joinedCirclesForChoice, setJoinedCirclesForChoice] = useState([]);

    // Local subscription for members view (works even if circle is not visible)
    useEffect(() => {
        if (!viewingCircleId || view !== 'members') {
            setViewingMembers([]);
            return;
        }

        // Use cached data if available
        if (circleMembersMap.has(viewingCircleId)) {
            setViewingMembers(circleMembersMap.get(viewingCircleId));
        }

        const unsub = subscribeToCircleMembers(viewingCircleId, (members) => {
            setViewingMembers(members);
        });

        return () => unsub();
    }, [viewingCircleId, view]);

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
            const result = await joinCircle(inviteCode.trim().toUpperCase());
            setInviteCode('');
            if (result.isMetaJoin) {
                // Show circle selection for member circle
                setJoinedCirclesForChoice(result.circles || result.circleIds.map((id, i) => ({ id, name: result.circleNames[i] })));
                setView('choose-member');
            } else {
                setView('list');
            }
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
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(code);
        } else {
            const ta = document.createElement('textarea');
            ta.value = code;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    const handleViewMembers = (circle) => {
        setViewingCircleId(circle.id);
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
        setViewingCircleId(null);
        setError('');
        setCreatedCode('');
        setCircleName('');
        setInviteCode('');
        setMetaCode('');
        setJoinedCirclesForChoice([]);
    };

    const handleGenerateMetaCode = async () => {
        const activeIds = [...visibleCircleIds];
        if (activeIds.length === 0) return;
        setMetaLoading(true);
        setError('');
        try {
            const code = await createMetaCode(activeIds);
            setMetaCode(code);
        } catch (err) {
            setError(err.message);
        }
        setMetaLoading(false);
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
                                {circles.map(circle => {
                                    const isVisible = visibleCircleIds.has(circle.id);
                                    const isMember = memberCircleId === circle.id;
                                    return (
                                        <div key={circle.id} style={{
                                            ...cardStyle,
                                            opacity: isVisible ? 1 : 0.5,
                                            borderColor: isMember ? '#FFD700' : isVisible ? '#444' : '#333',
                                        }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <button
                                                        onClick={() => setMemberCircleId(circle.id)}
                                                        title={isMember ? "Cercle membre (actif)" : "Définir comme cercle membre"}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            padding: 0,
                                                            fontSize: '0.9rem',
                                                            color: isMember ? '#FFD700' : '#555',
                                                            lineHeight: 1,
                                                        }}
                                                    >
                                                        <i className={`fa-${isMember ? 'solid' : 'regular'} fa-star`}></i>
                                                    </button>
                                                    <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.95rem' }}>
                                                        {circle.name}
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: '0.7rem', color: isMember ? '#FFD700' : '#888', marginTop: '2px', marginLeft: '20px' }}>
                                                    {isMember ? 'Membre' : 'Suiveur'} · {(() => {
                                                        const subMembers = circleMembersMap.get(circle.id);
                                                        if (subMembers) {
                                                            const realMembers = subMembers.filter(m => m.isMember === true).length;
                                                            const followers = subMembers.length - realMembers;
                                                            return `${realMembers} membre${realMembers > 1 ? 's' : ''}${followers > 0 ? ` · ${followers} suiveur${followers > 1 ? 's' : ''}` : ''}`;
                                                        }
                                                        return `${circle.members?.length || 1} participant${(circle.members?.length || 1) > 1 ? 's' : ''}`;
                                                    })()}
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
                                                        paddingLeft: '20px',
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
                                                    onClick={() => toggleCircleVisibility(circle.id)}
                                                    title={isVisible ? "Masquer ce cercle" : "Afficher ce cercle"}
                                                    style={actionBtnStyle(
                                                        isVisible ? '#4CAF50' : 'rgba(255,255,255,0.1)',
                                                        isVisible ? 'none' : '1px solid #555'
                                                    )}
                                                >
                                                    <i
                                                        className={`fa-solid ${isVisible ? 'fa-eye' : 'fa-eye-slash'}`}
                                                        style={{ color: isVisible ? '#000' : '#888', fontSize: '0.8rem' }}
                                                    ></i>
                                                </button>
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
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Meta code section */}
                    {circles.length > 0 && visibleCircleIds.size > 0 && (
                        <div style={{ marginTop: '12px' }}>
                            {metaCode ? (
                                <div style={{
                                    textAlign: 'center',
                                    backgroundColor: '#2a2a2a',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    border: '1px solid #555',
                                }}>
                                    <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '6px' }}>
                                        Code de partage ({visibleCircleIds.size} cercle{visibleCircleIds.size > 1 ? 's' : ''})
                                    </div>
                                    <div
                                        onClick={() => handleCopyCode(metaCode)}
                                        style={{
                                            fontFamily: 'monospace',
                                            fontSize: '1.4rem',
                                            letterSpacing: '3px',
                                            color: '#FFD700',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {metaCode}
                                    </div>
                                    <div style={{ color: '#888', fontSize: '0.7rem', marginTop: '4px' }}>
                                        {copiedCode ? 'Copié !' : 'Cliquez pour copier'}
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={handleGenerateMetaCode}
                                    disabled={metaLoading}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        backgroundColor: 'rgba(155, 89, 182, 0.15)',
                                        border: '1px solid #9b59b6',
                                        borderRadius: '8px',
                                        color: '#bb86fc',
                                        fontSize: '0.8rem',
                                        cursor: metaLoading ? 'wait' : 'pointer',
                                        opacity: metaLoading ? 0.6 : 1,
                                    }}
                                >
                                    <i className="fa-solid fa-link" style={{ marginRight: '6px' }}></i>
                                    {metaLoading ? 'Génération...' : `Générer un code de partage (${visibleCircleIds.size} cercle${visibleCircleIds.size > 1 ? 's' : ''})`}
                                </button>
                            )}
                            {error && <p style={errorStyle}>{error}</p>}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                        <button onClick={() => { setView('create'); setError(''); setMetaCode(''); }} style={primaryBtnStyle}>
                            <i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i>
                            Créer
                        </button>
                        <button onClick={() => { setView('join'); setError(''); setMetaCode(''); }} style={secondaryBtnStyle}>
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
                        {viewingMembers.length === 0 ? (
                            <p style={{ color: '#888', textAlign: 'center', padding: '20px' }}>Chargement des membres...</p>
                        ) : (() => {
                            const realMembers = viewingMembers.filter(m => m.isMember === true);
                            const followers = viewingMembers.filter(m => m.isMember !== true);
                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {/* Section Membres */}
                                    {realMembers.length > 0 && (
                                        <>
                                            <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px', marginTop: '4px' }}>
                                                <i className="fa-solid fa-star" style={{ color: '#FFD700', marginRight: '5px', fontSize: '0.6rem' }}></i>
                                                Membres ({realMembers.length})
                                            </div>
                                            {realMembers.map(member => {
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
                                        </>
                                    )}

                                    {/* Section Suiveurs */}
                                    {followers.length > 0 && (
                                        <>
                                            <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px', marginTop: '10px' }}>
                                                <i className="fa-solid fa-eye" style={{ color: '#666', marginRight: '5px', fontSize: '0.6rem' }}></i>
                                                Suiveurs ({followers.length})
                                            </div>
                                            {followers.map(member => {
                                                const isMe = member.id === user.uid;
                                                return (
                                                    <div key={member.id} style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        padding: '6px 12px',
                                                        backgroundColor: '#222',
                                                        borderRadius: '6px',
                                                    }}>
                                                        {member.photoURL ? (
                                                            <img
                                                                src={member.photoURL}
                                                                alt=""
                                                                referrerPolicy="no-referrer"
                                                                style={{
                                                                    width: '22px', height: '22px',
                                                                    borderRadius: '50%',
                                                                    border: isMe ? '2px solid #FFD700' : '1px solid #444',
                                                                }}
                                                            />
                                                        ) : (
                                                            <div style={{
                                                                width: '22px', height: '22px',
                                                                borderRadius: '50%',
                                                                backgroundColor: '#3a3a3a',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                fontSize: '0.6rem', color: '#888',
                                                            }}>
                                                                {(member.displayName || '?')[0].toUpperCase()}
                                                            </div>
                                                        )}
                                                        <span style={{
                                                            color: isMe ? '#FFD700' : '#999',
                                                            fontSize: '0.8rem',
                                                            fontWeight: isMe ? 'bold' : 'normal',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                        }}>
                                                            {member.displayName || 'Anonyme'} {isMe && '(moi)'}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </>
                                    )}
                                </div>
                            );
                        })()}
                    </div>

                    <button onClick={handleBack} style={{ ...secondaryBtnStyle, marginTop: '15px', width: '100%' }}>
                        <i className="fa-solid fa-arrow-left" style={{ marginRight: '6px' }}></i>
                        Retour aux cercles
                    </button>
                </div>
            </div>
        );
    }

    // ---- Choose Member Circle View (after meta join) ----
    if (view === 'choose-member') {
        return (
            <div style={overlayStyle} onClick={onClose}>
                <div style={panelStyle} onClick={e => e.stopPropagation()}>
                    <CloseButton onClick={onClose} />
                    <PanelTitle>CHOISIR MON CERCLE</PanelTitle>

                    <p style={{ color: '#888', fontSize: '0.85rem', textAlign: 'center', marginBottom: '15px' }}>
                        Vous avez rejoint {joinedCirclesForChoice.length} cercle{joinedCirclesForChoice.length > 1 ? 's' : ''}.
                        Choisissez celui dont vous êtes <strong style={{ color: '#FFD700' }}>membre</strong> (vos tags y seront synchronisés).
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto' }}>
                        {joinedCirclesForChoice.map(c => {
                            const isSelected = memberCircleId === c.id;
                            return (
                                <button
                                    key={c.id}
                                    onClick={() => setMemberCircleId(c.id)}
                                    style={{
                                        ...cardStyle,
                                        cursor: 'pointer',
                                        borderColor: isSelected ? '#FFD700' : '#444',
                                        justifyContent: 'flex-start',
                                        gap: '10px',
                                    }}
                                >
                                    <i
                                        className={`fa-${isSelected ? 'solid' : 'regular'} fa-star`}
                                        style={{ color: isSelected ? '#FFD700' : '#555', fontSize: '1rem' }}
                                    ></i>
                                    <span style={{ color: '#eee', fontSize: '0.9rem', fontWeight: isSelected ? 'bold' : 'normal' }}>
                                        {c.name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={handleBack}
                        disabled={!memberCircleId}
                        style={{
                            ...primaryBtnStyle,
                            marginTop: '15px',
                            width: '100%',
                            opacity: !memberCircleId ? 0.5 : 1,
                        }}
                    >
                        <i className="fa-solid fa-check" style={{ marginRight: '6px' }}></i>
                        Confirmer
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
