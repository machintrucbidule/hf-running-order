import React, { useMemo, useState } from 'react';
import { useCheckedState } from '../../context/CheckedStateContext';
import { useAuth } from '../../context/AuthContext';
import { useFriends } from '../../context/FriendsContext';
import { useLineup } from '../../hooks/useLineup';
import { calculateStats, getTopGenres, getFavoriteStage, timeToMinutes } from '../../utils/statsUtils';
import { STAGE_CONFIG, MAIN_STAGES, INTEREST_LEVELS } from '../../constants';
import './StatsPanel.css';

// D4: Genre color palette (matched to genre keywords)
const GENRE_COLORS = {
    sludge: '#8B7355', death: '#8B0000', metalcore: '#FF4500', nu: '#9B59B6',
    heavy: '#C0C0C0', punk: '#FF1493', hardcore: '#FF6347', stoner: '#DAA520',
    post: '#4682B4', rock: '#1E90FF', black: '#2C2C2C', folk: '#228B22',
    indus: '#708090', thrash: '#FF8C00', power: '#FFD700', prog: '#00CED1',
    alternatif: '#20B2AA', hard: '#DC143C', metal: '#A0A0A0', doom: '#4A0E4E',
    grind: '#B22222', groove: '#CD853F', speed: '#FF4500', symphoni: '#9370DB',
    djent: '#5F9EA0', deathcore: '#800000', grunge: '#6B8E23', blues: '#4169E1',
    electro: '#00BFFF', ambient: '#7B68EE', psyche: '#DA70D6', viking: '#8FBC8F',
    pagan: '#6B8E23', pirate: '#CD853F', gothic: '#483D8B',
};

const getGenreColor = (genre) => {
    const lower = genre.toLowerCase();
    for (const [key, color] of Object.entries(GENRE_COLORS)) {
        if (lower.includes(key)) return color;
    }
    return '#888';
};

// D4: Genre chips component
const GenreChips = ({ genres, daily = false }) => (
    <div className={`genre-chips-container ${daily ? 'daily' : ''}`}>
        {genres.map((g, i) => {
            const color = getGenreColor(g.genre);
            return (
                <span key={i} className="genre-chip" style={{
                    borderColor: `${color}66`,
                    background: `${color}20`,
                    color: color,
                }}>
                    {g.genre} <span className="genre-chip-count">x{g.count}</span>
                </span>
            );
        })}
    </div>
);

// D1: Circular gauge SVG component — uses stroke-dasharray technique
const CircularGauge = ({ percentage, rank, favStage }) => {
    // Semi-circle gauge using stroke-dasharray
    const r = 50, strokeW = 10;
    const cx = 70, cy = 60;
    // Half circumference (semi-circle from left to right, opening upward)
    const halfCirc = Math.PI * r;
    const fillLen = (Math.min(percentage, 100) / 100) * halfCirc;

    // Rank thresholds for tick marks
    const thresholds = [30, 60, 90];

    return (
        <div className="circular-gauge-container">
            <svg className="circular-gauge-svg" viewBox="0 0 140 80">
                <defs>
                    <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#5DADE2" />
                        <stop offset="50%" stopColor="#F4A261" />
                        <stop offset="100%" stopColor="#E63946" />
                    </linearGradient>
                </defs>
                {/* Background semi-circle arc (180°, from left to right over the top) */}
                <path
                    d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
                    fill="none" stroke="#333" strokeWidth={strokeW} strokeLinecap="round"
                />
                {/* Filled arc */}
                {percentage > 0 && (
                    <path
                        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
                        fill="none" stroke="url(#gaugeGrad)" strokeWidth={strokeW} strokeLinecap="round"
                        strokeDasharray={`${fillLen} ${halfCirc}`}
                        style={{ transition: 'stroke-dasharray 1.5s cubic-bezier(0.22, 1, 0.36, 1)' }}
                    />
                )}
                {/* Tick marks at 30%, 60%, 90% */}
                {thresholds.map((t, i) => {
                    const angle = Math.PI - (t / 100) * Math.PI;
                    const x1 = cx + (r - 8) * Math.cos(angle);
                    const y1 = cy - (r - 8) * Math.sin(angle);
                    const x2 = cx + (r + 8) * Math.cos(angle);
                    const y2 = cy - (r + 8) * Math.sin(angle);
                    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#555" strokeWidth="1.5" />;
                })}
                {/* Center text */}
                <text x={cx} y={cy - 18} textAnchor="middle" fill="#fff" fontSize="20" fontWeight="bold">
                    {Math.round(percentage)}%
                </text>
                <text x={cx} y={cy - 3} textAnchor="middle" fill="#E63946" fontSize="11" fontWeight="bold"
                    style={{ fontFamily: "'Metal Mania', cursive" }}>
                    {rank?.toUpperCase()}
                </text>
            </svg>
            {/* B4: Favorite stage under the gauge */}
            {favStage && (
                <div className="favorite-stage-row" style={{ marginTop: 2 }}>
                    {favStage.icon && <img src={favStage.icon} alt="" className="favorite-stage-icon" />}
                    <span className="favorite-stage-name" style={{ fontSize: '0.7rem' }}>{favStage.name}</span>
                    <span className="favorite-stage-pct">({favStage.pct}%)</span>
                </div>
            )}
        </div>
    );
};

// D2: Radar chart SVG component — with gradient fills between adjacent genre colors
const RadarChart = ({ genres, size = 200 }) => {
    if (!genres || genres.length < 3) return null;

    const data = genres.slice(0, 6);
    const cx = size / 2, cy = size / 2;
    const maxR = size / 2 - 6;
    const maxVal = Math.max(...data.map(g => g.count));
    const levels = 3;

    const getPoint = (index, value) => {
        const angle = (Math.PI * 2 * index) / data.length - Math.PI / 2;
        const r = (value / maxVal) * maxR;
        return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    };

    const gridLines = [];
    for (let l = 1; l <= levels; l++) {
        const pts = data.map((_, i) => getPoint(i, (l / levels) * maxVal));
        gridLines.push(pts.map(p => `${p.x},${p.y}`).join(' '));
    }

    const dataPoints = data.map((g, i) => getPoint(i, g.count));

    // Label positioning: compute the Y position and which side (left/right/top/bottom)
    const labelInfos = data.map((g, i) => {
        const angle = (Math.PI * 2 * i) / data.length - Math.PI / 2;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        // The radar line endpoint for this axis
        const lineEndX = cx + maxR * cosA;
        const lineEndY = cy + maxR * sinA;
        // Label Y position (relative to SVG)
        const ly = lineEndY;

        let side; // 'left', 'right', 'top', 'bottom'
        if (Math.abs(angle - (-Math.PI / 2)) < 0.15) side = 'top';
        else if (Math.abs(angle - (Math.PI / 2)) < 0.15) side = 'bottom';
        else if (cosA < 0) side = 'left';
        else side = 'right';

        // Distance from radar center to the line endpoint on this axis (in px)
        // For left labels: label container right edge = lineEndX - 6
        // For right labels: label container left edge = lineEndX + 6
        return { label: g.genre, side, lineEndX, ly, color: getGenreColor(g.genre) };
    });

    const gradId = `rg${size}_${data.map(g => g.genre[0]).join('')}`;

    return (
        <div className="radar-chart-container" style={{ position: 'relative' }}>
            <svg className="radar-chart-svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <defs>
                    {dataPoints.map((p, i) => {
                        const next = dataPoints[(i + 1) % dataPoints.length];
                        const c1 = getGenreColor(data[i].genre);
                        const c2 = getGenreColor(data[(i + 1) % data.length].genre);
                        return (
                            <linearGradient key={`g${i}`} id={`${gradId}_${i}`}
                                x1={p.x} y1={p.y} x2={next.x} y2={next.y} gradientUnits="userSpaceOnUse">
                                <stop offset="0%" stopColor={c1} />
                                <stop offset="100%" stopColor={c2} />
                            </linearGradient>
                        );
                    })}
                </defs>
                {gridLines.map((pts, i) => (
                    <polygon key={i} points={pts} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />
                ))}
                {data.map((_, i) => {
                    const end = getPoint(i, maxVal);
                    return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />;
                })}
                {dataPoints.map((p, i) => {
                    const next = dataPoints[(i + 1) % dataPoints.length];
                    return (
                        <polygon key={`tri${i}`}
                            points={`${cx},${cy} ${p.x},${p.y} ${next.x},${next.y}`}
                            fill={`url(#${gradId}_${i})`} opacity="0.3" />
                    );
                })}
                <polygon points={dataPoints.map(p => `${p.x},${p.y}`).join(' ')}
                    fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                {dataPoints.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="4" fill={getGenreColor(data[i].genre)} />
                ))}
            </svg>
            {/* Labels rendered as positioned HTML spans anchored to the SVG coordinate system */}
            {labelInfos.map((info, i) => {
                if (info.side === 'top') {
                    return (
                        <span key={i} className="radar-label-text"
                            style={{
                                position: 'absolute',
                                left: info.lineEndX,
                                top: info.ly - 2,
                                transform: 'translate(-110%, -100%)',
                                color: info.color,
                                whiteSpace: 'nowrap',
                            }}>
                            {info.label}
                        </span>
                    );
                }
                if (info.side === 'bottom') {
                    return (
                        <span key={i} className="radar-label-text"
                            style={{
                                position: 'absolute',
                                left: info.lineEndX,
                                top: info.ly + 2,
                                transform: 'translate(10%, 0%)',
                                color: info.color,
                                whiteSpace: 'nowrap',
                            }}>
                            {info.label}
                        </span>
                    );
                }
                // Left and right labels will be rendered by the parent wrapper
                return null;
            })}
            {/* Expose label info for parent to render left/right labels */}
            <div className="radar-label-data" style={{ display: 'none' }}
                data-labels={JSON.stringify(labelInfos)} />
        </div>
    );
};

// Individual radar label with overflow scroll detection
const RadarLabel = ({ side, containerWidth, containerLeft, top, color, label }) => {
    const containerRef = React.useRef(null);
    const textRef = React.useRef(null);
    const [overflows, setOverflows] = React.useState(false);

    React.useEffect(() => {
        if (!containerRef.current || !textRef.current) return;
        const cw = containerRef.current.offsetWidth;
        const tw = textRef.current.scrollWidth;
        setOverflows(tw > cw);
    }, [label, containerWidth]);

    const scrollAmount = overflows && textRef.current && containerRef.current
        ? textRef.current.scrollWidth - containerRef.current.offsetWidth
        : 0;

    return (
        <div ref={containerRef}
            className={`radar-label-container-${side}`}
            style={{
                position: 'absolute',
                left: containerLeft,
                width: Math.max(containerWidth, 0),
                top: top,
                transform: 'translateY(-50%)',
                overflow: 'hidden',
            }}>
            <span ref={textRef}
                className="radar-label-text"
                style={{
                    color,
                    display: 'inline-block',
                    ...(overflows ? {
                        animation: `radarLabelScroll${side === 'left' ? 'Left' : 'Right'} 3s ease-in-out infinite alternate`,
                        '--scroll-amount': `${scrollAmount}px`,
                    } : {}),
                }}>
                {label}
            </span>
        </div>
    );
};

// Wrapper that renders radar + pie side by side (desktop) or stacked (mobile)
const ChartsRow = ({ genres, stats, calcStats }) => {
    const rowRef = React.useRef(null);
    const pieRef = React.useRef(null);
    const [positions, setPositions] = React.useState(null);

    const data = genres?.slice(0, 6);
    const size = 200;
    const cx = size / 2, cy = size / 2;
    const maxR = size / 2 - 6;

    // Compute label infos (same logic as RadarChart)
    const labelInfos = React.useMemo(() => {
        if (!data || data.length < 3) return [];
        return data.map((g, i) => {
            const angle = (Math.PI * 2 * i) / data.length - Math.PI / 2;
            const cosA = Math.cos(angle);
            const lineEndX = cx + maxR * cosA;
            const lineEndY = cy + maxR * Math.sin(angle);
            let side;
            if (Math.abs(angle - (-Math.PI / 2)) < 0.15) side = 'top';
            else if (Math.abs(angle - (Math.PI / 2)) < 0.15) side = 'bottom';
            else if (cosA < 0) side = 'left';
            else side = 'right';
            return { label: g.genre, side, lineEndX, ly: lineEndY, color: getGenreColor(g.genre) };
        });
    }, [data]);

    // Measure actual DOM positions after mount
    React.useEffect(() => {
        if (!rowRef.current) return;
        const measure = () => {
            const radarWrap = rowRef.current.querySelector('.widget-radar-wrap');
            if (!radarWrap) return;
            const wrapRect = radarWrap.getBoundingClientRect();

            // Find the widget border element (parent with padding)
            const widget = rowRef.current.closest('.stats-panel-rank-widget');
            const widgetRect = widget ? widget.getBoundingClientRect() : wrapRect;
            // Border position = widget content edge (after border, before padding)
            // widget has border:1px + padding:20px, so inner content starts at border+padding
            // But we want labels to go to the border edge (inside the 1px border, overlapping the padding)
            const widgetBorderLeft = widgetRect.left + 1; // 1px border
            const widgetBorderRight = widgetRect.right - 1;

            // Offset from radarWrap left to widget border left
            const offsetLeft = wrapRect.left - widgetBorderLeft;
            // Offset from radarWrap right to widget border right
            const offsetRight = widgetBorderRight - wrapRect.left;

            const radarSvg = radarWrap.querySelector('.radar-chart-svg');
            if (!radarSvg) return;
            const svgRect = radarSvg.getBoundingClientRect();

            const scaleX = svgRect.width / size;
            const scaleY = svgRect.height / size;

            const svgLeftInWrap = svgRect.left - wrapRect.left;
            const svgTopInWrap = svgRect.top - wrapRect.top;

            // Right boundary for labels:
            // Desktop (pie beside): pie left - 10px, relative to radarWrap
            // Mobile (pie below): widget right border, relative to radarWrap
            let rightBound = offsetRight;
            if (pieRef.current) {
                const pieSvg = pieRef.current.querySelector('svg');
                if (pieSvg) {
                    const pieRect = pieSvg.getBoundingClientRect();
                    const pieBeside = pieRect.top < (svgRect.bottom - 20);
                    if (pieBeside) {
                        rightBound = pieRect.left - wrapRect.left - 10;
                    }
                }
            }

            setPositions({ svgLeftInWrap, svgTopInWrap, scaleX, scaleY, rightBound, offsetLeft });
        };
        const timer = setTimeout(measure, 50);
        const observer = new ResizeObserver(measure);
        observer.observe(rowRef.current);
        return () => { clearTimeout(timer); observer.disconnect(); };
    }, [labelInfos]);

    const leftLabels = labelInfos.filter(l => l.side === 'left');
    const rightLabels = labelInfos.filter(l => l.side === 'right');

    return (
        <div className="widget-charts-row" ref={rowRef}>
            {/* Radar with its labels */}
            <div className="widget-radar-wrap" style={{ position: 'relative' }}>
                <div className="widget-chart-cell">
                    {data && data.length >= 3 && <RadarChart genres={data} size={size} />}
                </div>
                {/* Left labels: from widget border to 6px before radar line endpoint */}
                {positions && leftLabels.map((info, i) => {
                    const lineXInWrap = positions.svgLeftInWrap + info.lineEndX * positions.scaleX;
                    const lineYInWrap = positions.svgTopInWrap + info.ly * positions.scaleY;
                    // Start at widget border (negative offset to escape parent padding)
                    const containerLeft = -positions.offsetLeft;
                    const containerWidth = positions.offsetLeft + lineXInWrap - 6;

                    return (
                        <RadarLabel key={`ll${i}`} side="left"
                            containerWidth={containerWidth}
                            containerLeft={containerLeft}
                            top={lineYInWrap}
                            color={info.color}
                            label={info.label} />
                    );
                })}
                {/* Right labels: to pie (desktop) or to widget border (mobile) */}
                {positions && rightLabels.map((info, i) => {
                    const lineXInWrap = positions.svgLeftInWrap + info.lineEndX * positions.scaleX;
                    const lineYInWrap = positions.svgTopInWrap + info.ly * positions.scaleY;
                    const containerLeft = lineXInWrap + 6;
                    const containerWidth = positions.rightBound - containerLeft;

                    return (
                        <RadarLabel key={`rl${i}`} side="right"
                            containerWidth={containerWidth}
                            containerLeft={containerLeft}
                            top={lineYInWrap}
                            color={info.color}
                            label={info.label} />
                    );
                })}
            </div>
            {/* Pie chart: beside radar on desktop, below on mobile */}
            <div className="widget-chart-cell widget-pie-cell" ref={pieRef}>
                <StagePieChart stats={calcStats || stats} size={160} />
            </div>
        </div>
    );
};

// Short name helper for pie chart legend
const getShortStageName = (name) => {
    if (name === 'Mainstage 1') return 'MS1';
    if (name === 'Mainstage 2') return 'MS2';
    return name;
};

// Stage pie chart (donut) SVG component — percentages inside slices, legend below
const StagePieChart = ({ stats, size = 140 }) => {
    if (!stats?.days) return null;
    const stageTotals = {};
    Object.values(stats.days).forEach(dayData => {
        Object.entries(dayData.stages || {}).forEach(([stage, count]) => {
            stageTotals[stage] = (stageTotals[stage] || 0) + count;
        });
    });
    const entries = Object.entries(stageTotals).filter(([, c]) => c > 0).sort(([, a], [, b]) => b - a).slice(0, 6);
    const total = entries.reduce((sum, [, c]) => sum + c, 0);
    if (total === 0) return null;

    const cx = size / 2, cy = size / 2;
    const outerR = size / 2 - 2;
    const innerR = outerR * 0.45;

    const slices = [];
    if (entries.length === 1) {
        const config = STAGE_CONFIG[entries[0][0]];
        slices.push({ color: config?.themeColor || '#666', name: config?.name || entries[0][0], pct: 100, d: null, midAngle: 0 });
    } else {
        let cumAngle = -Math.PI / 2;
        entries.forEach(([stage, count]) => {
            const sliceAngle = (count / total) * Math.PI * 2;
            const startAngle = cumAngle;
            const endAngle = cumAngle + sliceAngle;
            const midAngle = (startAngle + endAngle) / 2;
            cumAngle = endAngle;
            const sx1 = cx + outerR * Math.cos(startAngle), sy1 = cy + outerR * Math.sin(startAngle);
            const sx2 = cx + outerR * Math.cos(endAngle), sy2 = cy + outerR * Math.sin(endAngle);
            const ix1 = cx + innerR * Math.cos(startAngle), iy1 = cy + innerR * Math.sin(startAngle);
            const ix2 = cx + innerR * Math.cos(endAngle), iy2 = cy + innerR * Math.sin(endAngle);
            const large = sliceAngle > Math.PI ? 1 : 0;
            const config = STAGE_CONFIG[stage];
            const d = `M ${sx1} ${sy1} A ${outerR} ${outerR} 0 ${large} 1 ${sx2} ${sy2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${large} 0 ${ix1} ${iy1} Z`;
            slices.push({ color: config?.themeColor || '#666', name: config?.name || stage, pct: Math.round((count / total) * 100), d, midAngle });
        });
    }

    // Position for percentage labels inside slices
    const labelR = (outerR + innerR) / 2;

    return (
        <div className="stage-pie-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {entries.length === 1 ? (
                    <>
                        <circle cx={cx} cy={cy} r={outerR} fill={slices[0].color} opacity="0.85" />
                        <circle cx={cx} cy={cy} r={innerR} fill="#222" />
                        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
                            fill="#fff" fontSize="12" fontWeight="700">100%</text>
                    </>
                ) : (
                    <>
                        {slices.map((s, i) => (
                            <path key={i} d={s.d} fill={s.color} stroke="#222" strokeWidth="1.5" opacity="0.85" />
                        ))}
                        <circle cx={cx} cy={cy} r={innerR} fill="#222" />
                        {slices.map((s, i) => {
                            if (s.pct < 10) return null;
                            const lx = cx + labelR * Math.cos(s.midAngle);
                            const ly = cy + labelR * Math.sin(s.midAngle);
                            return (
                                <text key={`l${i}`} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                                    fill="#fff" fontSize="9" fontWeight="700" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                                    {s.pct}%
                                </text>
                            );
                        })}
                    </>
                )}
            </svg>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 8px', justifyContent: 'center', maxWidth: size + 40 }}>
                {slices.map((s, i) => (
                    <span key={i} style={{ fontSize: '0.9rem', color: s.color, whiteSpace: 'nowrap', fontWeight: 600 }}>
                        {getShortStageName(s.name)}
                    </span>
                ))}
            </div>
        </div>
    );
};

// D3: Mini timeline SVG component
const DAILY_WINDOWS = {
    'Jeudi': { start: '16:30', end: '02:05' },
    'Vendredi': { start: '10:30', end: '02:10' },
    'Samedi': { start: '10:30', end: '02:00' },
    'Dimanche': { start: '10:30', end: '00:30' }
};

const MiniTimeline = ({ day, bands }) => {
    const win = DAILY_WINDOWS[day];
    if (!win) return null;

    const wStart = timeToMinutes(win.start);
    const wEnd = timeToMinutes(win.end);
    const totalMin = wEnd - wStart;
    if (totalMin <= 0) return null;

    const toX = (t) => Math.max(0, Math.min(100, ((t - wStart) / totalMin) * 100));

    // Build segments from band start/end events
    const events = new Set();
    bands.forEach(band => {
        const s = timeToMinutes(band.DEBUT);
        const e = timeToMinutes(band.FIN);
        if (s >= wStart && s <= wEnd) events.add(s);
        if (e >= wStart && e <= wEnd) events.add(e);
    });
    const sortedEvents = [...events].sort((a, b) => a - b);

    const rawSegments = [];
    for (let i = 0; i < sortedEvents.length - 1; i++) {
        const segStart = sortedEvents[i];
        const segEnd = sortedEvents[i + 1];
        const mid = (segStart + segEnd) / 2;
        const active = bands.filter(b => {
            const s = timeToMinutes(b.DEBUT);
            const e = timeToMinutes(b.FIN);
            return s <= mid && e > mid;
        });
        if (active.length > 0) {
            rawSegments.push({ start: segStart, end: segEnd, bands: active });
        }
    }

    // Fix false gaps: if a single-band segment is sandwiched between multi-band
    // (conflict) segments and is short (< 15 min), treat it as a gap within the conflict.
    // Rebuild the band list using the ordering from the surrounding conflict so each
    // band keeps its vertical position, and missing bands appear as black (gap) rows.
    const segments = rawSegments.map((seg, i) => {
        if (seg.bands.length > 1) return seg;
        const duration = seg.end - seg.start;
        if (duration >= 15) return seg;

        const prev = i > 0 ? rawSegments[i - 1] : null;
        const next = i < rawSegments.length - 1 ? rawSegments[i + 1] : null;
        const prevConflict = prev && prev.bands.length > 1;
        const nextConflict = next && next.bands.length > 1;

        if (prevConflict || nextConflict) {
            // Use the ordering from the reference conflict (prefer prev, fallback next)
            const refConflict = prevConflict ? prev : next;
            const currentBandIds = new Set(seg.bands.map(b => b.id));

            // Rebuild in the same order as the reference conflict
            const reorderedBands = refConflict.bands.map(refBand => {
                if (currentBandIds.has(refBand.id)) {
                    return seg.bands.find(b => b.id === refBand.id);
                }
                return { id: refBand.id, SCENE: '__GAP__', GROUPE: '' };
            });

            // If we added gap rows, use the reordered list
            if (reorderedBands.length > seg.bands.length) {
                return { ...seg, bands: reorderedBands };
            }
        }
        return seg;
    });

    return (
        <div className="mini-timeline-wrapper">
            <div className="mini-timeline-hours">
                <span className="mini-timeline-hour">{win.start.replace(':', 'h')}</span>
                <span className="mini-timeline-hour">{win.end.replace(':', 'h')}</span>
            </div>
            <div className="mini-timeline-container">
                <svg className="mini-timeline-svg" viewBox="0 0 100 20" preserveAspectRatio="none">
                    {segments.map((seg, i) => {
                        const x = toX(seg.start);
                        const w = toX(seg.end) - x;
                        const n = seg.bands.length;
                        const h = 20 / n;
                        return seg.bands.map((band, j) => {
                            if (band.SCENE === '__GAP__') {
                                // Black gap row
                                return (
                                    <rect key={`${i}-${j}`}
                                        x={`${x}%`} y={j * h}
                                        width={`${Math.max(w, 0.3)}%`} height={h}
                                        fill="#111" opacity="0.9" />
                                );
                            }
                            const config = STAGE_CONFIG[band.SCENE?.toUpperCase()];
                            const color = config?.themeColor || '#666';
                            return (
                                <rect key={`${i}-${j}`}
                                    x={`${x}%`} y={j * h}
                                    width={`${Math.max(w, 0.3)}%`} height={h}
                                    fill={color} opacity="0.8" />
                            );
                        });
                    })}
                </svg>
            </div>
        </div>
    );
};

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
    const [expandedSections, setExpandedSections] = useState({});
    const [tabKey, setTabKey] = useState(0);
    const [gaugeHeight, setGaugeHeight] = useState(0);
    const [animatedTotal, setAnimatedTotal] = useState(0);

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

        // C1: Recommendations — bands tagged by friends but NOT by me
        const recommendations = Object.entries(bandCounts)
            .filter(([bandId, count]) => count >= 1 && !myBandIds.has(bandId))
            .sort(([idA, countA], [idB, countB]) => {
                // Sort by interest score first (must_see > interested > curious)
                const scoreA = bandInterestScores[idA] || 0;
                const scoreB = bandInterestScores[idB] || 0;
                if (scoreB !== scoreA) return scoreB - scoreA;
                return countB - countA;
            })
            .slice(0, 10)
            .map(([bandId, count]) => {
                const group = groupMap[bandId];
                const taggedBy = [];
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

        return {
            members,
            totalBands: allCircleBandIds.size,
            commonBands,
            topBands,
            compatibility,
            calcStats: circleCalcStats,
            totalMembers: members.length + 1, // +1 for me
            recommendations,
        };
    }, [activeTab, groups, effectiveState.taggedBands, user, circleMembersMap, memberCircleId, visibleCircleIds]);

    const toggleDay = (day) => {
        setExpandedDays(prev => ({ ...prev, [day]: !prev[day] }));
    };

    const circleName = activeTab === 'my_circle'
        ? circles.find(c => c.id === memberCircleId)?.name || 'Mon cercle'
        : 'Mes cercles';

    return (
        <div className="stats-panel-overlay" onClick={onClose}>
            <div className="stats-panel-container" onClick={e => e.stopPropagation()}>
                <div className="stats-panel-header">
                    <div className="stats-panel-actions">
                        <button onClick={onClose} className="stats-close-btn">
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                        <h2 className="stats-panel-title" style={{ margin: 0 }}>Stats</h2>
                    </div>

                    {/* Tabs */}
                    <div className="stats-tabs">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                className={`stats-tab ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => { setActiveTab(tab.id); setExpandedDays({}); setTabKey(k => k + 1); }}
                            >
                                <i className={tab.icon} style={{ marginRight: '5px', fontSize: '0.7rem' }}></i>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* D6: Single keyed wrapper to force remount + animation on tab change */}
                <div className="stats-tab-content" key={`tab-${tabKey}`}>

                {/* === TAB: MOI === */}
                {activeTab === 'me' && (
                    <>
                        {(() => {
                            const myBands = groups?.filter(g => effectiveState.taggedBands?.[g.id]?.interest) || [];
                            const topGenres = getTopGenres(myBands, effectiveState.taggedBands, 8);
                            return (
                                <div className="stats-panel-rank-widget">
                                    {/* LEFT: Count */}
                                    <div className="stats-panel-rank-info">
                                        <div className="stats-main-counter">
                                            <span className="stats-count-val">{animatedTotal}</span>
                                            <span className="stats-count-label">Groupes prévus</span>
                                        </div>
                                    </div>
                                    {/* RIGHT: Gauge */}
                                    <div className="stats-panel-right-column">
                                        <CircularGauge percentage={gaugeHeight} rank={stats.rank} favStage={null} />
                                    </div>
                                    {/* BOTTOM: Charts row spanning full width */}
                                    <ChartsRow genres={topGenres} stats={stats} />
                                </div>
                            );
                        })()}

                        <div className="stats-panel-section-title section-title-colored" style={{ color: '#F4A261' }}>
                            <i className="fa-solid fa-calendar-days" style={{ marginRight: '6px' }}></i>
                            MES STATS PAR JOUR
                        </div>
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

                                            {/* D3: Mini timeline — above stage logos */}
                                            {(() => {
                                                const dayBands = groups?.filter(g => g.DAY === day && effectiveState.taggedBands?.[g.id]?.interest) || [];
                                                return <MiniTimeline day={day} bands={dayBands} />;
                                            })()}

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

                                            {/* D4: Genre chips */}
                                            {(() => {
                                                const dayBands = groups?.filter(g => g.DAY === day && effectiveState.taggedBands?.[g.id]?.interest) || [];
                                                const dayGenres = getTopGenres(dayBands, effectiveState.taggedBands, 4);
                                                return dayGenres.length > 0 ? <GenreChips genres={dayGenres} daily /> : null;
                                            })()}
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
                                {/* Overview widget — same grid layout as Moi */}
                                {(() => {
                                    const mergedTaggedBands = {};
                                    Object.entries(effectiveState.taggedBands || {}).forEach(([id, v]) => {
                                        if (v.interest) mergedTaggedBands[id] = { interest: v.interest };
                                    });
                                    if (circleStats.members) {
                                        const ip = { must_see: 3, interested: 2, curious: 1 };
                                        circleStats.members.forEach(m => {
                                            Object.entries(m.taggedBands || {}).forEach(([id, v]) => {
                                                if (!v.interest) return;
                                                const existing = mergedTaggedBands[id];
                                                if (!existing || (ip[v.interest] || 0) > (ip[existing.interest] || 0)) {
                                                    mergedTaggedBands[id] = { interest: v.interest };
                                                }
                                            });
                                        });
                                    }
                                    const allCircleBands = groups?.filter(g => mergedTaggedBands[g.id]?.interest) || [];
                                    const circleGenres = getTopGenres(allCircleBands, mergedTaggedBands, 8);
                                    return (
                                        <div className="stats-panel-rank-widget">
                                            {/* LEFT: Count */}
                                            <div className="stats-panel-rank-info">
                                                <div className="stats-main-counter">
                                                    <span className="stats-count-val">{circleStats.totalBands}</span>
                                                    <span className="stats-count-label">Groupes suivis</span>
                                                </div>
                                            </div>
                                            {/* RIGHT: Circle summary */}
                                            <div className="stats-panel-right-column">
                                                <div className="circle-summary-box">
                                                    <div className="circle-stat-item">
                                                        <span className="circle-stat-val" style={{ color: '#4CAF50' }}>{circleStats.commonBands}</span>
                                                        <span className="circle-stat-label">En commun</span>
                                                    </div>
                                                    <div className="circle-stat-item">
                                                        <span className="circle-stat-val" style={{ color: '#FFD700' }}>{circleStats.totalMembers}</span>
                                                        <span className="circle-stat-label">Membres</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* BOTTOM: Charts row spanning full width */}
                                            <ChartsRow genres={circleGenres} calcStats={circleStats.calcStats} />
                                        </div>
                                    );
                                })()}

                                {/* Compatibility */}
                                {circleStats.compatibility.length > 0 && (
                                    <>
                                        <div className="stats-panel-section-title section-title-colored" style={{ color: '#5DADE2' }}>
                                            <i className="fa-solid fa-handshake" style={{ marginRight: '6px' }}></i>
                                            COMPATIBILITÉ
                                        </div>
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
                                        <div className="stats-panel-section-title section-title-colored" style={{ color: '#F4A261' }}>
                                            <i className="fa-solid fa-calendar-days" style={{ marginRight: '6px' }}></i>
                                            STATS PAR JOUR
                                        </div>
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

                                                            {/* D3: Mini timeline for circle — above stage logos */}
                                                            {(() => {
                                                                const mergedTB = {};
                                                                Object.entries(effectiveState.taggedBands || {}).forEach(([id, v]) => {
                                                                    if (v.interest) mergedTB[id] = { interest: v.interest };
                                                                });
                                                                if (circleStats.members) {
                                                                    const ip = { must_see: 3, interested: 2, curious: 1 };
                                                                    circleStats.members.forEach(m => {
                                                                        Object.entries(m.taggedBands || {}).forEach(([id, v]) => {
                                                                            if (!v.interest) return;
                                                                            const existing = mergedTB[id];
                                                                            if (!existing || (ip[v.interest] || 0) > (ip[existing.interest] || 0)) {
                                                                                mergedTB[id] = { interest: v.interest };
                                                                            }
                                                                        });
                                                                    });
                                                                }
                                                                const dayBands = groups?.filter(g => g.DAY === day && mergedTB[g.id]?.interest) || [];
                                                                const dayGenres = getTopGenres(dayBands, mergedTB, 4);
                                                                return (
                                                                    <>
                                                                        <MiniTimeline day={day} bands={dayBands} />
                                                                    </>
                                                                );
                                                            })()}

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

                                                            {/* Genre chips after stage logos */}
                                                            {(() => {
                                                                const mergedTB2 = {};
                                                                Object.entries(effectiveState.taggedBands || {}).forEach(([id, v]) => {
                                                                    if (v.interest) mergedTB2[id] = { interest: v.interest };
                                                                });
                                                                if (circleStats.members) {
                                                                    const ip = { must_see: 3, interested: 2, curious: 1 };
                                                                    circleStats.members.forEach(m => {
                                                                        Object.entries(m.taggedBands || {}).forEach(([id, v]) => {
                                                                            if (!v.interest) return;
                                                                            const existing = mergedTB2[id];
                                                                            if (!existing || (ip[v.interest] || 0) > (ip[existing.interest] || 0)) {
                                                                                mergedTB2[id] = { interest: v.interest };
                                                                            }
                                                                        });
                                                                    });
                                                                }
                                                                const dayBands = groups?.filter(g => g.DAY === day && mergedTB2[g.id]?.interest) || [];
                                                                const dayGenres = getTopGenres(dayBands, mergedTB2, 4);
                                                                return dayGenres.length > 0 ? <GenreChips genres={dayGenres} daily /> : null;
                                                            })()}

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
                                {circleStats.topBands.length > 0 && (() => {
                                    const isExpanded = expandedSections.topBands;
                                    const visibleBands = isExpanded ? circleStats.topBands : circleStats.topBands.slice(0, 5);
                                    const hasMore = circleStats.topBands.length > 5;
                                    return (
                                    <>
                                        <div className="stats-panel-section-title section-title-colored" style={{ marginTop: '10px', color: '#5DADE2' }}>
                                            <i className="fa-solid fa-trophy" style={{ marginRight: '6px' }}></i>
                                            {activeTab === 'all_circles' ? 'TOP GROUPES DES CERCLES' : 'TOP GROUPES DU CERCLE'}
                                        </div>
                                        <div className={`stats-circle-top-bands ${!isExpanded && hasMore ? 'collapsed-list' : ''}`}>
                                            {visibleBands.map(band => {
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
                                                                    <img src={person.photoURL} alt="" referrerPolicy="no-referrer"
                                                                        className="stats-circle-avatar"
                                                                        style={{ borderColor: getInterestColor(person.interest) || '#888' }} />
                                                                ) : (
                                                                    <div className="stats-circle-avatar-fallback"
                                                                        style={{ borderColor: getInterestColor(person.interest) || '#888' }}>
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
                                        {hasMore && (
                                            <button className="expand-list-btn" onClick={() => setExpandedSections(s => ({ ...s, topBands: !s.topBands }))}>
                                                <i className={`fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-plus'}`}></i>
                                            </button>
                                        )}
                                    </>
                                    );
                                })()}

                                {/* C1: Recommendations */}
                                {circleStats.recommendations && circleStats.recommendations.length > 0 && (() => {
                                    const isExpanded = expandedSections.suggestions;
                                    const visibleBands = isExpanded ? circleStats.recommendations : circleStats.recommendations.slice(0, 5);
                                    const hasMore = circleStats.recommendations.length > 5;
                                    return (
                                    <>
                                        <div className="stats-panel-section-title section-title-colored" style={{ marginTop: '10px', color: '#4CAF50' }}>
                                            <i className="fa-solid fa-lightbulb" style={{ marginRight: '6px' }}></i>
                                            {activeTab === 'all_circles' ? 'SUGGESTIONS DE TES CERCLES' : 'SUGGESTIONS DE TON CERCLE'}
                                        </div>
                                        <div className={`stats-circle-top-bands ${!isExpanded && hasMore ? 'collapsed-list' : ''}`}>
                                            {visibleBands.map(band => {
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
                                                                        <img src={person.photoURL} alt="" referrerPolicy="no-referrer"
                                                                            className="stats-circle-avatar"
                                                                            style={{ borderColor: getInterestColor(person.interest) || '#888' }} />
                                                                    ) : (
                                                                        <div className="stats-circle-avatar-fallback"
                                                                            style={{ borderColor: getInterestColor(person.interest) || '#888' }}>
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
                                        {hasMore && (
                                            <button className="expand-list-btn" onClick={() => setExpandedSections(s => ({ ...s, suggestions: !s.suggestions }))}>
                                                <i className={`fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-plus'}`}></i>
                                            </button>
                                        )}
                                    </>
                                    );
                                })()}
                            </>
                        )}
                    </>
                )}

                </div>{/* end stats-tab-content keyed wrapper */}
            </div>
        </div>
    );
};

export default StatsPanel;
