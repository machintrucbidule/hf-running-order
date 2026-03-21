import React, { useState, useEffect } from 'react';
import './WelcomeModal.css';

const WelcomeModal = () => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!localStorage.getItem('welcomeModalSeen')) {
            setIsOpen(true);
        }
    }, []);

    if (!isOpen) return null;

    return (
        <div className="welcome-popup-overlay" onClick={() => { localStorage.setItem('welcomeModalSeen', '1'); setIsOpen(false); }}>
            <div className="welcome-popup-content" onClick={(e) => e.stopPropagation()}>
                <div className="welcome-popup-header">
                    <h2>⚠️ Running Order Prévisionnel</h2>
                    <button
                        className="welcome-popup-close"
                        onClick={() => { localStorage.setItem('welcomeModalSeen', '1'); setIsOpen(false); }}
                    >
                        ×
                    </button>
                </div>
                <div className="welcome-popup-body">
                    <p>
                        <strong>Attention :</strong> Ceci n'est qu'un planning prévisionnel pour vous aider à préparer votre Hellfest 2026.
                    </p>
                    <p>
                        L'ordre officiel des groupes ne sera révélé que quelques mois avant l'édition 2026.
                        Les horaires sont susceptibles de changer.
                    </p>
                    <p className="welcome-popup-footer">
                        Utilisez cet outil pour explorer le lineup et préparer vos favoris ! 🤘
                    </p>
                </div>
                <div className="welcome-popup-actions">
                    <button
                        className="welcome-popup-button"
                        onClick={() => {
                            localStorage.setItem('welcomeModalSeen', '1');
                            setIsOpen(false);
                        }}
                    >
                        J'ai compris
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WelcomeModal;
