import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

// Get current directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GOOGLE_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTmGfmaVsqb8_2Ivh5DHxqjhcMnQJb7Tu98XAGaet45tdmA8k9CRpZVNeHGV4PUzyOg97u3PYUQO5Zc/pub?gid=1801148757&single=true&output=csv';
const GOOGLE_SHEETS_INCREMENTAL_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQt3BsIJIaQvO3hHOg_JPcX9C-4vRs7fRzcCJ0cc6vBdYmX8yTooBUkdGk_7_snS6teS8nscrnpqlZ2/pub?gid=0&single=true&output=csv';
const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'lineup.json');

/**
 * Basic CSV Parser (mirrors browser logic)
 */
function parseCSVCell(cell) {
    if (!cell) return '';
    if (cell.startsWith('"') && cell.endsWith('"')) {
        return cell.slice(1, -1).replace(/""/g, '"');
    }
    return cell.trim();
}

function parseCSVLine(line) {
    const cells = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
                current += char;
            }
        } else if (char === ',' && !inQuotes) {
            cells.push(parseCSVCell(current));
            current = '';
        } else {
            current += char;
        }
    }
    cells.push(parseCSVCell(current));
    return cells;
}

async function sync() {
    console.log('🚀 Démarrage de la synchronisation du Lineup...');

    try {
        console.log('📥 Récupération des données depuis Google Sheets...');
        const response = await axios.get(GOOGLE_SHEETS_URL);
        const csvData = response.data;

        const lines = csvData.split('\n').filter(line => line.trim());
        if (lines.length < 3) {
            throw new Error('CSV trop court : vérifiez l\'URL Google Sheets.');
        }

        // Line 1: LASTMOD (ignorer)
        // Line 2: Headers
        const headers = parseCSVLine(lines[1]);

        // Line 3+: Data
        const jsonData = [];
        for (let i = 2; i < lines.length; i++) {
            const cells = parseCSVLine(lines[i]);
            if (cells.length < headers.length || !cells[0]) continue;

            const rowObject = {};
            for (let j = 0; j < headers.length; j++) {
                const header = headers[j];
                let value = cells[j] || '';
                if (header === 'id') value = parseInt(value, 10) || 0;
                else if (value === 'null' || value === '') value = null;
                rowObject[header] = value;
            }
            jsonData.push(rowObject);
        }

        console.log(`✅ ${jsonData.length} groupes récupérés depuis l'original.`);

        // Fetch incremental overrides
        try {
            console.log('📥 Récupération des données incrémentales...');
            const incrResponse = await axios.get(GOOGLE_SHEETS_INCREMENTAL_URL);
            const incrLines = incrResponse.data.split('\n').filter(line => line.trim());

            if (incrLines.length >= 3) {
                const firstLine = parseCSVLine(incrLines[0]);
                const headerLineIndex = firstLine[0] === 'LASTMOD' ? 1 : 0;
                const incrHeaders = parseCSVLine(incrLines[headerLineIndex]);

                const incrementalMap = new Map();
                for (let i = headerLineIndex + 1; i < incrLines.length; i++) {
                    const cells = parseCSVLine(incrLines[i]);
                    if (!cells[0]) continue;
                    const rowObject = {};
                    for (let j = 0; j < incrHeaders.length; j++) {
                        const header = incrHeaders[j];
                        let value = cells[j] || '';
                        if (header === 'id') value = parseInt(value, 10) || 0;
                        else if (value === 'null' || value === '') value = null;
                        rowObject[header] = value;
                    }
                    if (rowObject.id) incrementalMap.set(rowObject.id, rowObject);
                }

                let overrideCount = 0;
                for (const group of jsonData) {
                    const override = incrementalMap.get(group.id);
                    if (!override) continue;
                    for (const [key, value] of Object.entries(override)) {
                        if (key === 'id') continue;
                        if (value !== null && value !== undefined && value !== '') {
                            group[key] = value;
                        }
                    }
                    overrideCount++;
                }
                console.log(`✅ ${overrideCount} groupes mis à jour depuis l'incrémental.`);
            }
        } catch (incrErr) {
            console.warn('⚠️ Fetch incrémental échoué, on continue sans:', incrErr.message);
        }

        // Write to file
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(jsonData, null, 2));
        console.log(`💾 Fichier mis à jour avec succès : ${OUTPUT_FILE}`);
        console.log('🤘 Sync terminée !');

    } catch (error) {
        console.error('❌ Erreur lors de la synchronisation :', error.message);
        process.exit(1);
    }
}

sync();
