export const STAGES = {
  MAINSTAGE_1: 'MAINSTAGE 1',
  MAINSTAGE_2: 'MAINSTAGE 2',
  WARZONE: 'WARZONE',
  VALLEY: 'VALLEY',
  ALTAR: 'ALTAR',
  TEMPLE: 'TEMPLE',
  HELLSTAGE: 'HELLSTAGE',
  METAL_CORNER: 'METAL_CORNER',
  PURPLE_HOUSE: 'PURPLE_HOUSE',
};

// Groupements pour l'agencement
export const STAGE_PAIRS = [
  { id: 'MS', stages: [STAGES.MAINSTAGE_1, STAGES.MAINSTAGE_2] },
  { id: 'WV', stages: [STAGES.WARZONE, STAGES.VALLEY] },
  { id: 'AT', stages: [STAGES.ALTAR, STAGES.TEMPLE] },
];

export const STAGE_CONFIG = {
  [STAGES.MAINSTAGE_1]: {
    name: 'Mainstage 1',
    icon: `${import.meta.env.BASE_URL}icons/icon_mainstage_1.png`,
    slug: 'mainstage1',
    themeColor: '#0055a5',
    bandColor: '#9eaad3'
  },
  [STAGES.MAINSTAGE_2]: {
    name: 'Mainstage 2',
    icon: `${import.meta.env.BASE_URL}icons/icon_mainstage_2.png`,
    slug: 'mainstage2',
    themeColor: '#a6a19b',
    bandColor: '#d4d2cf'
  },
  [STAGES.WARZONE]: {
    name: 'Warzone',
    icon: `${import.meta.env.BASE_URL}icons/icon_warzone.png`,
    slug: 'warzone',
    themeColor: '#949b1a',
    bandColor: '#cecb93'
  },
  [STAGES.VALLEY]: {
    name: 'Valley',
    icon: `${import.meta.env.BASE_URL}icons/icon_valley.png`,
    slug: 'valley',
    themeColor: '#ce7c19',
    bandColor: '#eabe97'
  },
  [STAGES.ALTAR]: {
    name: 'Altar',
    icon: `${import.meta.env.BASE_URL}icons/icon_altar.png`,
    slug: 'altar',
    themeColor: '#dc2829',
    bandColor: '#f19e9e'
  },
  [STAGES.TEMPLE]: {
    name: 'Temple',
    icon: `${import.meta.env.BASE_URL}icons/icon_temple.png`,
    slug: 'temple',
    themeColor: '#93a7b0',
    bandColor: '#cbd4d8'
  },
  [STAGES.HELLSTAGE]: {
    name: 'Hellstage',
    icon: `${import.meta.env.BASE_URL}icons/hellStage.png`,
    slug: 'hellstage',
    themeColor: '#239c60',
    bandColor: '#a0d8b7'
  },
  [STAGES.METAL_CORNER]: {
    name: 'Metal Corner',
    icon: `${import.meta.env.BASE_URL}icons/metalCorner.png`,
    slug: 'metal_corner',
    themeColor: '#9f9c78',
    bandColor: '#d0cfae'
  },
  [STAGES.PURPLE_HOUSE]: {
    name: 'Purple House',
    icon: `${import.meta.env.BASE_URL}icons/purple.png`,
    slug: 'purple_house',
    themeColor: '#9500c6',
    bandColor: '#d6b2e0'
  },
};

export const MAIN_STAGES = [
  STAGES.MAINSTAGE_1,
  STAGES.MAINSTAGE_2,
  STAGES.WARZONE,
  STAGES.VALLEY,
  STAGES.ALTAR,
  STAGES.TEMPLE,
];

export const SIDE_STAGES = [
  STAGES.HELLSTAGE,
  STAGES.PURPLE_HOUSE,
  STAGES.METAL_CORNER,
];

export const DAYS = ['Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export const DEFAULT_COLORS = {
  color1: "#FFEC61",
  color2: "#8AFF61",
  color3: "#61D6FF",
};

// ============================================
// SYSTÈME DE TAGS À 2 DIMENSIONS
// ============================================

// Dimension 1 : Niveau d'intérêt (exclusif, 0-3 étoiles)
export const INTEREST_LEVELS = {
  must_see: {
    id: 'must_see',
    label: 'Incontournable',
    stars: 3,
    defaultColor: '#D13440', // Rouge vif
    sentiment: 'very_positive',
  },
  interested: {
    id: 'interested',
    label: 'Intéressé',
    stars: 2,
    defaultColor: '#E5841B', // Orange
    sentiment: 'positive',
  },
  curious: {
    id: 'curious',
    label: 'Curieux',
    stars: 1,
    defaultColor: '#4E90BD', // Bleu ciel
    sentiment: 'neutral_positive',
  },
};

export const INTEREST_ORDER = ['must_see', 'interested', 'curious'];

// Dimension 2 : Contexte (optionnel, cumulable avec l'intérêt)
export const CONTEXT_TAGS = {
  with_friend: {
    id: 'with_friend',
    label: 'Pour un ami',
    icon: '👥',
    description: 'J\'accompagne quelqu\'un',
  },
  strategic: {
    id: 'strategic',
    label: 'Stratégique',
    icon: '📍',
    description: 'Placement / repos / logistique',
  },
  skip: {
    id: 'skip',
    label: 'À éviter',
    icon: '❌',
    description: 'Je préfère ne pas y aller',
  },
};

export const CONTEXT_ORDER = ['with_friend', 'strategic', 'skip'];

export const GOOGLE_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTmGfmaVsqb8_2Ivh5DHxqjhcMnQJb7Tu98XAGaet45tdmA8k9CRpZVNeHGV4PUzyOg97u3PYUQO5Zc/pub?gid=1801148757&single=true&output=csv';

export const GOOGLE_SHEETS_INCREMENTAL_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQt3BsIJIaQvO3hHOg_JPcX9C-4vRs7fRzcCJ0cc6vBdYmX8yTooBUkdGk_7_snS6teS8nscrnpqlZ2/pub?gid=0&single=true&output=csv';
