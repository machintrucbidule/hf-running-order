import React, { useState } from 'react';
import './HelpPanel.css';

const Icon = ({ icon, style }) => <i className={icon} style={style}></i>;

const AccordionSection = ({ title, icon, color, children, isOpen, onToggle }) => {
    const headerRef = React.useRef(null);

    React.useEffect(() => {
        if (isOpen && headerRef.current) {
            requestAnimationFrame(() => {
                const scrollContainer = headerRef.current.closest('.help-sections');
                if (!scrollContainer) return;
                const containerRect = scrollContainer.getBoundingClientRect();
                const headerRect = headerRef.current.getBoundingClientRect();
                // Only scroll if the header is above or below the visible area
                if (headerRect.top < containerRect.top || headerRect.bottom > containerRect.bottom) {
                    headerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        }
    }, [isOpen]);

    return (
        <div className={`help-section ${isOpen ? 'open' : ''}`}>
            <button ref={headerRef} className="help-section-header" onClick={onToggle}>
                <span className="help-section-title">
                    <span className="help-section-icon" style={{ color }}>
                        <Icon icon={icon} />
                    </span>
                    {title}
                </span>
                <Icon icon={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`} />
            </button>
            {isOpen && (
                <div className="help-section-content" style={{ borderLeftColor: color }}>
                    {children}
                </div>
            )}
        </div>
    );
};

const HelpPanel = ({ isOpen, onClose }) => {
    const [openSection, setOpenSection] = useState(null);

    const toggle = (index) => {
        setOpenSection(openSection === index ? null : index);
    };

    if (!isOpen) return null;

    return (
        <div className="panel-overlay" onClick={onClose}>
            <div className="help-panel" onClick={(e) => e.stopPropagation()}>
                <div className="help-panel-header">
                    <div className="help-panel-header-content">
                        <h2>
                            <Icon icon="fa-solid fa-circle-question" style={{ color: '#FFD700' }} />
                            Aide
                        </h2>
                        <button className="help-close-btn" onClick={onClose}>
                            <Icon icon="fa-solid fa-xmark" />
                        </button>
                    </div>
                    <p className="help-intro">
                        Bienvenue sur le planificateur de Running Order ! Voici comment utiliser l'appli.
                    </p>
                </div>

                <div className="help-sections">
                    {/* 1. Naviguer dans l'application */}
                    <AccordionSection
                        title="Naviguer dans l'appli"
                        icon="fa-solid fa-compass"
                        color="#4E90BD"
                        isOpen={openSection === 0}
                        onToggle={() => toggle(0)}
                    >
                        <div className="help-block">
                            <h4><Icon icon="fa-solid fa-calendar-day" /> Choisir un jour</h4>
                            <p>
                                Les jours du festival (Mercredi à Dimanche) s'affichent en haut de l'écran.
                                Clique sur un jour pour y accéder, ou <strong>swipe à gauche/droite</strong> sur la grille pour naviguer.
                            </p>
                        </div>

                        <div className="help-block">
                            <h4><Icon icon="fa-solid fa-tent" /> Filtrer les scènes</h4>
                            <p>
                                Appuie sur le bouton <strong><Icon icon="fa-solid fa-tent" /> Scènes</strong> dans la barre de filtres
                                pour choisir quelles scènes afficher ou masquer.
                            </p>
                            <p>
                                Tu peux aussi activer les <strong>Scènes Annexes</strong> (Hell Stage, Purple House, Metal Corner)
                                via le toggle en haut du panneau de filtres. Ça débloque aussi le jour Mercredi.
                            </p>
                        </div>

                        <div className="help-block">
                            <h4><Icon icon="fa-solid fa-magnifying-glass" /> Rechercher un groupe</h4>
                            <p>
                                Clique sur <Icon icon="fa-solid fa-magnifying-glass" /> dans le header pour ouvrir la recherche.
                                Tape le nom d'un groupe pour le retrouver rapidement dans le lineup.
                                L'appli bascule automatiquement sur le bon jour et te montre le groupe sur la grille.
                            </p>
                        </div>

                        <div className="help-block">
                            <h4><Icon icon="fa-solid fa-arrow-down-up-across-line" /> Inverser l'ordre</h4>
                            <p>
                                Par défaut, le soir est en haut de la grille. Tu peux inverser (matin en haut)
                                dans <strong><Icon icon="fa-solid fa-gear" /> Paramètres &gt; Affichage</strong>.
                            </p>
                        </div>
                    </AccordionSection>

                    {/* 2. Découvrir les groupes */}
                    <AccordionSection
                        title="Découvrir les groupes"
                        icon="fa-solid fa-circle-info"
                        color="#1DB954"
                        isOpen={openSection === 1}
                        onToggle={() => toggle(1)}
                    >
                        <div className="help-block">
                            <h4><Icon icon="fa-solid fa-circle-info" /> Fiche d'un groupe</h4>
                            <p>
                                Clique sur un groupe dans la grille pour ouvrir sa fiche.
                                Tu y trouveras son style, son pays d'origine, sa bio, et ses participations passées au Hellfest.
                            </p>
                            <p>
                                Tu peux aussi utiliser la <strong>recherche</strong> <Icon icon="fa-solid fa-magnifying-glass" /> pour
                                trouver un groupe par son nom et ouvrir directement sa fiche.
                            </p>
                        </div>

                        <div className="help-block">
                            <h4><Icon icon="fa-solid fa-headphones" /> Écouter rapidement</h4>
                            <p>
                                Le moyen le plus rapide de découvrir un groupe est d'utiliser le <strong>lecteur intégré</strong>.
                                Depuis la fiche d'un groupe, clique sur <Icon icon="fa-solid fa-circle-play" /> pour lancer
                                ses morceaux les plus connus.
                            </p>
                            <p>
                                Encore mieux : active le <strong>mode lecture rapide</strong> <Icon icon="fa-solid fa-bolt" style={{ color: '#ff9800' }} /> et
                                clique directement sur les groupes dans la grille pour enchaîner la musique sans ouvrir de fiche.
                                Voir la section <em>Le lecteur audio</em> pour plus de détails.
                            </p>
                        </div>

                        <div className="help-block">
                            <h4><Icon icon="fa-solid fa-link" /> Liens d'écoute</h4>
                            <p>
                                La fiche de chaque groupe propose aussi des liens vers Spotify, Deezer, YouTube, Bandcamp et Qobuz
                                pour écouter plus en profondeur.
                            </p>
                        </div>
                    </AccordionSection>

                    {/* 3. Taguer ses groupes */}
                    <AccordionSection
                        title="Taguer ses groupes"
                        icon="fa-solid fa-star"
                        color="#E5841B"
                        isOpen={openSection === 2}
                        onToggle={() => toggle(2)}
                    >
                        <div className="help-block">
                            <h4>Niveaux d'intérêt</h4>
                            <p>Tu peux marquer chaque groupe avec un niveau d'intérêt :</p>
                            <ul className="help-list">
                                <li>
                                    <Icon icon="fa-solid fa-star" style={{ color: '#D13440' }} /> <strong>Incontournable</strong> — à ne pas rater
                                </li>
                                <li>
                                    <Icon icon="fa-solid fa-star-half-stroke" style={{ color: '#E5841B' }} /> <strong>Intéressé</strong> — envie d'y aller
                                </li>
                                <li>
                                    <Icon icon="fa-regular fa-star" style={{ color: '#4E90BD' }} /> <strong>Curieux</strong> — pourquoi pas
                                </li>
                            </ul>
                        </div>

                        <div className="help-block">
                            <h4>Contextes (optionnels)</h4>
                            <p>En plus de l'intérêt, tu peux ajouter un contexte :</p>
                            <ul className="help-list">
                                <li>
                                    <Icon icon="fa-solid fa-user-group" /> <strong>Avec Potes</strong> — on y va pour accompagner
                                </li>
                                <li>
                                    <Icon icon="fa-solid fa-chess" /> <strong>Stratégique</strong> — positionnement, pause
                                </li>
                                <li>
                                    <Icon icon="fa-solid fa-ban" /> <strong>Au Bar</strong> — on passe son tour
                                </li>
                            </ul>
                        </div>

                        <div className="help-block">
                            <h4>Comment taguer ?</h4>
                            <p>Plusieurs façons de faire :</p>
                            <ul className="help-list">
                                <li><strong>Clic sur un groupe</strong> → bouton <Icon icon="fa-solid fa-star" style={{ color: '#FFD700' }} /> dans le header de la popup</li>
                                <li><strong>Clic droit</strong> sur un groupe → menu de tag rapide</li>
                                <li><strong>Double-clic</strong> → cycle rapide entre les niveaux</li>
                                <li><strong>Depuis la recherche</strong> <Icon icon="fa-solid fa-magnifying-glass" /> → bouton <Icon icon="fa-solid fa-star" style={{ color: '#FFD700' }} /> à côté de chaque résultat</li>
                                <li><strong>Depuis le player</strong> → bouton <Icon icon="fa-solid fa-star" style={{ color: '#FFD700' }} /> pour taguer en écoutant</li>
                            </ul>
                        </div>

                        <div className="help-block">
                            <h4><Icon icon="fa-solid fa-filter" /> Filtrer les groupes</h4>
                            <p>La barre de filtres te permet d'afficher :</p>
                            <ul className="help-list">
                                <li>
                                    <Icon icon="fa-solid fa-music" /> <strong>Tous les groupes</strong> — vue complète
                                </li>
                                <li>
                                    <Icon icon="fa-solid fa-heart" /> <strong>Mes groupes</strong> — uniquement ceux que tu as tagués
                                </li>
                                <li>
                                    <Icon icon="fa-solid fa-user-group" /> <strong>Mon cercle</strong> — les groupes tagués par ton cercle membre
                                    <span className="help-note">Visible uniquement si tu es dans un cercle</span>
                                </li>
                                <li>
                                    <Icon icon="fa-solid fa-users" /> <strong>Mes cercles</strong> — les groupes tagués par tous tes cercles visibles
                                    <span className="help-note">Visible uniquement si tu es dans un cercle</span>
                                </li>
                            </ul>
                        </div>

                        <div className="help-block">
                            <h4><Icon icon="fa-solid fa-palette" /> Personnaliser les couleurs</h4>
                            <p>
                                Tu peux changer la couleur de chaque niveau d'intérêt
                                dans <strong><Icon icon="fa-solid fa-gear" /> Paramètres &gt; Couleurs des favoris</strong>.
                            </p>
                        </div>
                    </AccordionSection>

                    {/* 4. Se connecter et synchroniser */}
                    <AccordionSection
                        title="Se connecter et synchroniser"
                        icon="fa-solid fa-cloud"
                        color="#4285F4"
                        isOpen={openSection === 3}
                        onToggle={() => toggle(3)}
                    >
                        <div className="help-block">
                            <h4>Pourquoi se connecter ?</h4>
                            <p>
                                La connexion avec ton compte Google te permet de :
                            </p>
                            <ul className="help-list">
                                <li><strong>Synchroniser</strong> tes tags entre tous tes appareils (téléphone, PC...)</li>
                                <li>Accéder aux <strong>cercles d'amis</strong> pour voir ce que tes potes ont tagué</li>
                            </ul>
                            <p className="help-tip">
                                Sans connexion, tout fonctionne, mais tes données restent uniquement sur cet appareil.
                            </p>
                        </div>

                        <div className="help-block">
                            <h4>Comment se connecter ?</h4>
                            <p>
                                Clique sur le bouton Google
                                {' '}<svg viewBox="0 0 48 48" width="16" height="16" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                                </svg>{' '}
                                en haut à gauche du header, à côté du logo.
                            </p>
                        </div>

                        <div className="help-block">
                            <h4>Indicateur de synchronisation</h4>
                            <p>
                                Une fois connecté, ta photo de profil apparaît à la place du bouton Google.
                                Le contour de la photo indique l'état de la synchro :
                            </p>
                            <ul className="help-list help-list-status">
                                <li>
                                    <span className="help-status-dot" style={{ backgroundColor: '#4CAF50' }}></span>
                                    <strong>Vert</strong> — synchronisé
                                </li>
                                <li>
                                    <span className="help-status-dot" style={{ backgroundColor: '#FFD700' }}></span>
                                    <strong>Doré</strong> — synchronisation en cours
                                </li>
                                <li>
                                    <span className="help-status-dot" style={{ backgroundColor: '#e74c3c' }}></span>
                                    <strong>Rouge</strong> — erreur ou hors ligne
                                </li>
                            </ul>
                            <p>
                                Tu peux forcer la synchronisation depuis <strong>Mon compte</strong> (clique sur ta photo de profil).
                            </p>
                        </div>
                    </AccordionSection>

                    {/* 5. Les cercles d'amis */}
                    <AccordionSection
                        title="Les cercles d'amis"
                        icon="fa-solid fa-user-group"
                        color="#FFD700"
                        isOpen={openSection === 4}
                        onToggle={() => toggle(4)}
                    >
                        <div className="help-block">
                            <h4>C'est quoi un cercle ?</h4>
                            <p>
                                Un cercle est un groupe d'amis qui partagent leurs tags entre eux.
                                Quand tes potes taguent des groupes, tu peux voir leurs choix directement sur la grille.
                            </p>
                            <p>
                                Pour accéder aux cercles, connecte-toi puis clique sur <Icon icon="fa-solid fa-user-group" /> dans le header.
                            </p>
                        </div>

                        <div className="help-block">
                            <h4>Rejoindre un cercle</h4>
                            <p>
                                Demande le <strong>code d'invitation</strong> (7 caractères) à un ami et entre-le dans
                                l'écran <strong>Rejoindre</strong>.
                            </p>
                            <ul className="help-list">
                                <li><strong>Code simple</strong> → tu rejoins un seul cercle</li>
                                <li><strong>Code de partage</strong> → tu rejoins plusieurs cercles d'un coup.
                                    L'appli te demandera alors de choisir ton <em>cercle membre</em> (voir plus bas).</li>
                            </ul>
                        </div>

                        <div className="help-block">
                            <h4>Créer un cercle</h4>
                            <p>
                                Clique sur <strong>Créer</strong>, donne un nom à ton cercle, et un code d'invitation sera généré.
                                Partage ce code à tes amis pour qu'ils te rejoignent.
                            </p>
                        </div>

                        <div className="help-block">
                            <h4>Code multi-cercles</h4>
                            <p>
                                Si tu es dans plusieurs cercles, tu peux générer un <strong>code de partage unique</strong> qui
                                permet à quelqu'un de rejoindre tous tes cercles visibles en un seul code.
                                Ce bouton se trouve en bas de la liste de tes cercles.
                            </p>
                        </div>

                        <div className="help-block">
                            <h4><Icon icon="fa-solid fa-star" style={{ color: '#FFD700' }} /> Membre vs <Icon icon="fa-regular fa-star" /> Suiveur</h4>
                            <p>Tu peux avoir deux rôles dans un cercle :</p>
                            <ul className="help-list">
                                <li>
                                    <Icon icon="fa-solid fa-star" style={{ color: '#FFD700' }} /> <strong>Membre</strong> — tes tags sont visibles
                                    par les autres membres. <strong>Tu ne peux être membre que d'un seul cercle à la fois.</strong>
                                </li>
                                <li>
                                    <Icon icon="fa-regular fa-star" /> <strong>Suiveur</strong> — tu vois les tags des membres, mais les tiens
                                    ne sont pas partagés dans ce cercle.
                                </li>
                            </ul>
                            <p>
                                Clique sur l'étoile à côté du nom d'un cercle pour basculer ton cercle membre.
                            </p>
                        </div>

                        <div className="help-block">
                            <h4>Gérer ses cercles</h4>
                            <ul className="help-list">
                                <li>
                                    <Icon icon="fa-solid fa-eye" style={{ color: '#4CAF50' }} /> / <Icon icon="fa-solid fa-eye-slash" style={{ color: '#888' }} /> — Afficher
                                    ou masquer un cercle (ses tags disparaissent de la grille)
                                </li>
                                <li>
                                    <Icon icon="fa-solid fa-right-from-bracket" style={{ color: '#e74c3c' }} /> — Quitter un cercle :
                                    un premier clic demande confirmation, un second clic dans les 3 secondes confirme
                                </li>
                            </ul>
                        </div>

                        <div className="help-block">
                            <h4>Tags des amis sur la grille</h4>
                            <p>Quand tu es dans un cercle, tu verras sur la grille :</p>
                            <ul className="help-list">
                                <li>
                                    <strong>Photos à gauche</strong> des groupes — les amis de ton cercle membre qui ont tagué ce groupe
                                </li>
                                <li>
                                    <strong>Icônes en haut à droite</strong> — les amis des cercles que tu suis
                                </li>
                            </ul>
                            <p>
                                Utilise les filtres <Icon icon="fa-solid fa-user-group" /> <strong>Mon cercle</strong> et <Icon icon="fa-solid fa-users" /> <strong>Mes cercles</strong> pour
                                n'afficher que les groupes tagués par tes amis.
                            </p>
                        </div>

                        <div className="help-block">
                            <h4><Icon icon="fa-solid fa-eye" /> Mode invité</h4>
                            <p>
                                Dans la liste des membres d'un cercle, clique sur l'icône <Icon icon="fa-solid fa-eye" /> à côté d'un ami
                                pour voir son Running Order en lecture seule. Un bandeau bleu s'affiche en haut pour te rappeler
                                que tu es en mode invité.
                            </p>
                        </div>
                    </AccordionSection>

                    {/* 6. Le lecteur audio */}
                    <AccordionSection
                        title="Le lecteur audio"
                        icon="fa-solid fa-headphones"
                        color="#D13440"
                        isOpen={openSection === 5}
                        onToggle={() => toggle(5)}
                    >
                        <div className="help-block">
                            <h4>Lancer le lecteur</h4>
                            <p>Deux façons de lancer la musique :</p>
                            <ul className="help-list">
                                <li>
                                    <strong>Depuis la fiche d'un groupe</strong> — clique sur <Icon icon="fa-solid fa-circle-play" /> pour
                                    écouter les morceaux les plus populaires
                                </li>
                                <li>
                                    <strong>Depuis le header</strong> — clique sur <Icon icon="fa-solid fa-headphones" /> pour ouvrir le
                                    lecteur, puis clique sur un groupe dans la grille
                                </li>
                            </ul>
                        </div>

                        <div className="help-block">
                            <h4>Contrôles</h4>
                            <p>
                                Le lecteur propose les contrôles classiques : lecture/pause, piste précédente/suivante,
                                volume, et une barre de progression cliquable.
                            </p>
                            <p>
                                Clique sur <Icon icon="fa-solid fa-list" /> pour afficher la liste des 10 morceaux et choisir
                                celui que tu veux écouter.
                            </p>
                        </div>

                        <div className="help-block">
                            <h4><Icon icon="fa-solid fa-bolt" style={{ color: '#ff9800' }} /> Mode lecture rapide</h4>
                            <p>
                                Active le mode lecture rapide via le bouton <Icon icon="fa-solid fa-bolt" /> dans le lecteur.
                                Le bouton <Icon icon="fa-solid fa-headphones" /> du header devient orange.
                            </p>
                            <p>
                                Dans ce mode, <strong>cliquer sur un groupe dans la grille lance directement sa musique</strong> sans
                                ouvrir de fiche. Idéal pour parcourir rapidement le lineup et découvrir les artistes.
                            </p>
                            <p>
                                Les groupes sans musique disponible apparaissent <strong>estompés</strong> sur la grille.
                            </p>
                        </div>

                        <div className="help-block">
                            <h4>D'où vient la musique ?</h4>
                            <p>
                                Les extraits proviennent de <strong>Deezer</strong> : le lecteur charge automatiquement les 10
                                morceaux les plus populaires de chaque artiste.
                            </p>
                            <p className="help-tip">
                                Les extraits sont limités à <strong>30 secondes</strong> — c'est une limitation des previews Deezer.
                                C'est suffisant pour se faire une idée rapide d'un artiste qu'on ne connaît pas !
                            </p>
                        </div>
                    </AccordionSection>

                    {/* 7. Menu et paramètres */}
                    <AccordionSection
                        title="Menu et paramètres"
                        icon="fa-solid fa-bars"
                        color="#aaa"
                        isOpen={openSection === 6}
                        onToggle={() => toggle(6)}
                    >
                        <div className="help-block">
                            <h4><Icon icon="fa-solid fa-bars" /> Menu principal</h4>
                            <p>
                                Le menu s'ouvre via le bouton <Icon icon="fa-solid fa-bars" /> en haut à droite. Tu y trouveras :
                            </p>
                            <ul className="help-list">
                                <li><Icon icon="fa-solid fa-gear" style={{ color: '#aaa' }} /> <strong>Paramètres</strong> — couleurs, affichage, données du lineup, maintenance</li>
                                <li><Icon icon="fa-solid fa-chart-pie" style={{ color: '#FFD700' }} /> <strong>Stats</strong> — pourcentage de groupes tagués, répartition par genre et par scène</li>
                                <li><Icon icon="fa-solid fa-music" style={{ color: '#1DB954' }} /> <strong>Playlists</strong> — liens vers les playlists officielles du Hellfest (Spotify, Deezer, Apple Music, YouTube Music)</li>
                                <li><Icon icon="fa-solid fa-heart" style={{ color: '#ff6b6b' }} /> <strong>Crédits</strong></li>
                            </ul>
                        </div>

                        <div className="help-block">
                            <h4><Icon icon="fa-solid fa-gear" /> Paramètres</h4>
                            <ul className="help-list">
                                <li><strong>Couleurs des favoris</strong> — personnalise la couleur de chaque niveau d'intérêt</li>
                                <li><strong>Affichage</strong> — inverse l'ordre de la grille (matin en haut / soir en haut)</li>
                                <li><strong>Forcer la mise à jour du lineup</strong> — recharge les données depuis la source en ligne</li>
                                <li><strong>Vider le cache</strong> — supprime les fichiers en cache du navigateur et recharge l'appli. Tes données sont conservées.</li>
                            </ul>
                        </div>

                        <div className="help-block">
                            <h4><Icon icon="fa-solid fa-triangle-exclamation" style={{ color: '#dc2829' }} /> Zone de danger</h4>
                            <p>
                                <strong>Réinitialiser mon Running Order</strong> efface tous tes tags et événements personnalisés.
                                Action irréversible — un premier clic demande confirmation, un second dans les 3 secondes confirme.
                            </p>
                        </div>
                    </AccordionSection>
                </div>
            </div>
        </div>
    );
};

export default HelpPanel;
