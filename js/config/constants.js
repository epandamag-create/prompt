export const COLORS = [
    '#3b82f6','#8b5cf6','#ec4899','#ef4444','#f59e0b',
    '#22c55e','#14b8a6','#06b6d4','#f97316','#64748b'
];

export const STORAGE_KEY = 'promptOrganizerData';
export const VARIABLE_VALUES_KEY = 'promptVariableValues';

// Timing constants (in milliseconds)
export const SAVE_DEBOUNCE_MS = 1000;
export const TOAST_DISPLAY_MS = 3000;
export const MODAL_FADE_MS = 200;

export const DEFAULT_PREFERENCES = {
    theme: 'dark',
    density: 'comfortable',
    viewMode: 'grid',
    sidebarCollapsed: false,
    sortBy: 'newest'
};

// Modal IDs
export const MODALS = {
    PROMPT: 'promptModal',
    COLLECTION: 'collectionModal',
    CATEGORY: 'categoryModal',
    USE_PROMPT: 'usePromptModal',
    IMPORT: 'importModal',
    BULK_MOVE: 'bulkMoveModal',
    CONFIRM: 'confirmModal'
};

// Modal priorities for getTopModal()
export const MODAL_PRIORITY = [
    'confirmModal', 'bulkMoveModal', 'usePromptModal', 'promptModal',
    'collectionModal', 'categoryModal', 'importModal'
];

// View modes
export const VIEWS = {
    ALL: 'all',
    FAVORITES: 'favorites',
    RECENT: 'recent',
    FILTERED: 'filtered'
};

// Sort options
export const SORT_OPTIONS = {
    NEWEST: 'newest',
    OLDEST: 'oldest',
    AZ: 'az',
    ZA: 'za',
    MOST_USED: 'mostused',
    RECENTLY_USED: 'recentlyused'
};

// Density options
export const DENSITY = {
    COMFORTABLE: 'comfortable',
    COMPACT: 'compact',
    SPACIOUS: 'spacious'
};
