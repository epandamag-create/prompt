import { db } from './db.js';
import { VARIABLE_VALUES_KEY } from '../config/constants.js';

// Key for storing main app data in IndexedDB
const MAIN_KEY = 'main';

// localStorage keys (tiny, needed for sync signals and fast theme load)
const PREFS_KEY = 'promptOrganizerPrefs';

// Written on every save so other tabs receive a `storage` event and reload
// (IndexedDB changes don't trigger the `storage` event across tabs)
export const SYNC_KEY = 'promptOrganizerSync';

const DEFAULT_DATA = {
    prompts: [],
    collections: [],
    categories: [],
    preferences: {
        theme: 'dark',
        density: 'comfortable',
        viewMode: 'grid',
        sidebarCollapsed: false,
        sortBy: 'newest'
    },
    sidebarSections: {
        quickaccess: true,
        categories: true,
        collections: true,
        tags: true
    }
};

export const storageService = {
    /**
     * Save data to IndexedDB.
     * Also writes preferences to localStorage (for instant theme on page load)
     * and bumps a sync-signal key so other tabs pick up the change.
     * @param {Object} data
     * @returns {Promise<{success: boolean, error?: Error}>}
     */
    async save(data) {
        try {
            await db.keyval.put({ key: MAIN_KEY, value: data });

            // Preferences stay in localStorage for the inline theme-load script
            if (data.preferences) {
                try { localStorage.setItem(PREFS_KEY, JSON.stringify(data.preferences)); } catch (_) {}
            }

            // Trigger storage event in other tabs
            try { localStorage.setItem(SYNC_KEY, Date.now().toString()); } catch (_) {}

            return { success: true };
        } catch (error) {
            console.error('Failed to save to IndexedDB:', error);
            return { success: false, error };
        }
    },

    /**
     * Load data from IndexedDB.
     * @returns {Promise<Object|null>}
     */
    async load() {
        try {
            const entry = await db.keyval.get(MAIN_KEY);
            if (!entry) return null;
            const parsed = entry.value;
            return {
                prompts: Array.isArray(parsed.prompts) ? parsed.prompts : [],
                collections: Array.isArray(parsed.collections) ? parsed.collections : [],
                categories: Array.isArray(parsed.categories) ? parsed.categories : [],
                preferences: { ...DEFAULT_DATA.preferences, ...parsed.preferences },
                sidebarSections: { ...DEFAULT_DATA.sidebarSections, ...parsed.sidebarSections }
            };
        } catch (error) {
            console.error('Error loading from IndexedDB:', error);
            return null;
        }
    },

    /**
     * One-time migration from the old localStorage key to IndexedDB.
     * Only runs if IndexedDB is empty (first load after upgrade).
     * @returns {Promise<boolean>} true if migration happened
     */
    async migrateFromLocalStorage() {
        const existing = await db.keyval.get(MAIN_KEY);
        if (existing) return false; // Already migrated

        try {
            const stored = localStorage.getItem('promptOrganizerData');
            if (!stored) return false;

            const parsed = JSON.parse(stored);
            await db.keyval.put({ key: MAIN_KEY, value: parsed });

            // Migrate variable values
            const varStored = localStorage.getItem(VARIABLE_VALUES_KEY);
            if (varStored) {
                await db.keyval.put({ key: VARIABLE_VALUES_KEY, value: JSON.parse(varStored) });
                localStorage.removeItem(VARIABLE_VALUES_KEY);
            }

            localStorage.removeItem('promptOrganizerData');
            console.log('[storage] Migrated from localStorage to IndexedDB');
            return true;
        } catch (error) {
            console.error('[storage] Migration failed:', error);
            return false;
        }
    },

    /**
     * @returns {Promise<{usedKB: number, totalKB: number, percentUsed: number}>}
     */
    async getInfo() {
        try {
            const entry = await db.keyval.get(MAIN_KEY);
            const usedKB = entry ? JSON.stringify(entry.value).length / 1024 : 0;
            return {
                usedKB: parseFloat(usedKB.toFixed(2)),
                totalKB: 512 * 1024, // IndexedDB: ~500 MB typical
                percentUsed: 0       // Not meaningful for IndexedDB
            };
        } catch (_) {
            return { usedKB: 0, totalKB: 512 * 1024, percentUsed: 0 };
        }
    },

    /** @returns {Promise<void>} */
    async clear() {
        await db.keyval.clear();
        localStorage.removeItem(PREFS_KEY);
        localStorage.removeItem(SYNC_KEY);
    },

    // ─── Variable values ────────────────────────────────────────────────────

    async saveVariableValues(promptId, values) {
        try {
            const entry = await db.keyval.get(VARIABLE_VALUES_KEY);
            const all = entry ? entry.value : {};
            all[promptId] = values;
            await db.keyval.put({ key: VARIABLE_VALUES_KEY, value: all });
        } catch (error) {
            console.error('Failed to save variable values:', error);
        }
    },

    async loadVariableValues(promptId) {
        try {
            const entry = await db.keyval.get(VARIABLE_VALUES_KEY);
            const all = entry ? entry.value : {};
            return all[promptId] || {};
        } catch (_) {
            return {};
        }
    },

    async clearVariableValues(promptId) {
        try {
            const entry = await db.keyval.get(VARIABLE_VALUES_KEY);
            if (!entry) return;
            const all = entry.value;
            delete all[promptId];
            await db.keyval.put({ key: VARIABLE_VALUES_KEY, value: all });
        } catch (error) {
            console.error('Failed to clear variable values:', error);
        }
    }
};
