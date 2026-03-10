import { state } from '../state.js';
import { getFilteredPrompts, clearPromptCache } from './prompt-service.js';
import { renderPrompts, renderFilterBar, updateContentTitle, updateSidebarHighlights } from '../view/render.js';

/**
 * Filter Service - Handles search and filtering logic
 */
export const filterService = {
    /**
     * Set search query
     * @param {string} query - Search query
     */
    setSearchQuery(query) {
        state.searchQuery = query.toLowerCase().trim();
        this.applyFilters();
    },

    /**
     * Clear search query
     */
    clearSearch() {
        state.searchQuery = '';
    },

    /**
     * Toggle collection filter
     * @param {string} collectionId - Collection ID to toggle
     */
    toggleCollectionFilter(collectionId) {
        const idx = state.currentCollections.indexOf(collectionId);
        if (idx === -1) {
            state.currentCollections.push(collectionId);
            state.currentView = 'filtered';
        } else {
            state.currentCollections.splice(idx, 1);
            if (state.currentCollections.length === 0 && 
                state.currentCategories.length === 0 && 
                state.currentTags.length === 0) {
                state.currentView = 'all';
            }
        }
        this.applyFilters();
    },

    /**
     * Toggle category filter
     * @param {string} categoryId - Category ID to toggle
     */
    toggleCategoryFilter(categoryId) {
        const idx = state.currentCategories.indexOf(categoryId);
        if (idx === -1) {
            state.currentCategories.push(categoryId);
            state.currentView = 'filtered';
        } else {
            state.currentCategories.splice(idx, 1);
            if (state.currentCollections.length === 0 && 
                state.currentCategories.length === 0 && 
                state.currentTags.length === 0) {
                state.currentView = 'all';
            }
        }
        this.applyFilters();
    },

    /**
     * Toggle tag filter
     * @param {string} tag - Tag name to toggle
     */
    toggleTagFilter(tag) {
        const idx = state.currentTags.indexOf(tag);
        if (idx === -1) {
            state.currentTags.push(tag);
            state.currentView = 'filtered';
        } else {
            state.currentTags.splice(idx, 1);
            if (state.currentCollections.length === 0 && 
                state.currentCategories.length === 0 && 
                state.currentTags.length === 0) {
                state.currentView = 'all';
            }
        }
        this.applyFilters();
    },

    /**
     * Clear all filters
     */
    clearFilters() {
        state.searchQuery = '';
        state.currentCollections = [];
        state.currentCategories = [];
        state.currentTags = [];
        state.currentView = 'all';
        this.applyFilters();
    },

    /**
     * Apply current filters and re-render
     */
    applyFilters() {
        clearPromptCache();
        const filtered = this.getFiltered();
        renderPrompts(filtered);
        renderFilterBar();
        updateSidebarHighlights();
        this.updateTitle();
    },

    /**
     * Get filtered prompts based on current filters
     * @returns {Array} Filtered prompts
     */
    getFiltered() {
        let filtered = getFilteredPrompts();
        
        // Additional filters from state
        if (state.currentCollections.length > 0) {
            filtered = filtered.filter(p => 
                p.collectionId && state.currentCollections.includes(p.collectionId)
            );
        }
        
        if (state.currentCategories.length > 0) {
            filtered = filtered.filter(p => 
                p.categoryId && state.currentCategories.includes(p.categoryId)
            );
        }
        
        if (state.currentTags.length > 0) {
            filtered = filtered.filter(p => 
                p.tags && p.tags.some(t => state.currentTags.includes(t))
            );
        }
        
        return filtered;
    },

    /**
     * Get human-readable filter description
     * @returns {string} Description of current filters
     */
    getFilterDescription() {
        const parts = [];
        
        if (state.searchQuery) {
            parts.push('"' + state.searchQuery + '"');
        }
        
        if (state.currentCollections.length > 0) {
            const names = state.currentCollections.map(id => {
                const col = state.collections.find(c => c.id === id);
                return col ? col.name : id;
            });
            parts.push('Collection: ' + names.join(', '));
        }
        
        if (state.currentCategories.length > 0) {
            const names = state.currentCategories.map(id => {
                const cat = state.categories.find(c => c.id === id);
                return cat ? cat.name : id;
            });
            parts.push('Category: ' + names.join(', '));
        }
        
        if (state.currentTags.length > 0) {
            parts.push('Tags: ' + state.currentTags.join(', '));
        }
        
        return parts.length > 0 ? parts.join(' | ') : 'All prompts';
    },

    /**
     * Update content title based on current view and filters
     */
    updateTitle() {
        let title = 'All Prompts';
        
        if (state.searchQuery) {
            title = 'Search: "' + state.searchQuery + '"';
        } else if (state.currentView === 'favorites') {
            title = 'Favorites';
        } else if (state.currentView === 'recent') {
            title = 'Recently Used';
        } else if (state.currentView === 'frequent') {
            title = 'Most Used';
        } else if (state.currentView === 'filtered') {
            if (state.currentCollections.length > 0) {
                const names = state.currentCollections.map(id => {
                    const col = state.collections.find(c => c.id === id);
                    return col ? col.name : 'Unknown';
                });
                title = names.join(', ');
            } else if (state.currentCategories.length > 0) {
                const names = state.currentCategories.map(id => {
                    const cat = state.categories.find(c => c.id === id);
                    return cat ? cat.name : 'Unknown';
                });
                title = names.join(', ');
            } else if (state.currentTags.length > 0) {
                title = 'Tag: ' + state.currentTags.join(', ');
            } else {
                title = 'All Prompts';
            }
        }
        
        updateContentTitle(title);
    },

    /**
     * Check if any filters are active
     * @returns {boolean}
     */
    hasActiveFilters() {
        return state.searchQuery || 
               state.currentCollections.length > 0 || 
               state.currentCategories.length > 0 || 
               state.currentTags.length > 0;
    },

    /**
     * Set current view
     * @param {string} view - View name
     */
    setView(view) {
        state.currentView = view;
        this.applyFilters();
    },

    // Aliases for backwards compatibility
    toggleCollection(id) { return this.toggleCollectionFilter(id); },
    toggleCategory(id) { return this.toggleCategoryFilter(id); },
    toggleTag(tag) { return this.toggleTagFilter(tag); },
    clearAll() { return this.clearFilters(); }
};
