import { generateId, extractVariables } from '../utils/helpers.js';

export function buildSearchIndex(prompt) {
    return [prompt.title, prompt.description, prompt.content, ...prompt.tags]
        .join(' ').toLowerCase();
}

// Lazy-loaded search index - only built when needed
export function createPromptModel(data) {
    const prompt = {
        id: generateId(),
        title: data.title,
        description: data.description ?? '',
        content: data.content,
        collectionId: data.collectionId || null,
        categoryId: data.categoryId || null,
        tags: data.tags ?? [],
        variables: extractVariables(data.content),
        favorite: false,
        usageCount: 0,
        lastUsed: null,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
    // Lazy load search index - use a getter that builds on first access
    Object.defineProperty(prompt, '_searchIndex', {
        get: function() {
            return buildSearchIndex(this);
        },
        set: function(value) {
            // Allow manual setting (for backwards compatibility)
            this._cachedSearchIndex = value;
        },
        configurable: true,
        enumerable: false
    });
    return prompt;
}

export function duplicatePromptModel(original) {
    const clone = JSON.parse(JSON.stringify(original));
    const newPrompt = {
        ...clone,
        id: generateId(),
        title: clone.title + ' [Copy]',
        favorite: false,
        usageCount: 0,
        lastUsed: null,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
    // Use lazy-loaded search index
    Object.defineProperty(newPrompt, '_searchIndex', {
        get: function() {
            return buildSearchIndex(this);
        },
        set: function(value) {
            this._cachedSearchIndex = value;
        },
        configurable: true,
        enumerable: false
    });
    return newPrompt;
}

// Helper to get search index (uses cache if available)
export function getSearchIndex(prompt) {
    if (prompt._cachedSearchIndex !== undefined) {
        return prompt._cachedSearchIndex;
    }
    return prompt._searchIndex; // Triggers getter to build
}
