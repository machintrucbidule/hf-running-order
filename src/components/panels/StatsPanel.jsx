import React, { useMemo, useState } from 'react';
import { useCheckedState } from '../../context/CheckedStateContext';
import { useAuth } from '../../context/AuthContext';
import { useFriends } from '../../context/FriendsContext';
import { useLineup } from '../../hooks/useLineup';
import { calculateStats } from '../../utils/statsUtils';
import { STAGE_CONFIG, MAIN_STAGES, INTEREST_LEVELS } from '../../constants';
import html2canvas from 'html2canvas';
import './StatsPanel.css';

const TABS = [
    { id: 'me', label: 'Moi', icon: 'fa-solid fa-user' },
    { id: 'my_circle', label: 'Mon cercle', icon: 'fa-solid fa-user-group' },
    { id: 'all_circles', label: 'Mes cercles', icon: 'fa-solid fa-users' },
];

const StatsPanel = ({ onClose, customEvents = [], onGroupClick }) => {
    const { state, userState, getInterestColor } = useCheckedState();
    const { user } = useAuth();
    const { circleMembersMap, memberCircleId, visibleCircleIds, circles } = useFriends();
    const effectiveState = userState || state;

    const { data: groups } = useLineup();
    const [activeTab, setActiveTab] = useState('me');
    const [expandedDays, setExpandedDays] = useState({});
    const [gaugeHeight, setGaugeHeight] = useState(0);
    const [animatedTotal, setAnimatedTotal] = useState(0);
    const [isCapturing, setIsCapturing] = useState(false);
    const panelRef = React.useRef(null);

    const stats = useMemo(() => {
        return calculateStats(groups, effectiveState.taggedBands);
    }, [groups, effectiveState.taggedBands]);

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setGaugeHeight(stats.averageCompletion);
        }, 300);

        let start = 0;
        const end = stats.totalBands;

        if (start === end) return;

        const duration = 1500;
        const incrementTime = end > 0 ? (duration / end) * 0.8 : 0;

        if (end > 0) {
            const timerCounter = setInterval(() => {
                start += 1;
                setAnimatedTotal(start);
                if (start >= end) clearInterval(timerCounter);
            }, Math.max(incrementTime, 20));

            return () => {
                clearTimeout(timer);
                clearInterval(timerCounter);
            };
        }
    }, [stats.averageCompletion, stats.totalBands]);

    // Circle stats computation
    const circleStats = useMemo(() => {
        if (!user || !groups || groups.length === 0) return null;

        const getMembers = (mode) => {
            const members = [];
            if (mode === 'my_circle') {
                if (!memberCircleId || !circleMembersMap.has(memberCircleId)) return [];
                const circleMembers = circleMembersMap.get(memberCircleId);
                circleMembers.forEach(m => {
                    if (m.id !== user.uid && Object.keys(m.taggedBands || {}).length > 0) {
                        members.push(m);
                    }
                });
            } else {
                const seen = new Set();
                for (const [circleId, circleMembers] of circleMembersMap) {
                    if (!visibleCircleIds.has(circleId)) continue;
                    circleMembers.forEach(m => {
                        if (m.id !== user.uid && !seen.has(m.id) && Object.keys(m.taggedBands || {}).length > 0) {
                            seen.add(m.id);
                            members.push(m);
                        }
                    });
                }
            }
            return members;
        };

        const members = getMembers(activeTab);
        if (members.length === 0) return { members: [], totalBands: 0, commonBands: 0, topBands: [], compatibility: [], dayStats: {} };

        const myBandIds = new Set(
            Object.entries(effectiveState.taggedBands || {})
                .filter(([, v]) => v.interest)
                .map(([id]) => id)
        );

        // All bands tagged by circle (union)
        const allCircleBandIds = new Set();
        members.forEach(m => {
            Object.keys(m.taggedBands || {}).forEach(id => allCircleBandIds.add(id));
        });
        myBandIds.forEach(id => allCircleBandIds.add(id));

        // Band counts + interest scores (how many people tagged each band, including me)
        const bandCounts = {};
        const bandInterestScores = {};
        const interestPriority = { must_see: 3, interested: 2, curious: 1 };
        myBandIds.forEach(id => {
            bandCounts[id] = (bandCounts[id] || 0) + 1;
            const interest = effectiveState.taggedBands[id]?.interest;
            bandInterestScores[id] = (bandInterestScores[id] || 0) + (interestPriority[interest] || 0);
        });
        members.forEach(m => {
            Object.entries(m.taggedBands || {}).forEach(([id, v]) => {
                bandCounts[id] = (bandCounts[id] || 0) + 1;
                bandInterestScores[id] = (bandInterestScores[id] || 0) + (interestPriority[v.interest] || 0);
            });
        });

        // Common bands (2+ people)
        const commonBands = Object.values(bandCounts).filter(c => c >= 2).length;

        // Top bands — sorted by count desc, then interest score desc
        const groupMap = {};
        groups.forEach(g => { groupMap[g.id] = g; });

        const topBands = Object.entries(bandCounts)
            .filter(([, count]) => count >= 2)
            .sort(([idA, countA], [idB, countB]) => {
                if (countB !== countA) return countB - countA;
                return (bandInterestScores[idB] || 0) - (bandInterestScores[idA] || 0);
            })
            .slice(0, 15)
            .map(([bandId, count]) => {
                const group = groupMap[bandId];
                // Who tagged it
                const taggedBy = [];
                if (myBandIds.has(bandId)) {
                    taggedBy.push({
                        id: user.uid,
                        displayName: user.displayName,
                        photoURL: user.photoURL,
                        interest: effectiveState.taggedBands[bandId]?.interest,
                        isMe: true,
                    });
                }
                members.forEach(m => {
                    if (m.taggedBands?.[bandId]?.interest) {
                        taggedBy.push({
                            id: m.id,
                            displayName: m.displayName,
                            photoURL: m.photoURL,
                            interest: m.taggedBands[bandId].interest,
                        });
                    }
                });
                return {
                    bandId,
                    name: group?.GROUPE || bandId,
                    scene: group?.SCENE || '',
                    day: group?.DAY || '',
                    count,
                    taggedBy,
                };
            });

        // Compatibility
        const compatibility = members.map(m => {
            const memberBandIds = new Set(Object.keys(m.taggedBands || {}));
            const common = [...myBandIds].filter(id => memberBandIds.has(id)).length;
            const total = myBandIds.size;
            return {
                id: m.id,
                displayName: m.displayName,
                photoURL: m.photoURL,
                commonCount: common,
                totalCount: total,
                percentage: total > 0 ? Math.round((common / total) * 100) : 0,
            };
        }).sort((a, b) => b.percentage - a.percentage);

        // Merged taggedBands for full stats (union of all members + me)
        const mergedTaggedBands = {};
        // Add my bands
        Object.entries(effectiveState.taggedBands || {}).forEach(([id, v]) => {
            if (v.interest) mergedTaggedBands[id] = { interest: v.interest };
        });
        // Add members' bands (keep highest interest)
        members.forEach(m => {
            Object.entries(m.taggedBands || {}).forEach(([id, v]) => {
                if (!v.interest) return;
                const existing = mergedTaggedBands[id];
                if (!existing || (interestPriority[v.interest] || 0) > (interestPriority[existing.interest] || 0)) {
                    mergedTaggedBands[id] = { interest: v.interest };
                }
            });
        });

        const circleCalcStats = calculateStats(groups, mergedTaggedBands);

        return {
            members,
            totalBands: allCircleBandIds.size,
            commonBands,
            topBands,
            compatibility,
            calcStats: circleCalcStats,
            totalMembers: members.length + 1, // +1 for me
        };
    }, [activeTab, groups, effectiveState.taggedBands, user, circleMembersMap, memberCircleId, visibleCircleIds]);

    const toggleDay = (day) => {
        setExpandedDays(prev => ({ ...prev, [day]: !prev[day] }));
    };

    const handleShare = async () => {
        if (!panelRef.current) return;

        setIsCapturing(true);
        setTimeout(async () => {
            try {
                const canvas = await html2canvas(panelRef.current, {
                    backgroundColor: '#1a1a1a',
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    onclone: (clonedDoc) => {
                        const clonedPanel = clonedDoc.querySelector('.stats-panel-container');
                        if (clonedPanel) {
                            clonedPanel.style.maxHeight = 'none';
                            clonedPanel.style.overflow = 'visible';
                            clonedPanel.style.borderRadius = '0';

                            const counterVal = clonedPanel.querySelector('.stats-count-val');
                            if (counterVal) counterVal.innerText = stats.totalBands;

                            const gaugeFill = clonedPanel.querySelector('.rank-gauge-bar-fill');
                            if (gaugeFill) gaugeFill.style.height = `${stats.averageCompletion}%`;
                        }
                    }
                });

                const image = canvas.toDataURL('image/png');

                if (navigator.share && navigator.canShare) {
                    const blob = await (await fetch(image)).blob();
                    const file = new File([blob], 'my-hellfest-stats.png', { type: 'image/png' });

                    const shareTitle = `🤘 Mon Profil Hellfest`;
                    const appUrl = window.location.origin + import.meta.env.BASE_URL;
                    const shareText = `Voici mon programme pour l'édition 2025 ! 🔥\n\n🤘 Groupes prévus : ${stats.totalBands}\n🏆 Grade : ${stats.rank}\n\nPrépare ton pèlerinage ici :\n${appUrl}\n\n#Hellfest #HellfestRunningOrder`;

                    if (navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            files: [file],
                            title: shareTitle,
                            text: shareText
                        });
                        setIsCapturing(false);
                        return;
                    }
                }

                const link = document.createElement('a');
                link.download = 'hellfest-stats.png';
                link.href = image;
                link.click();
            } catch (err) {
                console.error('Erreur lors de la capture :', err);
            }
            setIsCapturing(false);
        }, 100);
    };

    const RANKS = [
        { label: "Trve", bottom: "90%" },
        { label: "Hellbanger", bottom: "60%" },
        { label: "Amateur", bottom: "30%" },
        { label: "Touriste", bottom: "0%" }
    ];

    const circleName = activeTab === 'my_circle'
        ? circles.find(c => c.id === memberCircleId)?.name || 'Mon cercle'
        : 'Mes cercles';

    return (
        <div className={`stats-panel-overlay ${isCapturing ? 'capturing' : ''}`} onClick={onClose}>
            <div className="stats-panel-container" onClick={e => e.stopPropagation()} ref={panelRef}>
                {!isCapturing && (
                    <div className="stats-panel-actions">
                        {activeTab === 'me' && (
                            <button className="stats-share-btn" onClick={handleShare} title="Partager mon profil">
                                <i className="fa-solid fa-share-nodes"></i>
                            </button>
                        )}
                        <button onClick={onClose} className="stats-close-btn">
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <h2 className="stats-panel-title" style={{ margin: 0 }}>Stats</h2>
                </div>

                {/* Tabs */}
                {!isCapturing && (
                    <div className="stats-tabs">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                className={`stats-tab ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => { setActiveTab(tab.id); setExpandedDays({}); }}
                            >
                                <i className={tab.icon} style={{ marginRight: '5px', fontSize: '0.7rem' }}></i>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* === TAB: MOI === */}
                {activeTab === 'me' && (
                    <>
                        <div className="stats-panel-rank-widget">
                            <div className="rank-gauge-area">
                                <div className="rank-gauge-bar-container">
                                    <div
                                        className="rank-gauge-bar-fill"
                                        style={{ height: `${gaugeHeight}%` }}
                                    ></div>
                                </div>
                                <div className="rank-gauge-labels">
                                    {RANKS.map((rank, i) => {
                                        const isActive = stats.averageCompletion >= parseInt(rank.bottom);
                                        const isPassed = stats.rank.toLowerCase() !== rank.label.toLowerCase() && isActive;
                                        return (
                                            <div
                                                key={i}
                                                className={`rank-label ${isActive ? 'active' : ''} ${isPassed ? 'passed' : ''}`}
                                                style={{ bottom: rank.bottom }}
                                            >
                                                {rank.label}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="stats-panel-rank-info">
                                <div className="stats-main-counter">
                                    <span className="stats-count-val">{animatedTotal}</span>
                                    <span className="stats-count-label">Groupes prévus</span>
                                </div>
                                <div className="stats-rank-display">
                                    Rang : <span className="stats-rank-name">{stats.rank?.toUpperCase() || "TOURISTE"}</span>
                                </div>
                                {stats.weeklyPersona && (
                                    <div className="stats-rank-display" style={{ fontSize: '1.2rem', marginTop: '5px' }}>
                                        Classe : <span className="stats-rank-name">{stats.weeklyPersona.testTitle}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ clear: 'both' }}></div>

                        <div className="stats-panel-section-title">MES STATS PAR JOUR</div>
                        <div className="stats-panel-intensity-grid">
                            {Object.entries(stats.days)
                                .filter(([, data]) => data.count > 0)
                                .map(([day, data]) => {
                                    const percentage = data.completionRate || 0;
                                    const dayClashes = stats.clashesExtended ? stats.clashesExtended.filter(c => c.day === day) : [];
                                    const hasClashes = dayClashes.length > 0;
                                    const clashCount = dayClashes.length;

                                    let colorClass = 'low';
                                    let message = "Promenade de santé ☁️";

                                    if (percentage >= 50 && percentage < 75) {
                                        colorClass = 'medium';
                                        message = "Rythme de croisière 😎";
                                    } else if (percentage >= 75 && percentage < 90) {
                                        colorClass = 'high';
                                        message = "Grosse journée 🔥";
                                    } else if (percentage >= 90) {
                                        colorClass = 'critical';
                                        message = "Mode Berserker ⚔️";
                                    }

                                    if (clashCount > 2) {
                                        colorClass = 'critical';
                                        if (percentage < 90) {
                                            message = "Sprint infernal 🏃";
                                        }
                                    }

                                    const isExpanded = expandedDays[day];

                                    return (
                                        <div key={day} className="stats-panel-day-intensity">
                                            <div className="stats-panel-day-label">
                                                <span style={{ fontWeight: 600 }}>{day}</span>
                                                {message && <span className={`intensity-badge ${colorClass}`}>{message}</span>}
                                            </div>
                                            <div className="stats-panel-day-meta">
                                                Taux d'occupation : {Math.round(percentage)}%
                                            </div>
                                            <div className="stats-panel-progress-bar-bg">
                                                <div
                                                    className={`stats-panel-progress-bar-fill ${colorClass}`}
                                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                                ></div>
                                            </div>

                                            {hasClashes ? (
                                                <div className="stats-panel-day-clashes">
                                                    <div
                                                        className="stats-panel-clash-trigger"
                                                        onClick={() => toggleDay(day)}
                                                    >
                                                        <span className="clash-trigger-icon">{"⚠️"}</span>
                                                        <span className="clash-trigger-text">{data.count} groupes — {dayClashes.length} Conflit{dayClashes.length > 1 ? 's' : ''} (Afficher)</span>
                                                        <span className={`clash-chevron ${isExpanded ? 'open' : ''}`}>{"▼"}</span>
                                                    </div>

                                                    {isExpanded && (
                                                        <div className="stats-panel-clash-list embedded">
                                                            {dayClashes.map((clash, index) => (
                                                                <div key={index} className="stats-panel-clash-item embedded">
                                                                    <div className="stats-panel-duel vertical">
                                                                        {clash.bands.map(b => (
                                                                            <div key={b.id} className="clash-band-row">
                                                                                <span>{b.GROUPE}</span>
                                                                                <span className="clash-time-hint">{b.DEBUT}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    <span className="stats-panel-clash-type">
                                                                        {clash.level === 2 ? 'VS' : `${clash.level} way`}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="stats-panel-day-clashes no-conflict">
                                                    <div className="stats-panel-clash-trigger no-conflict">
                                                        <span className="clash-trigger-icon">{"👍"}</span>
                                                        <span className="clash-trigger-text">{data.count} groupes — Aucun conflit</span>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="stats-panel-stage-logos-row">
                                                {[...MAIN_STAGES]
                                                    .filter(stageKey => (data.stages && data.stages[stageKey]) > 0)
                                                    .sort((a, b) => {
                                                        const countA = (data.stages && data.stages[a]) || 0;
                                                        const countB = (data.stages && data.stages[b]) || 0;
                                                        if (countB !== countA) return countB - countA;
                                                        return MAIN_STAGES.indexOf(a) - MAIN_STAGES.indexOf(b);
                                                    })
                                                    .map(stageKey => {
                                                        const count = data.stages[stageKey];
                                                        const config = STAGE_CONFIG[stageKey];
                                                        return (
                                                            <div
                                                                key={stageKey}
                                                                className="stage-logo-item"
                                                                style={{
                                                                    flex: count,
                                                                    backgroundColor: config.themeColor || 'rgba(255,255,255,0.1)'
                                                                }}
                                                                title={`${config.name}: ${count} groupes`}
                                                            >
                                                                <img src={config.icon} alt={config.name} className="stage-logo-img" />
                                                            </div>
                                                        );
                                                    })}
                                            </div>

                                            <div className="daily-rank-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '10px', marginBottom: '10px' }}>
                                                <div className="daily-rank-icon">
                                                    <i className="fa-solid fa-medal"></i>
                                                </div>
                                                <div className="daily-rank-title">
                                                    {data.persona?.title || "Simple Festivalier"}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </>
                )}

                {/* === TAB: MON CERCLE / MES CERCLES === */}
                {(activeTab === 'my_circle' || activeTab === 'all_circles') && (
                    <>
                        {!circleStats || circleStats.members.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '30px 0', color: '#888' }}>
                                <i className="fa-solid fa-users-slash" style={{ fontSize: '2rem', marginBottom: '10px', display: 'block', color: '#555' }}></i>
                                {activeTab === 'my_circle'
                                    ? 'Aucun membre avec des groupes taggés dans ton cercle.'
                                    : 'Aucun ami avec des groupes taggés dans tes cercles.'}
                            </div>
                        ) : (
                            <>
                                {/* Overview widget */}
                                <div className="stats-panel-rank-widget">
                                    <div className="stats-panel-rank-info" style={{ width: '100%' }}>
                                        <div className="stats-main-counter">
                                            <span className="stats-count-val">{circleStats.totalBands}</span>
                                            <span className="stats-count-label">Groupes suivis</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4CAF50' }}>{circleStats.commonBands}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase' }}>En commun</div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#FFD700' }}>{circleStats.totalMembers}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase' }}>Participants</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Compatibility */}
                                {circleStats.compatibility.length > 0 && (
                                    <>
                                        <div className="stats-panel-section-title">COMPATIBILITÉ</div>
                                        <div className="stats-circle-compat">
                                            {circleStats.compatibility.map(member => (
                                                <div key={member.id} className="stats-circle-compat-row">
                                                    <div className="stats-circle-compat-member">
                                                        {member.photoURL ? (
                                                            <img
                                                                src={member.photoURL}
                                                                alt=""
                                                                referrerPolicy="no-referrer"
                                                                className="stats-circle-compat-avatar"
                                                            />
                                                        ) : (
                                                            <div className="stats-circle-compat-avatar-fallback">
                                                                {(member.displayName || '?')[0].toUpperCase()}
                                                            </div>
                                                        )}
                                                        <span className="stats-circle-compat-name">{(member.displayName || '?').replace(/\s*\(.*?\)\s*/g, '').trim()}</span>
                                                    </div>
                                                    <div className="stats-circle-compat-bar-container">
                                                        <div className="stats-circle-compat-bar">
                                                            <div
                                                                className="stats-circle-compat-bar-fill"
                                                                style={{ width: `${member.percentage}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="stats-circle-compat-pct">{member.percentage}%</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {/* Day stats (same layout as personal stats) */}
                                {circleStats.calcStats && Object.entries(circleStats.calcStats.days).some(([, d]) => d.count > 0) && (
                                    <>
                                        <div className="stats-panel-section-title">STATS PAR JOUR</div>
                                        <div className="stats-panel-intensity-grid">
                                            {Object.entries(circleStats.calcStats.days)
                                                .filter(([, data]) => data.count > 0)
                                                .map(([day, data]) => {
                                                    const percentage = data.completionRate || 0;
                                                    const dayClashes = circleStats.calcStats.clashesExtended ? circleStats.calcStats.clashesExtended.filter(c => c.day === day) : [];
                                                    const hasClashes = dayClashes.length > 0;
                                                    const clashCount = dayClashes.length;

                                                    let colorClass = 'low';
                                                    let message = "Promenade de santé ☁️";

                                                    if (percentage >= 50 && percentage < 75) {
                                                        colorClass = 'medium';
                                                        message = "Rythme de croisière 😎";
                                                    } else if (percentage >= 75 && percentage < 90) {
                                                        colorClass = 'high';
                                                        message = "Grosse journée 🔥";
                                                    } else if (percentage >= 90) {
                                                        colorClass = 'critical';
                                                        message = "Mode Berserker ⚔️";
                                                    }

                                                    if (clashCount > 2) {
                                                        colorClass = 'critical';
                                                        if (percentage < 90) {
                                                            message = "Sprint infernal 🏃";
                                                        }
                                                    }

                                                    const isExpanded = expandedDays[day];

                                                    // Top 5 bands in common for this day
                                                    const dayTopBands = circleStats.topBands
                                                        .filter(b => b.day === day)
                                                        .slice(0, 5);

                                                    return (
                                                        <div key={day} className="stats-panel-day-intensity">
                                                            <div className="stats-panel-day-label">
                                                                <span style={{ fontWeight: 600 }}>{day}</span>
                                                                {message && <span className={`intensity-badge ${colorClass}`}>{message}</span>}
                                                            </div>
                                                            <div className="stats-panel-day-meta">
                                                                Taux d'occupation : {Math.round(percentage)}%
                                                            </div>
                                                            <div className="stats-panel-progress-bar-bg">
                                                                <div
                                                                    className={`stats-panel-progress-bar-fill ${colorClass}`}
                                                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                                                ></div>
                                                            </div>

                                                            {hasClashes ? (
                                                                <div className="stats-panel-day-clashes">
                                                                    <div
                                                                        className="stats-panel-clash-trigger"
                                                                        onClick={() => toggleDay(day)}
                                                                    >
                                                                        <span className="clash-trigger-icon">{"⚠️"}</span>
                                                                        <span className="clash-trigger-text">{data.count} groupes — {dayClashes.length} Conflit{dayClashes.length > 1 ? 's' : ''} (Afficher)</span>
                                                                        <span className={`clash-chevron ${isExpanded ? 'open' : ''}`}>{"▼"}</span>
                                                                    </div>

                                                                    {isExpanded && (
                                                                        <div className="stats-panel-clash-list embedded">
                                                                            {dayClashes.map((clash, index) => (
                                                                                <div key={index} className="stats-panel-clash-item embedded">
                                                                                    <div className="stats-panel-duel vertical">
                                                                                        {clash.bands.map(b => (
                                                                                            <div key={b.id} className="clash-band-row">
                                                                                                <span>{b.GROUPE}</span>
                                                                                                <span className="clash-time-hint">{b.DEBUT}</span>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                    <span className="stats-panel-clash-type">
                                                                                        {clash.level === 2 ? 'VS' : `${clash.level} way`}
                                                                                    </span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="stats-panel-day-clashes no-conflict">
                                                                    <div className="stats-panel-clash-trigger no-conflict">
                                                                        <span className="clash-trigger-icon">{"👍"}</span>
                                                                        <span className="clash-trigger-text">{data.count} groupes — Aucun conflit</span>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div className="stats-panel-stage-logos-row">
                                                                {[...MAIN_STAGES]
                                                                    .filter(stageKey => (data.stages && data.stages[stageKey]) > 0)
                                                                    .sort((a, b) => {
                                                                        const countA = (data.stages && data.stages[a]) || 0;
                                                                        const countB = (data.stages && data.stages[b]) || 0;
                                                                        if (countB !== countA) return countB - countA;
                                                                        return MAIN_STAGES.indexOf(a) - MAIN_STAGES.indexOf(b);
                                                                    })
                                                                    .map(stageKey => {
                                                                        const count = data.stages[stageKey];
                                                                        const config = STAGE_CONFIG[stageKey];
                                                                        return (
                                                                            <div
                                                                                key={stageKey}
                                                                                className="stage-logo-item"
                                                                                style={{
                                                                                    flex: count,
                                                                                    backgroundColor: config.themeColor || 'rgba(255,255,255,0.1)'
                                                                                }}
                                                                                title={`${config.name}: ${count} groupes`}
                                                                            >
                                                                                <img src={config.icon} alt={config.name} className="stage-logo-img" />
                                                                            </div>
                                                                        );
                                                                    })}
                                                            </div>

                                                            <div className="daily-rank-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '10px', marginBottom: dayTopBands.length > 0 ? '6px' : '0' }}>
                                                                <div className="daily-rank-icon">
                                                                    <i className="fa-solid fa-medal"></i>
                                                                </div>
                                                                <div className="daily-rank-title">
                                                                    {data.persona?.title || "Simple Festivalier"}
                                                                </div>
                                                            </div>

                                                            {dayTopBands.length > 0 && (
                                                                <div className="stats-circle-top-bands" style={{ marginTop: '4px' }}>
                                                                    <div style={{ fontSize: '0.65rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Top groupes en commun</div>
                                                                    {dayTopBands.map(band => {
                                                                        const handleBandClick = (e) => {
                                                                            const group = groups.find(g => String(g.id) === String(band.bandId));
                                                                            if (group && onGroupClick) onGroupClick(group, e);
                                                                        };
                                                                        return (
                                                                        <div key={band.bandId} className="stats-circle-band-row">
                                                                            <div className="stats-circle-band-info" onClick={handleBandClick}>
                                                                                <span className="stats-circle-band-name">{band.name}</span>
                                                                                <span className="stats-circle-band-meta">{band.scene}</span>
                                                                            </div>
                                                                            <div className="stats-circle-band-count" onClick={handleBandClick}>
                                                                                <span>×</span>
                                                                                <span>{band.count}</span>
                                                                            </div>
                                                                            <div className="stats-circle-band-avatars" onClick={handleBandClick}>
                                                                                {band.taggedBy.map(person => (
                                                                                    <div key={person.id} className="stats-circle-avatar-wrapper" title={person.displayName}>
                                                                                        {person.photoURL ? (
                                                                                            <img
                                                                                                src={person.photoURL}
                                                                                                alt=""
                                                                                                referrerPolicy="no-referrer"
                                                                                                className="stats-circle-avatar"
                                                                                                style={{ borderColor: getInterestColor(person.interest) || '#888' }}
                                                                                            />
                                                                                        ) : (
                                                                                            <div
                                                                                                className="stats-circle-avatar-fallback"
                                                                                                style={{ borderColor: getInterestColor(person.interest) || '#888' }}
                                                                                            >
                                                                                                {(person.displayName || '?')[0].toUpperCase()}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    );})}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </>
                                )}

                                {/* Top bands */}
                                {circleStats.topBands.length > 0 && (
                                    <>
                                        <div className="stats-panel-section-title" style={{ marginTop: '10px' }}>TOP GROUPES DU CERCLE</div>
                                        <div className="stats-circle-top-bands">
                                            {circleStats.topBands.map(band => {
                                                const handleBandClick = (e) => {
                                                    const group = groups.find(g => String(g.id) === String(band.bandId));
                                                    if (group && onGroupClick) onGroupClick(group, e);
                                                };
                                                return (
                                                <div key={band.bandId} className="stats-circle-band-row">
                                                    <div className="stats-circle-band-info" onClick={handleBandClick}>
                                                        <span className="stats-circle-band-name">{band.name}</span>
                                                        <span className="stats-circle-band-meta">{band.scene} — {band.day}</span>
                                                    </div>
                                                    <div className="stats-circle-band-count" onClick={handleBandClick}>
                                                        <span>×</span>
                                                        <span>{band.count}</span>
                                                    </div>
                                                    <div className="stats-circle-band-avatars" onClick={handleBandClick}>
                                                        {band.taggedBy.map(person => (
                                                            <div key={person.id} className="stats-circle-avatar-wrapper" title={person.displayName}>
                                                                {person.photoURL ? (
                                                                    <img
                                                                        src={person.photoURL}
                                                                        alt=""
                                                                        referrerPolicy="no-referrer"
                                                                        className="stats-circle-avatar"
                                                                        style={{ borderColor: getInterestColor(person.interest) || '#888' }}
                                                                    />
                                                                ) : (
                                                                    <div
                                                                        className="stats-circle-avatar-fallback"
                                                                        style={{ borderColor: getInterestColor(person.interest) || '#888' }}
                                                                    >
                                                                        {(person.displayName || '?')[0].toUpperCase()}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default StatsPanel;
