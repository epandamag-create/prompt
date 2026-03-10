import { state, stateManager } from '../state.js';
import { createCollectionModel } from '../models/collection.js';

export const collectionService = {
    /**
     * Get collection by ID
     */
    getById(id) {
        return state.collections.find(c => c.id === id) || null;
    },

    /**
     * Get all collections
     */
    getAll() {
        return [...state.collections];
    },

    /**
     * Create new collection
     */
    create(data) {
        const newCollection = createCollectionModel(data);
        state.collections.push(newCollection);
        return newCollection;
    },

    /**
     * Update collection
     */
    update(id, data) {
        const collection = state.collections.find(c => c.id === id);
        if (!collection) return null;
        
        Object.assign(collection, data);
        return collection;
    },

    /**
     * Delete collection and clear from prompts
     */
    delete(id) {
        return stateManager.deleteCollection(id);
    },

    // ============================================
    // UI METHODS
    // ============================================

    /**
     * Quick create collection from dropdown
     */
    quickCreate(name, color = '#3b82f6') {
        const collection = this.create({ name, color });
        stateManager.save();
        return collection;
    }
};
