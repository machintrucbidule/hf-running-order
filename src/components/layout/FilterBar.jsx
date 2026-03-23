import React from 'react';
import { useFriends } from '../../context/FriendsContext';

const FILTERS = [
    { id: 'all', label: 'Tous les groupes', icon: 'fa-music' },
    { id: 'mine', label: 'Mes groupes', icon: 'fa-heart' },
    { id: 'my_circle', label: 'Mon cercle', icon: 'fa-user-group', needsCircle: true },
    { id: 'all_circles', label: 'Mes cercles', icon: 'fa-users', needsCircle: true },
];

const FilterBar = ({ activeFilter, onFilterChange, onOpenFilter, filterOpen }) => {
    const { visibleCircleIds } = useFriends();
    const hasCircles = visibleCircleIds && visibleCircleIds.size > 0;

    // Reset to 'all' if active filter requires circles but user has none
    React.useEffect(() => {
        if (!hasCircles && (activeFilter === 'my_circle' || activeFilter === 'all_circles')) {
            onFilterChange('all');
        }
    }, [hasCircles, activeFilter, onFilterChange]);

    return (
        <div className="filter-bar">
            <div className="filter-bar-pills">
                {FILTERS.filter(f => !f.needsCircle || hasCircles).map(f => (
                    <button
                        key={f.id}
                        className={`filter-pill ${activeFilter === f.id ? 'active' : ''}`}
                        onClick={() => onFilterChange(f.id)}
                    >
                        <i className={`fa-solid ${f.icon}`}></i>
                        <span>{f.label}</span>
                    </button>
                ))}
            </div>
            {onOpenFilter && (
                <button
                    className={`filter-pill filter-advanced-btn ${filterOpen ? 'active' : ''}`}
                    onClick={onOpenFilter}
                    title="Filtres des scènes"
                >
                    <i className="fa-solid fa-tent"></i>
                    <span>Scènes</span>
                </button>
            )}
        </div>
    );
};

export default FilterBar;
