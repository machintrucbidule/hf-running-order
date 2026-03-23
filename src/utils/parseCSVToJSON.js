
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

export function extractTimestamp(csvData) {
  try {
    const lines = csvData.split('\n');
    if (lines.length < 1) {
      throw new Error('CSV vide');
    }

    const firstLine = parseCSVLine(lines[0]);

    if (firstLine[0] === 'LASTMOD' && firstLine[1]) {
      return firstLine[1];
    }

    throw new Error('Format de timestamp invalide');
  } catch (error) {
    console.error('❌ Erreur extraction timestamp:', error);
    return null;
  }
}

export function validateCSVStructure(csvData) {
  try {
    const lines = csvData.split('\n').filter(line => line.trim());

    if (lines.length < 3) {
      throw new Error('CSV doit contenir au moins 3 lignes');
    }

    const firstLine = parseCSVLine(lines[0]);
    if (firstLine[0] !== 'LASTMOD') {
      throw new Error('Première ligne doit commencer par LASTMOD');
    }

    const headers = parseCSVLine(lines[1]);
    const requiredHeaders = ['id', 'GROUPE', 'DAY', 'SCENE'];

    for (const required of requiredHeaders) {
      if (!headers.includes(required)) {
        throw new Error(`En-tête manquant: ${required}`);
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Validation CSV échouée:', error);
    return false;
  }
}

export function parseCSVToJSON(csvData) {
  try {
    if (!validateCSVStructure(csvData)) {
      throw new Error('Structure CSV invalide');
    }

    const lines = csvData.split('\n').filter(line => line.trim());
    const headers = parseCSVLine(lines[1]);

    const jsonData = [];

    for (let i = 2; i < lines.length; i++) {
      const cells = parseCSVLine(lines[i]);

      if (cells.length < headers.length || !cells[0]) {
        continue;
      }

      const rowObject = {};

      for (let j = 0; j < headers.length; j++) {
        const header = headers[j];
        let value = cells[j] || '';

        if (header === 'id') {
          value = parseInt(value, 10) || 0;
        } else if (value === 'null' || value === '') {
          value = null;
        }

        rowObject[header] = value;
      }

      jsonData.push(rowObject);
    }

    return jsonData;

  } catch (error) {
    console.error('❌ Erreur lors du parsing CSV:', error);
    throw error;
  }
}

export function parseIncrementalCSV(csvData) {
  try {
    const lines = csvData.split('\n').filter(line => line.trim());
    if (lines.length < 3) return new Map();

    const firstLine = parseCSVLine(lines[0]);
    const headerLineIndex = firstLine[0] === 'LASTMOD' ? 1 : 0;
    const headers = parseCSVLine(lines[headerLineIndex]);

    const map = new Map();

    for (let i = headerLineIndex + 1; i < lines.length; i++) {
      const cells = parseCSVLine(lines[i]);
      if (!cells[0]) continue;

      const rowObject = {};
      for (let j = 0; j < headers.length; j++) {
        const header = headers[j];
        let value = cells[j] || '';
        if (header === 'id') {
          value = parseInt(value, 10) || 0;
        } else if (value === 'null' || value === '') {
          value = null;
        }
        rowObject[header] = value;
      }

      if (rowObject.id) {
        map.set(rowObject.id, rowObject);
      }
    }

    return map;
  } catch (error) {
    console.error('❌ Erreur parsing CSV incrémental:', error);
    return new Map();
  }
}

export function mergeLineupData(originalData, incrementalMap) {
  if (!incrementalMap || incrementalMap.size === 0) return originalData;

  return originalData.map(group => {
    const override = incrementalMap.get(group.id);
    if (!override) return group;

    const merged = { ...group };
    for (const [key, value] of Object.entries(override)) {
      if (key === 'id') continue;
      if (value !== null && value !== undefined && value !== '') {
        merged[key] = value;
      }
    }
    return merged;
  });
}

export async function fetchAndParseGoogleSheetsCSV(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const csvData = await response.text();
    const timestamp = extractTimestamp(csvData);
    const jsonData = parseCSVToJSON(csvData);

    return {
      data: jsonData,
      timestamp,
      lastUpdate: Date.now()
    };

  } catch (error) {
    console.error('❌ Erreur fetchAndParseGoogleSheetsCSV:', error);
    throw error;
  }
}