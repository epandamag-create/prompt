import { state, stateManager, stateVersion } from '../state.js';
import { VIEWS, SORT_OPTIONS } from '../config/constants.js';
import { createPromptModel, duplicatePromptModel, buildSearchIndex } from '../models/prompt.js';
import { extractVariables, copyToClipboard } from '../utils/helpers.js';
import { closeModal } from '../view/modal.js';
import { showToast } from '../view/ui.js';
import { getPromptFormData } from '../view/form.js';
import { historyService } from './history-service.js';

// Cache for memoization - invalidated when state changes
let cache = null;
let cacheKey = null;

// Tag cache for autocomplete - rebuilt only when prompts change
let tagCache = null;

/**
 * Compute cache key based on current state
 */
function computeCacheKey() {
    return `${stateVersion}|${state.currentView}|${state.searchQuery}|${state.preferences.sortBy}|${state.currentCollections.join(',')}|${state.currentCategories.join(',')}|${state.currentTags.join(',')}`;
}

/**
 * Get all unique tags from all prompts (cached)
 * @returns {Set<string>} Set of unique tags
 */
export function getAllTags() {
    if (tagCache === null) {
        tagCache = new Set();
        if (state.prompts && Array.isArray(state.prompts)) {
            state.prompts.forEach(p => {
                if (p.tags && Array.isArray(p.tags)) {
                    p.tags.forEach(t => tagCache.add(t));
                }
            });
        }
    }
    return tagCache;
}

function invalidateTagCache() {
    tagCache = null;
}

/**
 * Get filtered and sorted prompts with caching
 * @returns {Array} Filtered and sorted prompts
 */
export function getFilteredPrompts() {
    const currentKey = computeCacheKey();
    
    if (cache && cacheKey === currentKey) {
        return cache;
    }
    
    let prompts = [...(state.prompts || [])];

    if (state.currentView === VIEWS.FAVORITES) {
        prompts = prompts.filter(p => p.favorite);
    } else if (state.currentView === VIEWS.RECENT) {
        prompts = prompts
            .filter(p => p.lastUsed)
            .sort((a, b) => b.lastUsed - a.lastUsed)
            .slice(0, 20);
} else if (state.currentView === VIEWS.FILTERED) {
        prompts = prompts.filter(p => {
            if (state.currentCollections.length > 0 && !state.currentCollections.includes(p.collectionId)) {
                return false;
            }
            if (state.currentCategories.length > 0 && !state.currentCategories.includes(p.categoryId)) {
                return false;
            }
            if (state.currentTags.length > 0 && !p.tags?.some(t => state.currentTags.includes(t))) {
                return false;
            }
            return true;
        });
    }

    const categoryMap = new Map(state.categories.map(c => [c.id, c]));
    const collectionMap = new Map(state.collections.map(c => [c.id, c]));
    
    if (state.searchQuery) {
        const queryLower = state.searchQuery.toLowerCase();
        prompts = prompts.filter(p => {
            const cat = categoryMap.get(p.categoryId);
            const col = collectionMap.get(p.collectionId);
            const dynamicContext = ((cat?.name ?? '') + ' ' + (col?.name || '')).toLowerCase();
            const searchIndex = p._searchIndex ?? buildSearchIndex(p);
            return (searchIndex + ' ' + dynamicContext).includes(queryLower);
        });
    }

    if (state.currentView !== VIEWS.RECENT) {
        const sortBy = state.preferences.sortBy ?? SORT_OPTIONS.NEWEST;
        prompts.sort((a, b) => {
            switch (sortBy) {
                case SORT_OPTIONS.NEWEST:    return b.createdAt - a.createdAt;
                case SORT_OPTIONS.OLDEST:    return a.createdAt - b.createdAt;
                case SORT_OPTIONS.AZ:        return a.title.localeCompare(b.title);
                case SORT_OPTIONS.ZA:        return b.title.localeCompare(a.title);
                case SORT_OPTIONS.MOST_USED: return (b.usageCount ?? 0) - (a.usageCount ?? 0);
                case SORT_OPTIONS.RECENTLY_USED: 
                    if (!a.lastUsed && !b.lastUsed) return b.createdAt - a.createdAt;
                    if (!a.lastUsed) return 1;
                    if (!b.lastUsed) return -1;
                    return b.lastUsed - a.lastUsed;
                default:                     return b.createdAt - a.createdAt;
            }
        });
    }

    cache = prompts;
    cacheKey = currentKey;
    
    return prompts;
}

/**
 * Clear all caches
 */
export function clearPromptCache() {
    cache = null;
    cacheKey = null;
    invalidateTagCache();
}

/**
 * Render prompts with optional partial update
 * @param {boolean} onlyPrompts - Only render prompts, not full UI
 */
function renderPrompts(onlyPrompts = false) {
    import('../view/render.js').then(render => {
        if (onlyPrompts) {
            render.renderPrompts();
        } else {
            render.renderAll({ prompts: true });
        }
    });
}

/**
 * Clear cache, save, and re-render in one step
 * @param {boolean} onlyPrompts - Only render prompts, not full UI
 */
function commitAndRender(onlyPrompts = false) {
    clearPromptCache();
    stateManager.save();
    renderPrompts(onlyPrompts);
}

/**
 * Build an id→prompt Map for O(1) bulk lookups
 * @returns {Map<string, Object>}
 */
function getPromptMap() {
    return new Map(state.prompts.map(p => [p.id, p]));
}

/**
 * Prompt Service - CRUD operations and bulk actions for prompts
 * @module promptService
 */
export const promptService = {
    // ============================================
    // CRUD OPERATIONS
    // ============================================

    /**
     * Create a new prompt
     * @param {Object} formData - Prompt form data
     * @returns {Object} Created prompt
     */
    create(formData) {
        const newPrompt = createPromptModel(formData);
        stateManager.addPrompt(newPrompt, 0);
        return newPrompt;
    },

    /**
     * Update an existing prompt
     * @param {string} id - Prompt ID
     * @param {Object} formData - Updated form data
     * @returns {Object|null} Updated prompt or null
     */
    update(id, formData) {
        const prompt = state.prompts.find(p => p.id === id);
        if (!prompt) return null;

        Object.assign(prompt, {
            ...formData,
            variables: extractVariables(formData.content),
            updatedAt: Date.now()
        });

        return prompt;
    },

    /**
     * Delete a prompt
     * @param {string} id - Prompt ID
     * @returns {Object|null} Deleted prompt data or null
     */
    delete(id) {
        return stateManager.deletePrompt(id);
    },

    /**
     * Restore a deleted prompt
     * @param {Object} deleted - Deleted prompt data with neighbors
     */
    restore(deleted) {
        stateManager.restorePrompt(deleted);
    },

    /**
     * Duplicate a prompt
     * @param {string} id - Prompt ID to duplicate
     * @returns {Object|null} New clone or null
     */
    duplicate(id) {
        const original = state.prompts.find(p => p.id === id);
        if (!original) return null;
        
        const clone = duplicatePromptModel(original);
        const idx = state.prompts.findIndex(p => p.id === id);
        state.prompts.splice(idx + 1, 0, clone);
        
        return clone;
    },

    /**
     * Toggle favorite status
     * @param {string} id - Prompt ID
     * @returns {boolean|null} New favorite state or null
     */
    toggleFavorite(id) {
        const prompt = state.prompts.find(p => p.id === id);
        if (!prompt) return null;
        
        prompt.favorite = !prompt.favorite;
        prompt.updatedAt = Date.now();
        
        return prompt.favorite;
    },

    /**
     * Get prompt by ID
     * @param {string} id - Prompt ID
     * @returns {Object|null} Prompt or null
     */
    getById(id) {
        return state.prompts.find(p => p.id === id) || null;
    },

    // ============================================
    // BULK OPERATIONS (O(n) using Map)
    // ============================================

    /**
     * Bulk delete prompts - O(n)
     * @param {Set} ids - Set of prompt IDs
     * @returns {number} Count of deleted prompts
     */
    bulkDelete(ids) {
        const count = ids.size;
        state.prompts = state.prompts.filter(p => !ids.has(p.id));
        return count;
    },

    /**
     * Bulk toggle favorites - O(n) using Map
     * @param {Set} ids - Set of prompt IDs
     */
    bulkToggleFavorite(ids) {
        const promptMap = getPromptMap();
        
        ids.forEach(id => {
            const prompt = promptMap.get(id);
            if (prompt) {
                prompt.favorite = !prompt.favorite;
                prompt.updatedAt = Date.now();
            }
        });
    },

    /**
     * Bulk move to collection - O(n) using Map
     * @param {Set} ids - Set of prompt IDs
     * @param {string|null} collectionId - Collection ID
     */
    bulkMoveToCollection(ids, collectionId) {
        const promptMap = getPromptMap();
        
        ids.forEach(id => {
            const prompt = promptMap.get(id);
            if (prompt) {
                prompt.collectionId = collectionId;
            }
        });
    },

    // ============================================
    // UI METHODS
    // ============================================

    /**
     * Save prompt from form (create or update)
     */
    savePrompt() {
        const formData = getPromptFormData();
        const isEditing = !!state.editingPromptId;

        if (isEditing) {
            const id = state.editingPromptId;
            const before = { ...state.prompts.find(p => p.id === id) };
            this.update(id, formData);
            const after = { ...state.prompts.find(p => p.id === id) };
            historyService.push(
                () => { stateManager.updatePrompt(id, before); commitAndRender(); },
                () => { stateManager.updatePrompt(id, after); commitAndRender(); }
            );
        } else {
            const newPrompt = this.create(formData);
            const id = newPrompt.id;
            historyService.push(
                () => { stateManager.deletePrompt(id); commitAndRender(); },
                () => { stateManager.addPrompt(newPrompt, 0); commitAndRender(); }
            );
        }

        commitAndRender();

        closeModal('promptModal');
        showToast(isEditing ? 'Prompt updated!' : 'Prompt created!', 'success');
    },

    /**
     * Delete prompt with undo support
     * @param {string} id - Prompt ID
     */
    deletePrompt(id) {
        const deleted = this.delete(id);
        if (!deleted) return;

        historyService.push(
            () => { this.restore(deleted); commitAndRender(); showToast('Prompt restored!', 'success'); },
            () => { this.delete(deleted.prompt.id); commitAndRender(); }
        );

        commitAndRender();

        showToast('Prompt deleted', 'success', () => {
            this.restore(deleted);
            commitAndRender();
            showToast('Prompt restored!', 'success');
        });
    },

    /**
     * Clone/duplicate a prompt
     * @param {string} id - Prompt ID
     */
    clonePrompt(id) {
        const clone = this.duplicate(id);
        if (!clone) return;

        commitAndRender();
        showToast('Prompt duplicated!', 'success');
    },

    /**
     * Toggle favorite status
     * @param {string} id - Prompt ID
     */
    togglePromptFavorite(id) {
        const result = this.toggleFavorite(id);
        if (result === null) return;

        commitAndRender(true);
    },

    /**
     * Copy prompt to clipboard directly
     * @param {string} id - Prompt ID
     */
    copyPromptDirectly(id) {
        const prompt = state.prompts.find(p => p.id === id);
        if (!prompt) return;
        
        copyToClipboard(prompt.content).then(() => {
            prompt.usageCount++;
            prompt.lastUsed = Date.now();

            clearPromptCache();
            stateManager.save();

            showToast('Copied to clipboard!', 'success');
        }).catch(() => {
            showToast('Failed to copy to clipboard', 'error');
        });
    },

    /**
     * Bulk delete prompts with UI update
     * @param {Set} ids - Set of prompt IDs
     */
    bulkDeletePrompts(ids) {
        const count = this.bulkDelete(ids);
        if (count === 0) return;

        commitAndRender();

        state.ui.selectedPrompts.clear();
        
        import('../view/ui.js').then(ui => {
            ui.updateBulkUI();
        });

        showToast(`${count} prompt${count > 1 ? 's' : ''} deleted`, 'success');
    },

    /**
     * Bulk toggle favorites with UI update
     * @param {Set} ids - Set of prompt IDs
     */
    bulkToggleFavorites(ids) {
        this.bulkToggleFavorite(ids);
        commitAndRender(true);

        showToast('Favorites updated!', 'success');
    },

    /**
     * Bulk move to collection with UI update
     * @param {Set} ids - Set of prompt IDs
     * @param {string|null} collectionId - Collection ID
     */
    bulkMoveToCollectionPrompt(ids, collectionId) {
        this.bulkMoveToCollection(ids, collectionId);
        commitAndRender();

        showToast('Prompts moved to collection!', 'success');
    },

    /**
     * Bulk change category with UI update - O(n) using Map
     * @param {Set} ids - Set of prompt IDs
     * @param {string|null} categoryId - Category ID
     */
    bulkChangeCategory(ids, categoryId) {
        const promptMap = getPromptMap();
        
        ids.forEach(id => {
            const prompt = promptMap.get(id);
            if (prompt) {
                prompt.categoryId = categoryId;
            }
        });

        commitAndRender();

        showToast('Category updated!', 'success');
    }
};
