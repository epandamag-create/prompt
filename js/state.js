import { DEFAULT_PREFERENCES, SAVE_DEBOUNCE_MS } from './config/constants.js';
import { storageService } from './services/storage-service.js';
import { clearPromptCache } from './services/prompt-service.js';
import { buildSearchIndex } from './models/prompt.js';
import { renderAll } from './view/render.js';

/**
 * @typedef {Object} Preferences
 * @property {'dark'|'light'} theme
 * @property {'comfortable'|'compact'|'spacious'} density
 * @property {'grid'|'list'} viewMode
 * @property {boolean} sidebarCollapsed
 * @property {'newest'|'oldest'|'az'|'za'|'mostused'|'recentlyused'} sortBy
 */

/**
 * @typedef {Object} SidebarSections
 * @property {boolean} quickaccess
 * @property {boolean} categories
 * @property {boolean} collections
 * @property {boolean} tags
 */

/**
 * @typedef {Object} UIState
 * @property {Set<string>} openModals
 * @property {Set<string>} selectedPrompts
 * @property {number} tagSuggestionIndex
 * @property {Array<{id: string, message: string, type: string}>} activeToasts
 * @property {((...args: any[]) => void)|null} confirmCallback
 * @property {boolean} confirmModalOpen
 * @property {number} currentConfirmId
 * @property {Set<string>} openDropdowns
 */

/**
 * STATE_SCHEMA - Defines the expected shape of the application state
 * This provides type safety and documents the expected data structure
 */
export const STATE_SCHEMA = {
    /** @type {Array<import('./models/prompt.js').Prompt>} */
    prompts: Array,
    
    /** @type {Array<import('./models/collection.js').Collection>} */
    collections: Array,
    
    /** @type {Array<import('./models/category.js').Category>} */
    categories: Array,
    
    /** @type {string} Current view mode */
    currentView: String,
    
    /** @type {string[]} Currently selected collection IDs for filtering */
    currentCollections: Array,
    
    /** @type {string[]} Currently selected tag names for filtering */
    currentTags: Array,
    
    /** @type {string[]} Currently selected category IDs for filtering */
    currentCategories: Array,
    
    /** @type {string} Current search query */
    searchQuery: String,
    
    /** @type {string|null} ID of prompt currently being edited */
    editingPromptId: String,
    
    /** @type {string|null} ID of collection currently being edited */
    editingCollectionId: String,
    
    /** @type {string|null} ID of category currently being edited */
    editingCategoryId: String,
    
    /** @type {string|null} ID of prompt currently being used (with variables) */
    usingPromptId: String,
    
    /** @type {SidebarSections} Sidebar section visibility */
    sidebarSections: Object,
    
    /** @type {Preferences} User preferences */
    preferences: Object,
    
    /** @type {UIState} UI state */
    ui: Object
};

// ============================================
// DEFENSIVE UTILITY FUNCTIONS
// ============================================

/**
 * Safely get prompts array with defensive checks
 * @returns {Array<import('./models/prompt.js').Prompt>}
 */
export function getSafePrompts() {
    return Array.isArray(state.prompts) ? state.prompts : [];
}

/**
 * Safely get collections array with defensive checks
 * @returns {Array<import('./models/collection.js').Collection>}
 */
export function getSafeCollections() {
    return Array.isArray(state.collections) ? state.collections : [];
}

/**
 * Safely get categories array with defensive checks
 * @returns {Array<import('./models/category.js').Category>}
 */
export function getSafeCategories() {
    return Array.isArray(state.categories) ? state.categories : [];
}

/**
 * Safely get tags from all prompts with defensive checks
 * @returns {string[]}
 */
export function getSafeTags() {
    return getSafePrompts()
        .filter(p => Array.isArray(p?.tags))
        .flatMap(p => p.tags)
        .filter(t => typeof t === 'string');
}

/**
 * Get unique tags from all prompts
 * @returns {Set<string>}
 */
export function getUniqueTags() {
    return new Set(getSafeTags());
}

/**
 * Safely get tags for a specific prompt
 * @param {import('./models/prompt.js').Prompt} prompt
 * @returns {string[]}
 */
export function getPromptTags(prompt) {
    return Array.isArray(prompt?.tags) ? prompt.tags : [];
}

// ============================================
// STATE MANAGEMENT
// ============================================

// Private variables for state management
let saveTimeout = null;
let isInitialized = false;
export let stateVersion = 0;

/**
 * @typedef {Object} StateManager
 * @property {Function} save - Save state to localStorage
 * @property {Function} commit - Commit changes and re-render
 * @property {Function} getPrompt - Get prompt by ID
 * @property {Function} getCollection - Get collection by ID
 * @property {Function} getCategory - Get category by ID
 * @property {Function} addPrompt - Add new prompt
 * @property {Function} updatePrompt - Update prompt
 * @property {Function} deletePrompt - Delete prompt
 * @property {Function} addCollection - Add new collection
 * @property {Function} updateCollection - Update collection
 * @property {Function} deleteCollection - Delete collection
 * @property {Function} addCategory - Add new category
 * @property {Function} updateCategory - Update category
 * @property {Function} deleteCategory - Delete category
 * @property {Function} isInitialized - Check if initialized
 * @property {Function} setInitialized - Set initialized flag
 * @property {Function} loadFromStorage - Load state from localStorage
 */

/**
 * State Manager - Centralized state management
 * @type {StateManager}
 */
export const stateManager = {
    /**
     * Save state to IndexedDB (with debounce).
     * @param {boolean} immediate - Skip debounce and save right away
     */
    save(immediate = false) {
        clearTimeout(saveTimeout);

        const doSave = async () => {
            // NOTE: state.ui is intentionally excluded from persistence.
            // It contains purely ephemeral runtime state (open modals, active
            // toasts, selected prompts, dropdown state, hover tracking) that
            // must always start fresh on page load and must never be written
            // to IndexedDB or cross-tab sync messages.
            const data = {
                prompts: state.prompts,
                collections: state.collections,
                categories: state.categories,
                preferences: state.preferences,
                sidebarSections: state.sidebarSections
            };

            const result = await storageService.save(data);
            if (!result.success) {
                console.error('Error saving to IndexedDB:', result.error);
                window.dispatchEvent(new CustomEvent('app:toast', {
                    detail: { message: 'Failed to save data. Check console for errors.', type: 'error' }
                }));
            }
        };

        if (immediate) {
            doSave();
        } else {
            saveTimeout = setTimeout(doSave, SAVE_DEBOUNCE_MS);
        }
    },

    /**
     * Commit state changes - invalidate cache, save, and re-render
     * @param {Object} updates - Optional updates to pass to render
     */
    commit(updates = {}) {
        clearPromptCache();  // Invalidate cache when state changes
        stateManager.save();
        renderAll(updates);
    },

    /**
     * Get prompt by ID
     * @param {string} id - Prompt ID
     * @returns {import('./models/prompt.js').Prompt|undefined}
     */
    getPrompt(id) {
        return state.prompts.find(p => p.id === id);
    },

    /**
     * Get collection by ID
     * @param {string} id - Collection ID
     * @returns {import('./models/collection.js').Collection|undefined}
     */
    getCollection(id) {
        return state.collections.find(c => c.id === id);
    },

    /**
     * Get category by ID
     * @param {string} id - Category ID
     * @returns {import('./models/category.js').Category|undefined}
     */
    getCategory(id) {
        return state.categories.find(c => c.id === id);
    },

    /**
     * Add a new prompt to state
     * @param {import('./models/prompt.js').Prompt} prompt - Prompt to add
     * @param {number} [index] - Optional index to insert at (default: 0)
     */
    addPrompt(prompt, index = 0) {
        stateVersion++;
        if (index === 0) {
            state.prompts.unshift(prompt);
        } else {
            state.prompts.splice(index, 0, prompt);
        }
    },

    /**
     * Update an existing prompt
     * @param {string} id - Prompt ID
     * @param {Object} updates - Fields to update
     * @returns {boolean} Success
     */
    updatePrompt(id, updates) {
        const prompt = state.prompts.find(p => p.id === id);
        if (!prompt) return false;

        stateVersion++;
        Object.assign(prompt, updates);

        // Keep the cached search index in sync (e.g. after undo/redo restores
        // title/description/content/tags from a snapshot).
        prompt._searchIndex = buildSearchIndex(prompt);

        return true;
    },

    /**
     * Delete a prompt from state
     * @param {string} id - Prompt ID
     * @returns {Object|null} Deleted prompt data for undo, or null if not found
     */
    deletePrompt(id) {
        const idx = state.prompts.findIndex(p => p.id === id);
        if (idx === -1) return null;
        
        // Save neighbor IDs for undo positioning
        const prevPrompt = state.prompts[idx - 1];
        const nextPrompt = state.prompts[idx + 1];
        const neighbors = {
            prevId: prevPrompt?.id || null,
            nextId: nextPrompt?.id || null
        };
        
        const deleted = state.prompts[idx];
        state.prompts.splice(idx, 1);
        stateVersion++;
        
        return { prompt: deleted, neighbors };
    },

    /**
     * Restore a deleted prompt (for undo)
     * @param {Object} deleted - Deleted prompt data with neighbors
     */
    restorePrompt(deleted) {
        const { prompt, neighbors } = deleted;
        let restoreIndex;
        
        if (neighbors.nextId) {
            restoreIndex = state.prompts.findIndex(p => p.id === neighbors.nextId);
            if (restoreIndex === -1) restoreIndex = state.prompts.length;
        } else if (neighbors.prevId) {
            const prevIndex = state.prompts.findIndex(p => p.id === neighbors.prevId);
            restoreIndex = prevIndex !== -1 ? prevIndex + 1 : state.prompts.length;
        } else {
            restoreIndex = 0;
        }
        
        state.prompts.splice(restoreIndex, 0, prompt);
        stateVersion++;
    },

    /**
     * Add a new collection to state
     * @param {import('./models/collection.js').Collection} collection - Collection to add
     */
    addCollection(collection) {
        stateVersion++;
        state.collections.push(collection);
    },

    /**
     * Update an existing collection
     * @param {string} id - Collection ID
     * @param {Object} updates - Fields to update
     * @returns {boolean} Success
     */
    updateCollection(id, updates) {
        const collection = state.collections.find(c => c.id === id);
        if (!collection) return false;
        
        stateVersion++;
        Object.assign(collection, updates);
        return true;
    },

    /**
     * Delete a collection from state
     * @param {string} id - Collection ID
     * @returns {Array} IDs of affected prompts
     */
    deleteCollection(id) {
        // Clear collection reference from prompts
        const affectedPrompts = [];
        state.prompts.forEach(p => {
            if (p.collectionId === id) {
                p.collectionId = null;
                affectedPrompts.push(p.id);
            }
        });
        
        stateVersion++;
        state.collections = state.collections.filter(c => c.id !== id);
        state.currentCollections = state.currentCollections.filter(cid => cid !== id);
        
        return affectedPrompts;
    },

    /**
     * Add a new category to state
     * @param {import('./models/category.js').Category} category - Category to add
     */
    addCategory(category) {
        stateVersion++;
        state.categories.push(category);
    },

    /**
     * Update an existing category
     * @param {string} id - Category ID
     * @param {Object} updates - Fields to update
     * @returns {boolean} Success
     */
    updateCategory(id, updates) {
        const category = state.categories.find(c => c.id === id);
        if (!category) return false;
        
        stateVersion++;
        Object.assign(category, updates);
        return true;
    },

    /**
     * Increment the state version counter (for cache invalidation)
     */
    bumpVersion() {
        stateVersion++;
    },

    /**
     * Delete a category from state
     * @param {string} id - Category ID
     * @returns {Array} IDs of affected prompts
     */
    deleteCategory(id) {
        // Clear category reference from prompts
        const affectedPrompts = [];
        state.prompts.forEach(p => {
            if (p.categoryId === id) {
                p.categoryId = null;
                affectedPrompts.push(p.id);
            }
        });
        
        stateVersion++;
        state.categories = state.categories.filter(c => c.id !== id);
        state.currentCategories = state.currentCategories.filter(cid => cid !== id);
        
        return affectedPrompts;
    },

    /**
     * Check if app is initialized
     * @returns {boolean}
     */
    isInitialized() {
        return isInitialized;
    },

    /**
     * Set initialized flag
     * @param {boolean} value
     */
    setInitialized(value) {
        isInitialized = value;
    },

    /**
     * Load state from IndexedDB.
     * @returns {Promise<Object|null>}
     */
    async loadFromStorage() {
        return storageService.load();
    },

    /**
     * Reload state from IndexedDB (called on cross-tab sync signal).
     */
    async reloadFromTabSync() {
        const loadedData = await storageService.load();
        if (!loadedData) return;
        state.prompts = loadedData.prompts ?? [];
        state.collections = loadedData.collections ?? [];
        state.categories = loadedData.categories ?? [];
        state.preferences = { ...state.preferences, ...loadedData.preferences };
        state.sidebarSections = { ...state.sidebarSections, ...loadedData.sidebarSections };
        clearPromptCache();
        renderAll();
    }
};

export const state = {
    prompts: [],
    collections: [],
    categories: [],
    currentView: 'all',
    currentCollections: [],   // multi-select
    currentTags: [],          // multi-select
    currentCategories: [],    // multi-select
    searchQuery: '',
    editingPromptId: null,
    editingCollectionId: null,
    editingCategoryId: null,
    usingPromptId: null,
    sidebarSections: { quickaccess: true, categories: true, collections: true, tags: true },
    preferences: { ...DEFAULT_PREFERENCES }, 
    ui: { 
        // Modals state (instead of DOM .visible classes)
        openModals: new Set(),
        
        // Bulk selection (was global state.ui.selectedPrompts)
        selectedPrompts: new Set(),
        
        // Tag autocomplete (was global state.ui.tagSuggestionIndex)
        tagSuggestionIndex: -1,
        
        // Toast notifications (was global state.ui.activeToasts)
        activeToasts: [],
        
        // Confirm dialog (was global state.ui.confirmCallback/state.ui.confirmModalOpen)
        confirmCallback: null,
        confirmModalOpen: false,
        currentConfirmId: 0, // Track current confirm dialog ID for race condition prevention
        
        // Dropdown menus state (instead of DOM .open classes)
        openDropdowns: new Set(),

        // ID of prompt card currently hovered (for card hotkeys)
        hoveredCardId: null
    }
};
