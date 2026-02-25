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

export function saveToLocalStorage(data) {
    try {
        const dataStr = JSON.stringify(data);
        const sizeKB = (dataStr.length / 1024).toFixed(2);
        const limitKB = 5120; // ~5MB
        
        if (dataStr.length / 1024 > limitKB * 0.8) {
            console.warn(`LocalStorage usage: ${sizeKB}KB / ${limitKB}KB`);
        }
        
        localStorage.setItem(STORAGE_KEY, dataStr);
        return { success: true, sizeKB };
    } catch (error) {
        console.error('Failed to save to localStorage:', error);
        return { success: false, error };
    }
}

export function loadFromLocalStorage() {
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
        // Return defaults instead of null on parse error
        return DEFAULT_DATA;
    }
}

export function getStorageInfo() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            return { size: 0, sizeKB: '0.00', percentage: 0, prompts: 0 };
        }
        
        const sizeBytes = stored.length;
        const sizeKB = (sizeBytes / 1024).toFixed(2);
        const limitKB = 5120; 
        const percentage = ((sizeBytes / 1024 / limitKB) * 100).toFixed(1);
        
        let data = null;
        try {
            data = JSON.parse(stored);
        } catch {
            data = {};
        }
        
        const prompts = data?.prompts?.length || 0;
        
        return {
            size: sizeBytes,
            sizeKB,
            percentage,
            prompts,
            limit: limitKB,
            remaining: (limitKB - sizeBytes / 1024).toFixed(2)
        };
    } catch (error) {
        console.error('Error getting storage info:', error);
        return { size: 0, sizeKB: '0.00', percentage: 0, prompts: 0 };
    }
}

export function saveVariableValues(promptId, values) {
    try {
        let saved = {};
        try {
            const stored = localStorage.getItem(VARIABLE_VALUES_KEY);
            if (stored) {
                saved = JSON.parse(stored);
            }
        } catch {
            // Start fresh if corrupted
            saved = {};
        }
        
        saved[promptId] = values;
        localStorage.setItem(VARIABLE_VALUES_KEY, JSON.stringify(saved));
    } catch (error) {
        console.error('Error saving variable values:', error);
    }
}

export function loadVariableValues(promptId) {
    try {
        const stored = localStorage.getItem(VARIABLE_VALUES_KEY);
        if (!stored) {
            return {};
        }
        
        const saved = JSON.parse(stored);
        return saved[promptId] ?? {};
    } catch {
        return {};
    }
}

export function clearVariableValues(promptId) {
    try {
        let saved = {};
        try {
            const stored = localStorage.getItem(VARIABLE_VALUES_KEY);
            if (stored) {
                saved = JSON.parse(stored);
            }
        } catch {
            saved = {};
        }
        
        if (promptId) {
            delete saved[promptId];
        } else {
            saved = {};
        }
        
        localStorage.setItem(VARIABLE_VALUES_KEY, JSON.stringify(saved));
    } catch (error) {
        console.error('Error clearing variable values:', error);
    }
}

// Export default for easy reset
export { DEFAULT_DATA };
