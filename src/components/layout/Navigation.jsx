import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useCheckedState } from '../../context/CheckedStateContext';
import { DAYS } from '../../constants';

const Navigation = () => {
    const { state, setDay } = useCheckedState();
    const navRef = useRef(null);
    const [navWidth, setNavWidth] = useState(null);

    // Si sideScenes n'est pas activé, exclure le Mercredi
    const visibleDays = state.sideScenes
        ? DAYS
        : DAYS.filter(d => d !== 'Mercredi');

    const currentDayIndex = visibleDays.indexOf(state.day);

    // Si le jour actuel n'est pas dans les jours visibles (ex: Mercredi désactivé),
    // basculer automatiquement sur le Jeudi
    useEffect(() => {
        if (currentDayIndex === -1 && visibleDays.length > 0) {
            setDay(visibleDays[0]);
        }
    }, [state.sideScenes, currentDayIndex, visibleDays, setDay]);

    // Measure the actual occupied width of scene columns (not the container)
    const syncWidth = useCallback(() => {
        const columns = document.querySelectorAll('.compact-day > .scene-column');
        if (columns.length === 0) return;
        const first = columns[0].getBoundingClientRect();
        const last = columns[columns.length - 1].getBoundingClientRect();
        const totalWidth = last.right - first.left;
        if (totalWidth > 0) {
            setNavWidth(totalWidth);
        }
    }, []);

    useEffect(() => {
        const observer = new ResizeObserver(syncWidth);
        let timer = null;

        const attach = () => {
            const cols = document.querySelectorAll('.compact-day > .scene-column');
            if (cols.length > 0) {
                syncWidth();
                cols.forEach(col => observer.observe(col));
            } else {
                timer = setTimeout(attach, 50);
            }
        };

        attach();
        window.addEventListener('resize', syncWidth);
        return () => {
            if (timer) clearTimeout(timer);
            observer.disconnect();
            window.removeEventListener('resize', syncWidth);
        };
    }, [syncWidth, state.day]);

    return (
        <nav
            ref={navRef}
            className="day-nav"
            style={navWidth ? { width: navWidth, maxWidth: '100%' } : undefined}
        >
            {visibleDays.map((day) => (
                <button
                    key={day}
                    className={`day-nav-btn ${state.day === day ? 'active' : ''}`}
                    onClick={() => setDay(day)}
                    style={{ fontFamily: 'Metal Mania' }}
                >
                    {day}
                </button>
            ))}
        </nav>
    );
};

export default Navigation;
