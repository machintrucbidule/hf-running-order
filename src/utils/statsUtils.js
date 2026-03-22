
import { STAGE_CONFIG } from '../constants';

const DAILY_LIMITS = {
    'Jeudi': 10,
    'Vendredi': 18,
    'Samedi': 18,
    'Dimanche': 16
};

export const timeToMinutes = (timeStr) => {
    if (typeof timeStr !== 'string' || !timeStr) return 0;
    const [h, m] = timeStr.replace('h', ':').split(':').map(Number);
    let hours = h;
    if (hours < 10) hours += 24;
    return hours * 60 + (m || 0);
};

export const calculateStats = (lineup, taggedBands) => {
    const stats = {
        totalBands: 0,
        effectiveTotal: 0,
        totalMinutes: 0,
        days: {
            'Jeudi': { count: 0, minutes: 0, stages: {} },
            'Vendredi': { count: 0, minutes: 0, stages: {} },
            'Samedi': { count: 0, minutes: 0, stages: {} },
            'Dimanche': { count: 0, minutes: 0, stages: {} },
        },
        clashes: [],
    };

    if (!lineup || !taggedBands) return stats;

    const myBands = lineup.filter(group => {
        const interest = taggedBands[group.id]?.interest;
        return interest === 'must_see' || interest === 'interested' || interest === 'curious';
    });

    myBands.forEach(group => {
        stats.totalBands++;

        const start = timeToMinutes(group.DEBUT);
        const end = timeToMinutes(group.FIN);
        const duration = end - start;

        if (duration > 0) {
            stats.totalMinutes += duration;
            if (stats.days[group.DAY]) {
                stats.days[group.DAY].count++;
                stats.days[group.DAY].minutes += duration;

                let stageName = group.SCENE;
                if (stageName) {
                    const normalized = stageName.toUpperCase();
                    stats.days[group.DAY].stages[normalized] = (stats.days[group.DAY].stages[normalized] || 0) + 1;
                }
            }
        }
    });

    Object.entries(stats.days).forEach(([day, data]) => {
        const limit = DAILY_LIMITS[day] || 18;
        stats.effectiveTotal += Math.min(data.count, limit);
        data.intensity = Math.min(100, Math.round((data.count / limit) * 100));
    });

    const clashCandidates = myBands;

    const dayBuckets = {};
    clashCandidates.forEach(b => {
        if (!dayBuckets[b.DAY]) dayBuckets[b.DAY] = [];
        dayBuckets[b.DAY].push({
            ...b,
            _s: timeToMinutes(b.DEBUT),
            _e: timeToMinutes(b.FIN)
        });
    });

    stats.clashCounts = { 2: 0, 3: 0, 4: 0, 5: 0 };
    stats.clashesExtended = [];

    Object.entries(dayBuckets).forEach(([day, bands]) => {
        const timeline = new Map();

        bands.forEach(b => {
            for (let t = b._s; t < b._e; t++) {
                if (!timeline.has(t)) timeline.set(t, []);
                timeline.get(t).push(b);
            }
        });

        const sortedTimes = [...timeline.keys()].sort((a, b) => a - b);
        if (sortedTimes.length === 0) return;

        let currentLevel = 0;
        let segmentStart = -1;
        let currentBands = [];

        const commitSegment = (end) => {
            if (currentLevel >= 2) {
                const duration = end - segmentStart;
                if (duration >= 10) {
                    if (!stats.clashCounts[currentLevel]) stats.clashCounts[currentLevel] = 0;
                    stats.clashCounts[currentLevel]++;

                    stats.clashesExtended.push({
                        day,
                        startTime: segmentStart,
                        endTime: end,
                        level: currentLevel,
                        bands: [...new Set(currentBands)].sort((a, b) => a.GROUPE.localeCompare(b.GROUPE))
                    });
                }
            }
        };

        const minT = sortedTimes[0];
        const maxT = sortedTimes[sortedTimes.length - 1];

        for (let t = minT; t <= maxT + 1; t++) {
            const bandsAtT = timeline.get(t) || [];
            const level = bandsAtT.length;

            const sig = bandsAtT.map(b => b.id).sort().join(',');
            const currentSig = currentBands.map(b => b.id).sort().join(',');

            if (level !== currentLevel || sig !== currentSig) {
                commitSegment(t);

                currentLevel = level;
                currentBands = bandsAtT;
                segmentStart = t;
            }
        }
    });

    stats.clashes = [];

    const DAILY_WINDOWS = {
        'Jeudi': { start: '16:30', end: '02:05' },
        'Vendredi': { start: '10:30', end: '02:10' },
        'Samedi': { start: '10:30', end: '02:00' },
        'Dimanche': { start: '10:30', end: '00:30' }
    };

    Object.entries(stats.days).forEach(([day, data]) => {
        const window = DAILY_WINDOWS[day];
        if (!window) return;

        const windowStart = timeToMinutes(window.start);
        const windowEnd = timeToMinutes(window.end);
        const totalWindowMinutes = windowEnd - windowStart;

        const dailyBands = myBands.filter(b => b.DAY === day);
        if (dailyBands.length === 0) {
            stats.days[day].completionRate = 0;
            return;
        }

        const intervals = dailyBands.map(b => [timeToMinutes(b.DEBUT), timeToMinutes(b.FIN)]).sort((a, b) => a[0] - b[0]);
        let mergedIntervals = [];
        if (intervals.length > 0) {
            let [currStart, currEnd] = intervals[0];
            for (let i = 1; i < intervals.length; i++) {
                const [nextStart, nextEnd] = intervals[i];
                if (nextStart < currEnd) {
                    currEnd = Math.max(currEnd, nextEnd);
                } else {
                    mergedIntervals.push([currStart, currEnd]);
                    currStart = nextStart;
                    currEnd = nextEnd;
                }
            }
            mergedIntervals.push([currStart, currEnd]);
        }

        const occupiedMinutes = mergedIntervals.reduce((acc, [start, end]) => acc + (end - start), 0);

        const favCount = stats.days[day]?.count || 0;
        const dayClashes = stats.clashesExtended.filter(c => c.day === day).length;
        const transitionMalus = Math.max(0, (favCount - dayClashes) * 5);

        const freeMinutes = Math.max(0, totalWindowMinutes - occupiedMinutes - transitionMalus);

        const completionRate = Math.round(((totalWindowMinutes - freeMinutes) / totalWindowMinutes) * 100);

        console.log(`[Stats DEBUG Day] ${day}:`, {
            totalWindow: totalWindowMinutes,
            occupied: occupiedMinutes,
            transitions: transitionMalus,
            freeTime: freeMinutes,
            rate: completionRate
        });

        stats.days[day].completionRate = completionRate;

        stats.days[day].freeMinutes = freeMinutes;
    });

    const activeDays = Object.values(stats.days).filter(d => d.count > 0);
    if (activeDays.length > 0) {
        const totalCompletion = activeDays.reduce((sum, d) => sum + (d.completionRate || 0), 0);
        stats.averageCompletion = Math.round(totalCompletion / activeDays.length);
    } else {
        stats.averageCompletion = 0;
    }

    const history = { noms: new Set(), adjs: new Set(), univs: new Set() };
    Object.entries(stats.days).forEach(([day, data]) => {
        const dailyBands = myBands.filter(b => b.DAY === day);
        const persona = calculateDayPersona(dailyBands, taggedBands, history);

        if (persona.chosen) {
            history.noms.add(persona.chosen.nom);
            history.adjs.add(persona.chosen.adj);
            history.univs.add(persona.chosen.univ);
        }

        stats.days[day].persona = persona;
    });

    if (stats.averageCompletion < 30) stats.rank = "Touriste";
    else if (stats.averageCompletion < 60) stats.rank = "Amateur";
    else if (stats.averageCompletion < 90) stats.rank = "Hellbanger";
    else stats.rank = "Trve";

    stats.weeklyPersona = calculateDayPersona(myBands, taggedBands, history);

    return stats;
};

const STYLE_PERSONA = {
    "sludge": {
        "noms": ["Prophète"],
        "adjectifs": ["Sale"],
        "univers": ["du Bayou"]
    },
    "death": {
        "noms": ["Goule"],
        "adjectifs": ["Impitoyable"],
        "univers": ["du Chaos"]
    },
    "metalcore": {
        "noms": ["Adepte"],
        "adjectifs": ["Implacable"],
        "univers": ["des Temps Modernes"]
    },
    "nu": {
        "noms": ["Hybride"],
        "adjectifs": ["Instable"],
        "univers": ["de la Street"]
    },
    "heavy": {
        "noms": ["Sentinelle"],
        "adjectifs": ["Immuable"],
        "univers": ["de la Forteresse"]
    },
    "punk": {
        "noms": ["Punk"],
        "adjectifs": ["Irascible"],
        "univers": ["des bas-fonds"]
    },
    "hardcore": {
        "noms": ["Rebelle"],
        "adjectifs": ["Insoumis"],
        "univers": ["du Pit"]
    },
    "stoner": {
        "noms": ["Nomade"],
        "adjectifs": ["Cosmique"],
        "univers": ["du Désert"]
    },
    "post": {
        "noms": ["Prodige"],
        "adjectifs": ["Onirique"],
        "univers": ["d'Autres Dimensions"]
    },
    "rock": {
        "noms": ["Icône"],
        "adjectifs": ["Électrique"],
        "univers": ["des Salles Obscures"]
    },
    "black": {
        "noms": ["Ombre"],
        "adjectifs": ["Funeste"],
        "univers": ["de la Forêt Noire"]
    },
    "folk": {
        "noms": ["Barde"],
        "adjectifs": ["Antique"],
        "univers": ["des Tavernes"]
    },
    "indus": {
        "noms": ["Cyborg"],
        "adjectifs": ["Mécanique"],
        "univers": ["de l'Usine"]
    },
    "thrash": {
        "noms": ["Bête"],
        "adjectifs": ["Féroce"],
        "univers": ["de la Tempête"]
    },
    "power": {
        "noms": ["Légende"],
        "adjectifs": ["Épique"],
        "univers": ["de la Légende"]
    },
    "prog": {
        "noms": ["Visionnaire"],
        "adjectifs": ["Intello"],
        "univers": ["du Fractal Infini"]
    },
    "alternatif": {
        "noms": ["Guide"],
        "adjectifs": ["Libre"],
        "univers": ["des Horizons"]
    },
    "hard": {
        "noms": ["Star"],
        "adjectifs": ["Intrépide"],
        "univers": ["du Stade"]
    },
};

export const calculateDayPersona = (dayBands, taggedBands, history = null) => {
    if (!dayBands || dayBands.length === 0) return { title: "Simple Festivalier", testTitle: "Simple Festivalier", scores: {}, recipe: {} };

    const stageCounts = {};
    dayBands.forEach(b => {
        const s = (b.SCENE || "").toUpperCase();
        stageCounts[s] = (stageCounts[s] || 0) + 1;
    });

    const total = dayBands.length;
    const getS = (keys) => keys.reduce((sum, k) => sum + (stageCounts[k] || 0), 0);

    const ms = getS(['MAINSTAGE 1', 'MAINSTAGE 2']);
    const wz = getS(['WARZONE']);
    const vy = getS(['VALLEY']);
    const al = getS(['ALTAR']);
    const te = getS(['TEMPLE']);

    let priorityTitle = null;
    if (ms / total > 0.75) priorityTitle = "Campeur de Mainstage";
    else if (wz / total > 0.75) priorityTitle = "Squatteur de Warzone";
    else if (vy / total > 0.75) priorityTitle = "Ermite de la Valley";
    else if ((wz + vy) / total > 0.75) priorityTitle = "Marginal sympathique";
    else if (al / total > 0.75) priorityTitle = "Résident de l'Altar";
    else if (te / total > 0.75) priorityTitle = "Disciple du Temple";
    else if ((al + te) / total > 0.75) priorityTitle = "Adepte des Tentes";

    if (priorityTitle) {
        return {
            title: priorityTitle,
            testTitle: priorityTitle,
            scores: {},
            recipe: { isPriority: true, name: priorityTitle }
        };
    }

    const scores = {};
    Object.keys(STYLE_PERSONA).forEach(key => scores[key] = 0);

    dayBands.forEach(band => {
        const styleLow = (band.STYLE || "").toLowerCase();
        const interest = taggedBands[band.id]?.interest;
        let weight = interest === 'must_see' ? 3 : interest === 'interested' ? 2 : interest === 'curious' ? 1 : 0;
        if (weight === 0) return;

        Object.keys(STYLE_PERSONA).forEach(keyword => {
            if (styleLow.includes(keyword)) {
                if (keyword === 'hard' && styleLow.includes('hardcore')) return;
                scores[keyword] += weight;
            }
        });
    });

    const topKeywords = Object.entries(scores)
        .filter(([, score]) => score > 0)
        .sort(([, a], [, b]) => b - a);

    if (topKeywords.length === 0) return { title: "Simple Festivalier", testTitle: "Simple Festivalier", scores: {}, recipe: {} };

    const k1 = topKeywords[0][0];
    const k2 = topKeywords.length >= 2 ? topKeywords[1][0] : k1;
    const k3 = topKeywords.length >= 3 ? topKeywords[2][0] : k2;

    const styles = [k1, k2, k3];

    const permutations = [
        [1, 2, 0],
        [0, 2, 1],
        [0, 1, 2],
        [2, 1, 0],
        [1, 0, 2],
        [2, 0, 1]
    ];

    let chosen = null;
    let bestScore = 4;

    for (const p of permutations) {
        const candidate = {
            nom: STYLE_PERSONA[styles[p[0]]].noms[0],
            adj: STYLE_PERSONA[styles[p[1]]].adjectifs[0],
            univ: STYLE_PERSONA[styles[p[2]]].univers[0],
            formula: `${p[0] + 1}-${p[1] + 1}-${p[2] + 1}`
        };

        let dupeScore = 0;
        if (history) {
            if (history.noms.has(candidate.nom)) dupeScore++;
            if (history.adjs.has(candidate.adj)) dupeScore++;
            if (history.univs.has(candidate.univ)) dupeScore++;
        } else {
            dupeScore = 0;
        }

        if (dupeScore === 0) {
            chosen = candidate;
            bestScore = 0;
            break;
        }

        if (!chosen || dupeScore < bestScore) {
            chosen = candidate;
            bestScore = dupeScore;
        }
    }

    const testTitle = `${chosen.nom} ${chosen.adj} ${chosen.univ}`;

    return {
        title: testTitle,
        testTitle: testTitle,
        scores: Object.fromEntries(topKeywords),
        recipe: { nom: chosen.nom, adj: chosen.adj, univ: chosen.univ, formula: chosen.formula },
        chosen
    };
};

/**
 * Extract top genres from a list of bands, weighted by interest priority.
 * @param {Array} bands - lineup groups
 * @param {Object} taggedBands - { bandId: { interest } }
 * @param {number} limit - max genres to return
 * @returns {Array<{genre: string, count: number}>}
 */
export const getTopGenres = (bands, taggedBands, limit = 5) => {
    if (!bands || bands.length === 0) return [];

    const interestPriority = { must_see: 3, interested: 2, curious: 1 };
    const genreCounts = {};
    const genreMaxPriority = {};

    bands.forEach(band => {
        const interest = taggedBands?.[band.id]?.interest;
        if (!interest) return;
        const priority = interestPriority[interest] || 0;
        const style = band.STYLE || '';
        // Split on " / " or "/" to get individual genres
        const genres = style.split(/\s*\/\s*/).map(g => g.trim()).filter(Boolean);
        genres.forEach(genre => {
            // Capitalize first letter
            const normalized = genre.charAt(0).toUpperCase() + genre.slice(1);
            genreCounts[normalized] = (genreCounts[normalized] || 0) + 1;
            genreMaxPriority[normalized] = Math.max(genreMaxPriority[normalized] || 0, priority);
        });
    });

    return Object.entries(genreCounts)
        .sort(([genreA, countA], [genreB, countB]) => {
            if (countB !== countA) return countB - countA;
            // Tie-break by highest priority band in that genre
            return (genreMaxPriority[genreB] || 0) - (genreMaxPriority[genreA] || 0);
        })
        .slice(0, limit)
        .map(([genre, count]) => ({ genre, count }));
};

/**
 * Get the favorite stage from stats (most bands across all days).
 * @param {Object} stats - stats object from calculateStats
 * @returns {{ stage: string, count: number, percentage: number } | null}
 */
export const getFavoriteStage = (stats) => {
    if (!stats || !stats.days) return null;
    const totalStages = {};
    Object.values(stats.days).forEach(dayData => {
        Object.entries(dayData.stages || {}).forEach(([stage, count]) => {
            totalStages[stage] = (totalStages[stage] || 0) + count;
        });
    });
    const entries = Object.entries(totalStages);
    if (entries.length === 0) return null;
    entries.sort(([, a], [, b]) => b - a);
    const [stage, count] = entries[0];
    const total = entries.reduce((sum, [, c]) => sum + c, 0);
    return { stage, count, percentage: Math.round((count / total) * 100) };
};

/**
 * Calculate genre diversity score using Shannon entropy (normalized 0-100).
 * @param {Array} bands - lineup groups
 * @param {Object} taggedBands - { bandId: { interest } }
 * @returns {{ score: number, label: string }}
 */
export const getDiversityScore = (bands, taggedBands) => {
    if (!bands || bands.length === 0) return { score: 0, label: 'Puriste' };
    const genreCounts = {};
    let total = 0;
    bands.forEach(band => {
        const interest = taggedBands?.[band.id]?.interest;
        if (!interest) return;
        const genres = (band.STYLE || '').split(/\s*\/\s*/).map(g => g.trim()).filter(Boolean);
        genres.forEach(genre => {
            const normalized = genre.charAt(0).toUpperCase() + genre.slice(1);
            genreCounts[normalized] = (genreCounts[normalized] || 0) + 1;
            total++;
        });
    });
    const entries = Object.values(genreCounts);
    if (entries.length <= 1) return { score: 0, label: 'Puriste' };
    // Shannon entropy
    let entropy = 0;
    entries.forEach(count => {
        const p = count / total;
        if (p > 0) entropy -= p * Math.log2(p);
    });
    const maxEntropy = Math.log2(entries.length);
    const normalized = maxEntropy > 0 ? Math.round((entropy / maxEntropy) * 100) : 0;
    let label = 'Puriste';
    if (normalized >= 70) label = 'Éclectique';
    else if (normalized >= 40) label = 'Équilibré';
    return { score: normalized, label };
};

export const getLevelTitle = (count) => {
    if (count === 0) return "Touriste";
    if (count < 10) return "Découvreur";
    if (count < 25) return "Amateur éclairé";
    if (count < 40) return "Marathonien";
    if (count < 60) return "Guerrier du Pit";
    return "Légende du Hellfest";
};
