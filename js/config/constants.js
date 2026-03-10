// Validation rules for import data
export const VALIDATION_RULES = {
    collection: {
        name: { minLength: 1, maxLength: 100 },
        id: { pattern: /^[a-zA-Z0-9_-]+$/, message: 'ID can only contain letters, numbers, underscores, and hyphens' },
        color: { pattern: /^#[0-9A-Fa-f]{6}$/, message: 'Invalid color format. Use hex format (e.g., #3b82f6)' },
    },
    category: {
        name: { minLength: 1, maxLength: 100 },
        id: { pattern: /^[a-zA-Z0-9_-]+$/, message: 'ID can only contain letters, numbers, underscores, and hyphens' },
        color: { pattern: /^#[0-9A-Fa-f]{6}$/, message: 'Invalid color format. Use hex format (e.g., #3b82f6)' },
    },
    prompt: {
        title: { minLength: 1, maxLength: 200 },
        content: { minLength: 1, maxLength: 50000 },
        description: { maxLength: 1000 },
        tags: { maxItems: 50, maxItemLength: 50 },
    },
};

// Import/Export limits
export const IMPORT_EXPORT_LIMITS = {
    MAX_PROMPTS_PER_IMPORT: 5000,
    MAX_TITLE_LENGTH: 200,
    MAX_DESCRIPTION_LENGTH: 500,
    MAX_COLLECTION_NAME_LENGTH: 50,
    MAX_CATEGORY_NAME_LENGTH: 50,
};

export const COLORS = [
    '#3b82f6','#8b5cf6','#ec4899','#ef4444','#f59e0b',
    '#22c55e','#14b8a6','#06b6d4','#f97316','#64748b'
];

export const STORAGE_KEY = 'promptOrganizerData';
export const VARIABLE_VALUES_KEY = 'promptVariableValues';

// Timing constants (in milliseconds)
export const SAVE_DEBOUNCE_MS = 1000;
export const TOAST_DISPLAY_MS = 3000;
export const SEARCH_DEBOUNCE_MS = 300;
export const MODAL_FADE_MS = 200;

// Pagination constants
export const PAGINATION_THRESHOLD = 50;  // Enable pagination at 50+ prompts
export const ITEMS_PER_PAGE = 50;

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
