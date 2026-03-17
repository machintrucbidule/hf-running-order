import React, { useState, useEffect } from 'react';
import { generateShareLink } from '../../utils/sharingUtils';

const ShareModal = ({ isOpen, onClose, taggedBands, customEvents }) => {
    const [step, setStep] = useState('input'); // 'input', 'result'
    const [username, setUsername] = useState(() => localStorage.getItem('myNickname') || '');
    const [shareUrl, setShareUrl] = useState('');
    const [copied, setCopied] = useState(false);
    const [includeCustom, setIncludeCustom] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setStep('input');
            setCopied(false);
            // If username exists, pre-fill but let them confirm/change? 
            // Or auto-generate if they've shared before?
            // Let's stick to input step for better UX "Who are you?"
        }
    }, [isOpen]);

    const handleGenerate = () => {
        if (!username.trim()) return;
        localStorage.setItem('myNickname', username);
        const url = generateShareLink(taggedBands, includeCustom ? customEvents : [], username);
        setShareUrl(url);
        setStep('result');
    };

    if (!isOpen) return null;

    const handleCopy = async () => {
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(shareUrl);
            } else {
                const ta = document.createElement('textarea');
                ta.value = shareUrl;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Mon Running Order Hellfest',
                    text: 'Regarde ma sélection de concerts pour le Hellfest ! 🤘',
                    url: shareUrl,
                });
            } catch (err) {
                console.log('Error sharing', err);
            }
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            backdropFilter: 'blur(5px)',
            animation: 'fadeIn 0.2s'
        }} onClick={onClose}>
            <div style={{
                backgroundColor: '#222',
                border: '1px solid #444',
                borderRadius: '12px',
                padding: '25px',
                width: '90%',
                maxWidth: '450px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
            }} onClick={e => e.stopPropagation()}>

                <h2 style={{ margin: 0, color: '#FFD700', textAlign: 'center', fontSize: '1.5rem', letterSpacing: '2px', fontFamily: 'Metal Mania' }}>
                    Partager mon Running Order 🤘
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

                <p style={{ color: '#ccc', textAlign: 'center', margin: 0 }}>
                    {step === 'input'
                        ? "Entrez votre pseudo pour que vos amis vous reconnaissent."
                        : "Envoyez ce lien pour partager votre sélection :"
                    }
                </p>

                {step === 'input' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <input
                            type="text"
                            placeholder="Votre pseudo (ex: Métalleuxdu44)"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                            autoFocus
                            style={{
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid #555',
                                background: '#333',
                                color: 'white',
                                fontSize: '1rem',
                                outline: 'none'
                            }}
                        />

                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ccc', fontSize: '0.9rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={includeCustom}
                                onChange={(e) => setIncludeCustom(e.target.checked)}
                                style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                            />
                            Partager aussi mes créneaux personnalisés
                        </label>

                        <button
                            onClick={handleGenerate}
                            disabled={!username.trim()}
                            style={{
                                padding: '12px',
                                borderRadius: '8px',
                                border: 'none',
                                background: username.trim() ? '#FFD700' : '#444',
                                color: username.trim() ? 'black' : '#888',
                                fontWeight: 'bold',
                                cursor: username.trim() ? 'pointer' : 'not-allowed',
                                transition: '0.2s'
                            }}
                        >
                            Générer le lien
                        </button>
                    </div>
                )}

                {step === 'result' && (
                    <>
                        {/* Link Display */}
                        <div style={{
                            display: 'flex',
                            background: '#111',
                            border: '1px solid #333',
                            borderRadius: '8px',
                            padding: '10px',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                            <input
                                type="text"
                                readOnly
                                value={shareUrl}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#888',
                                    flex: 1,
                                    fontSize: '0.9rem',
                                    outline: 'none',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}
                            />
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={handleCopy}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: copied ? '#4CAF50' : '#FFD700',
                                    color: copied ? 'white' : 'black',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    transition: 'background 0.2s'
                                }}
                            >
                                {copied ? <><i className="fa-solid fa-check"></i> Copié !</> : <><i className="fa-regular fa-copy"></i> Copier le lien</>}
                            </button>

                            {navigator.share && (
                                <button
                                    onClick={handleNativeShare}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: '1px solid #555',
                                        background: '#333',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    <i className="fa-solid fa-share-nodes"></i> Envoyer
                                </button>
                            )}
                        </div>
                    </>
                )}



            </div>
        </div>
    );
};

export default ShareModal;
