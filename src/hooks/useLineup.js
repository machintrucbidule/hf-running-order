import { useState, useEffect, useCallback } from 'react';
import { fetchAndParseGoogleSheetsCSV, parseIncrementalCSV, mergeLineupData } from '../utils/parseCSVToJSON';
import { GOOGLE_SHEETS_URL, GOOGLE_SHEETS_INCREMENTAL_URL } from '../constants';

const CACHE_KEY = 'lineup-data';
const TIMESTAMP_KEY = 'lineup-timestamp';
const LINEUP_META_KEY = 'lineup-meta';
const FALLBACK_URL = `${import.meta.env.BASE_URL}lineup.json`;

function saveLineupMeta(meta) {
    try {
        const existing = JSON.parse(localStorage.getItem(LINEUP_META_KEY) || '{}');
        const updated = { ...existing, ...meta };
        localStorage.setItem(LINEUP_META_KEY, JSON.stringify(updated));
    } catch (e) { /* ignore */ }
}

export function getLineupMeta() {
    try {
        return JSON.parse(localStorage.getItem(LINEUP_META_KEY) || '{}');
    } catch (e) {
        return {};
    }
}

async function fetchIncrementalMap(cacheBuster) {
    try {
        let url = GOOGLE_SHEETS_INCREMENTAL_URL;
        if (cacheBuster) url += `&_cb=${cacheBuster}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const csvData = await response.text();
        return parseIncrementalCSV(csvData);
    } catch (err) {
        console.warn('⚠️ Fetch incrémental échoué, on continue sans:', err.message);
        return new Map();
    }
}

export const useLineup = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const checkForUpdates = useCallback(async () => {
        try {
            const cacheBuster = Date.now();
            const url = `${GOOGLE_SHEETS_URL}&_cb=${cacheBuster}`;

            const result = await fetchAndParseGoogleSheetsCSV(url);
            if (!result || !result.data) return;

            const incrementalMap = await fetchIncrementalMap(cacheBuster);
            const mergedData = mergeLineupData(result.data, incrementalMap);

            const cachedDataStr = localStorage.getItem(CACHE_KEY);
            const newDataStr = JSON.stringify(mergedData);

            if (cachedDataStr !== newDataStr) {
                console.log('🔄 Data content has changed, refreshing...');
                setData(mergedData);
                localStorage.setItem(CACHE_KEY, newDataStr);
                localStorage.setItem(TIMESTAMP_KEY, result.timestamp);
            }

            saveLineupMeta({
                lastRefresh: Date.now(),
                csvLastmod: result.timestamp,
                groupCount: mergedData.length,
                overrideCount: incrementalMap.size,
                source: 'google-sheets'
            });
        } catch (err) {
            console.warn('Background update check failed', err);
        }
    }, []);

    const loadData = useCallback(async (forceRefresh = false) => {
        try {
            if (forceRefresh) setRefreshing(true);

            const cachedData = localStorage.getItem(CACHE_KEY);
            const cachedTimestamp = localStorage.getItem(TIMESTAMP_KEY);

            if (cachedData && cachedTimestamp && !forceRefresh) {
                setData(JSON.parse(cachedData));
                setLoading(false);
            } else {
                const cacheBuster = forceRefresh ? Date.now() : null;
                let url = GOOGLE_SHEETS_URL;
                if (cacheBuster) url += `&_cb=${cacheBuster}`;

                try {
                    const result = await fetchAndParseGoogleSheetsCSV(url);
                    const incrementalMap = await fetchIncrementalMap(cacheBuster);
                    const mergedData = mergeLineupData(result.data, incrementalMap);

                    setData(mergedData);
                    localStorage.setItem(CACHE_KEY, JSON.stringify(mergedData));
                    localStorage.setItem(TIMESTAMP_KEY, result.timestamp);

                    saveLineupMeta({
                        lastRefresh: Date.now(),
                        csvLastmod: result.timestamp,
                        groupCount: mergedData.length,
                        overrideCount: incrementalMap.size,
                        source: 'google-sheets'
                    });
                } catch (fetchErr) {
                    console.warn('Google Sheets fetch failed, falling back to local JSON', fetchErr);
                    const response = await fetch(FALLBACK_URL);
                    const localData = await response.json();
                    setData(localData);

                    saveLineupMeta({
                        lastRefresh: Date.now(),
                        groupCount: localData.length,
                        overrideCount: 0,
                        source: 'fallback'
                    });
                }
                setLoading(false);
            }
        } catch (err) {
            setError(err);
            setLoading(false);
        } finally {
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData().catch(console.error);
        const intervalId = setInterval(checkForUpdates, 60000);
        return () => clearInterval(intervalId);
    }, [loadData, checkForUpdates]);

    return {
        data,
        loading,
        error,
        refreshing,
        refresh: () => loadData(true)
    };
};
