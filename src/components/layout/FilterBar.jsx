import React from 'react';

const FILTERS = [
    { id: 'all', label: 'Tous les groupes', icon: 'fa-music' },
    { id: 'mine', label: 'Mes groupes', icon: 'fa-heart' },
    { id: 'my_circle', label: 'Mon cercle', icon: 'fa-user-group' },
    { id: 'all_circles', label: 'Mes cercles', icon: 'fa-users' },
];

const FilterBar = ({ activeFilter, onFilterChange }) => {
    return (
        <div className="filter-bar">
            {FILTERS.map(f => (
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
    );
};

export default FilterBar;
