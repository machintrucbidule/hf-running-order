import React, { useEffect } from 'react';
import { useCheckedState } from '../../context/CheckedStateContext';
import { DAYS } from '../../constants';

const Navigation = () => {
    const { state, setDay } = useCheckedState();

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

    const handleDayChange = (newIndex) => {
        if (newIndex >= 0 && newIndex < visibleDays.length) {
            setDay(visibleDays[newIndex]);
        }
    };

    return (
        <nav style={{ position: 'relative' }}>
            {currentDayIndex > 0 && (
                <button onClick={() => handleDayChange(currentDayIndex - 1)}>
                    <i className="fa-solid fa-chevron-left"></i>
                </button>
            )}
            <h1 style={{ fontFamily: 'Metal Mania' }}>{state.day}</h1>
            {currentDayIndex < visibleDays.length - 1 && (
                <button onClick={() => handleDayChange(currentDayIndex + 1)}>
                    <i className="fa-solid fa-chevron-right"></i>
                </button>
            )}
        </nav>
    );
};

export default Navigation;
