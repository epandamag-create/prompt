import { state, stateManager } from '../state.js';

export const categoryService = {
    /**
     * Get category by ID
     */
    getById(id) {
        return state.categories.find(c => c.id === id) || null;
    },

    /**
     * Get all categories
     */
    getAll() {
        return [...state.categories];
    },

    // ============================================
    // UI METHODS - use stateManager for CRUD
    // ============================================
};
