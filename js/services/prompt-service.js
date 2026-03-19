import { state, stateManager, stateVersion } from '../state.js';
import { VIEWS, SORT_OPTIONS, RECENT_PROMPTS_LIMIT } from '../config/constants.js';
import { createPromptModel, duplicatePromptModel, buildSearchIndex } from '../models/prompt.js';
import { extractVariables, copyToClipboard } from '../utils/helpers.js';
import { closeModal } from '../view/modal.js';
import { showToast, updateBulkUI } from '../view/ui.js';
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
            .slice(0, RECENT_PROMPTS_LIMIT);
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
 * Commit state, save, and re-render.
 * Pass `{ prompts: true }` to skip sidebar re-render when only card data changed.
 * Delegates to stateManager.commit() which calls renderAll() synchronously,
 * avoiding the async dynamic-import anti-pattern.
 * @param {Object} [updates] - Partial render hints forwarded to renderAll
 */
function commitAndRender(updates = {}) {
    stateManager.commit(updates);
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

        // Refresh cached search index after content-related fields change
        prompt._searchIndex = buildSearchIndex(prompt);

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
        stateManager.bumpVersion();
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
            const snap = state.prompts.find(p => p.id === id);
            // Deep-copy array fields so undo/redo restores the original values,
            // not a reference that mutates along with the live prompt.
            const before = { ...snap, tags: [...(snap.tags || [])], variables: [...(snap.variables || [])] };
            this.update(id, formData);
            const snapAfter = state.prompts.find(p => p.id === id);
            const after = { ...snapAfter, tags: [...(snapAfter.tags || [])], variables: [...(snapAfter.variables || [])] };
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

        showToast('Prompt deleted', 'success');
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

        commitAndRender({ prompts: true });
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
            stateManager.bumpVersion();

            // Re-render so the usage count and "recently used" sort order update
            // immediately without waiting for the next user action.
            commitAndRender({ prompts: true });

            showToast('Copied to clipboard!', 'success');
        }).catch(() => {
            showToast('Failed to copy to clipboard', 'error');
        });
    },

    /**
     * Bulk delete prompts with UI update and undo support
     * @param {Set} ids - Set of prompt IDs
     */
    bulkDeletePrompts(ids) {
        const idsSnapshot = new Set(ids);
        const deletedPrompts = state.prompts.filter(p => idsSnapshot.has(p.id));
        if (deletedPrompts.length === 0) return;

        const count = this.bulkDelete(idsSnapshot);

        historyService.push(
            () => { deletedPrompts.forEach(p => state.prompts.unshift(p)); stateManager.bumpVersion(); commitAndRender(); showToast(`${count} prompt${count > 1 ? 's' : ''} restored`, 'success'); },
            () => { this.bulkDelete(idsSnapshot); commitAndRender(); }
        );

        commitAndRender();
        state.ui.selectedPrompts.clear();
        updateBulkUI();

        showToast(`${count} prompt${count > 1 ? 's' : ''} deleted`, 'success');
    },

    /**
     * Bulk toggle favorites with UI update and undo support
     * @param {Set} ids - Set of prompt IDs
     */
    bulkToggleFavorites(ids) {
        const idsSnapshot = new Set(ids);
        const pm0 = getPromptMap();
        const previousStates = new Map([...idsSnapshot].map(id => {
            return [id, pm0.get(id)?.favorite ?? false];
        }));

        this.bulkToggleFavorite(idsSnapshot);

        historyService.push(
            () => { const pm = getPromptMap(); previousStates.forEach((fav, id) => { const p = pm.get(id); if (p) { p.favorite = fav; p.updatedAt = Date.now(); } }); commitAndRender({ prompts: true }); },
            () => { this.bulkToggleFavorite(idsSnapshot); commitAndRender({ prompts: true }); }
        );

        commitAndRender({ prompts: true });
        showToast('Favorites updated!', 'success');
    },

    /**
     * Bulk move to collection with UI update and undo support
     * @param {Set} ids - Set of prompt IDs
     * @param {string|null} collectionId - Collection ID
     */
    bulkMoveToCollectionPrompt(ids, collectionId) {
        const idsSnapshot = new Set(ids);
        const pm0 = getPromptMap();
        const previousCollections = new Map([...idsSnapshot].map(id => {
            return [id, pm0.get(id)?.collectionId ?? null];
        }));

        this.bulkMoveToCollection(idsSnapshot, collectionId);

        historyService.push(
            () => { const pm = getPromptMap(); previousCollections.forEach((colId, id) => { const p = pm.get(id); if (p) p.collectionId = colId; }); commitAndRender(); },
            () => { this.bulkMoveToCollection(idsSnapshot, collectionId); commitAndRender(); }
        );

        commitAndRender();
        showToast('Prompts moved to collection!', 'success');
    },

    /**
     * Bulk edit tags with undo support
     * @param {Set} ids - Set of prompt IDs
     * @param {'add'|'remove'|'replace'} mode
     * @param {string[]} tags - Tags to apply
     */
    bulkEditTags(ids, mode, tags) {
        const idsSnapshot = new Set(ids);
        const pm0 = getPromptMap();
        const previousTags = new Map([...idsSnapshot].map(id => {
            return [id, [...(pm0.get(id)?.tags || [])]];
        }));

        function applyTags(p) {
            const existing = p.tags || [];
            if (mode === 'add') {
                p.tags = [...new Set([...existing, ...tags])];
            } else if (mode === 'remove') {
                p.tags = existing.filter(t => !tags.includes(t));
            } else {
                p.tags = [...tags];
            }
        }

        state.prompts.forEach(p => { if (idsSnapshot.has(p.id)) applyTags(p); });

        historyService.push(
            () => { state.prompts.forEach(p => { if (previousTags.has(p.id)) p.tags = previousTags.get(p.id); }); commitAndRender(); },
            () => { state.prompts.forEach(p => { if (idsSnapshot.has(p.id)) applyTags(p); }); commitAndRender(); }
        );

        commitAndRender();
        showToast(`Tags updated on ${idsSnapshot.size} prompt${idsSnapshot.size > 1 ? 's' : ''}!`, 'success');
    },

    /**
     * Bulk move to category with UI update and undo support
     * @param {Set} ids - Set of prompt IDs
     * @param {string|null} categoryId - Category ID
     */
    bulkMoveToCategoryPrompt(ids, categoryId) {
        const idsSnapshot = new Set(ids);
        const pm0 = getPromptMap();
        const previousCategories = new Map([...idsSnapshot].map(id => {
            return [id, pm0.get(id)?.categoryId ?? null];
        }));

        const promptMap = getPromptMap();
        idsSnapshot.forEach(id => {
            const prompt = promptMap.get(id);
            if (prompt) prompt.categoryId = categoryId;
        });

        historyService.push(
            () => { const pm = getPromptMap(); previousCategories.forEach((catId, id) => { const p = pm.get(id); if (p) p.categoryId = catId; }); commitAndRender(); },
            () => { const pm = getPromptMap(); idsSnapshot.forEach(id => { const p = pm.get(id); if (p) p.categoryId = categoryId; }); commitAndRender(); }
        );

        commitAndRender();
        showToast('Prompts moved to category!', 'success');
    }
};
