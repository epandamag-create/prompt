import { state } from '../state.js';

// Cache for memoization - invalidated when state changes
let cache = null;
let cacheKey = null;

function computeCacheKey() {
    return JSON.stringify({
        prompts: state.prompts?.length || 0,
        view: state.currentView,
        collections: state.currentCollections,
        categories: state.currentCategories,
        tags: state.currentTags,
        search: state.searchQuery,
        sort: state.preferences.sortBy,
        promptsUpdate: state.prompts?.reduce((acc, p) => acc + (p.updatedAt || 0), 0) || 0
    });
}

export function getFilteredPrompts() {
    const currentKey = computeCacheKey();
    
    // Return cached result if available and valid
    if (cache && cacheKey === currentKey) {
        return cache;
    }
    
    // Compute filtered prompts
    let prompts = [...(state.prompts || [])];

    if (state.currentView === 'favorites') {
        prompts = prompts.filter(p => p.favorite);
    } else if (state.currentView === 'recent') {
        prompts = prompts
            .filter(p => p.lastUsed)
            .sort((a, b) => b.lastUsed - a.lastUsed)
            .slice(0, 20);
    } else if (state.currentView === 'filtered') {
        prompts = prompts.filter(p => {
            // AND Logic: Must match ALL active filter groups
            
            if (state.currentCollections.length > 0 && !state.currentCollections.includes(p.collectionId)) {
                return false;
            }
            if (state.currentCategories.length > 0 && !state.currentCategories.includes(p.categoryId)) {
                return false;
            }
            if (state.currentTags.length > 0 && !p.tags.some(t => state.currentTags.includes(t))) {
                return false;
            }
            return true;
        });
    }

    // Build lookup maps ONCE to avoid O(n²) complexity in search
    const categoryMap = new Map(state.categories.map(c => [c.id, c]));
    const collectionMap = new Map(state.collections.map(c => [c.id, c]));
    
    if (state.searchQuery) {
        prompts = prompts.filter(p => {
            const cat = categoryMap.get(p.categoryId);
            const col = collectionMap.get(p.collectionId);
            const dynamicContext = ((cat?.name ?? '') + ' ' + (col?.name || '')).toLowerCase();
            const searchIndex = p._searchIndex ?? ''; 
            return (searchIndex + ' ' + dynamicContext).includes(state.searchQuery);
        });
    }

    if (state.currentView !== 'recent') {
        const sortBy = state.preferences.sortBy ?? 'newest';
        prompts.sort((a, b) => {
            switch (sortBy) {
                case 'newest':     return b.createdAt - a.createdAt;
                case 'oldest':     return a.createdAt - b.createdAt;
                case 'az':         return a.title.localeCompare(b.title);
                case 'za':         return b.title.localeCompare(a.title);
                case 'mostused':   return (b.usageCount ?? 0) - (a.usageCount ?? 0);
                case 'recentlyused': 
                    if (!a.lastUsed && !b.lastUsed) return b.createdAt - a.createdAt;
                    if (!a.lastUsed) return 1;
                    if (!b.lastUsed) return -1;
                    return b.lastUsed - a.lastUsed;
                default:           return b.createdAt - a.createdAt;
            }
        });
    }

    // Cache the result
    cache = prompts;
    cacheKey = currentKey;
    
    return prompts;
}

// Export function to manually clear cache when needed
export function clearPromptCache() {
    cache = null;
    cacheKey = null;
}
