/**
 * Storage Service - Centralized abstraction for all storage operations
 * Replaces direct imports from storage.js in individual services
 */
import { STORAGE_KEY, VARIABLE_VALUES_KEY } from '../config/constants.js';

// Default fallback structure for corrupted/missing data
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
     * Save data to localStorage
     * @param {Object} data - Data to save
     * @returns {Object} - { success: boolean, sizeKB?: number, error?: Error }
     */
    save(data) {
        try {
            const dataStr = JSON.stringify(data);
            const sizeInKB = dataStr.length / 1024;
            const limitKB = 5120; // ~5MB
            
            if (limitKB > 0 && sizeInKB > limitKB * 0.8) {
                console.warn(`LocalStorage usage: ${sizeInKB.toFixed(2)}KB / ${limitKB}KB`);
            }
            
            localStorage.setItem(STORAGE_KEY, dataStr);
            return { success: true, sizeKB: sizeInKB.toFixed(2) };
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
            return { success: false, error };
        }
    },

    /**
     * Load data from localStorage
     * @returns {Object|null} - Loaded data or null if empty
     */
    load() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) {
                return null;
            }
            
            const parsed = JSON.parse(stored);
            
            // Validate and merge with defaults to handle corrupted data
            return {
                prompts: Array.isArray(parsed.prompts) ? parsed.prompts : [],
                collections: Array.isArray(parsed.collections) ? parsed.collections : [],
                categories: Array.isArray(parsed.categories) ? parsed.categories : [],
                preferences: { ...DEFAULT_DATA.preferences, ...parsed.preferences },
                sidebarSections: { ...DEFAULT_DATA.sidebarSections, ...parsed.sidebarSections }
            };
        } catch (error) {
            console.error('Error loading from storage:', error);
            return DEFAULT_DATA;
        }
    },

    /**
     * Get storage usage info
     * @returns {Object} - { usedKB: number, totalKB: number, percentUsed: number }
     */
    getInfo() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            const usedKB = stored ? (stored.length / 1024) : 0;
            const totalKB = 5120; // ~5MB typical limit
            return {
                usedKB: parseFloat(usedKB.toFixed(2)),
                totalKB,
                percentUsed: parseFloat(((usedKB / totalKB) * 100).toFixed(1))
            };
        } catch (error) {
            return { usedKB: 0, totalKB: 5120, percentUsed: 0 };
        }
    },

    /**
     * Clear all app data
     */
    clear() {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(VARIABLE_VALUES_KEY);
    },

    /**
     * Export data as JSON string
     * @returns {string} - JSON string of all data
     */
    exportAsJson() {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored || JSON.stringify(DEFAULT_DATA);
    },

    /**
     * Import data from JSON string
     * @param {string} jsonString - JSON string to import
     * @returns {boolean} - Success status
     */
    importFromJson(jsonString) {
        try {
            JSON.parse(jsonString); // Validate
            localStorage.setItem(STORAGE_KEY, jsonString);
            return true;
        } catch (error) {
            console.error('Invalid JSON for import:', error);
            return false;
        }
    },

    /**
     * Save variable values (separate from main data)
     * @param {Object} values - Variable values to save
     */
    saveVariableValues(values) {
        try {
            localStorage.setItem(VARIABLE_VALUES_KEY, JSON.stringify(values));
        } catch (error) {
            console.error('Failed to save variable values:', error);
        }
    },

    /**
     * Load variable values
     * @returns {Object} - Saved variable values
     */
    loadVariableValues() {
        try {
            const stored = localStorage.getItem(VARIABLE_VALUES_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            return {};
        }
    },

    /**
     * Clear variable values for a specific prompt
     * @param {string} promptId - ID of the prompt
     */
    clearVariableValues(promptId) {
        try {
            const stored = localStorage.getItem(VARIABLE_VALUES_KEY);
            const values = stored ? JSON.parse(stored) : {};
            delete values[promptId];
            localStorage.setItem(VARIABLE_VALUES_KEY, JSON.stringify(values));
        } catch (error) {
            console.error('Failed to clear variable values:', error);
        }
    }
};

export { DEFAULT_DATA };
