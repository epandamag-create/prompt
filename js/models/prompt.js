import { generateId, extractVariables } from '../utils/helpers.js';

/**
 * @typedef {Object} Prompt
 * @property {string} id - Unique identifier
 * @property {string} title - Prompt title
 * @property {string} description - Prompt description
 * @property {string} content - Prompt content with variables
 * @property {string|null} collectionId - Associated collection ID
 * @property {string|null} categoryId - Associated category ID
 * @property {string[]} tags - Array of tags
 * @property {string[]} variables - Extracted variables from content
 * @property {boolean} favorite - Whether prompt is favorited
 * @property {number} usageCount - Number of times used
 * @property {number|null} lastUsed - Timestamp of last use
 * @property {number} createdAt - Creation timestamp
 * @property {number} updatedAt - Last update timestamp
 */

/**
 * @typedef {Object} PromptFormData
 * @property {string} title
 * @property {string} description
 * @property {string} content
 * @property {string|null} collectionId
 * @property {string|null} categoryId
 * @property {string[]} tags
 */

/**
 * Builds search index from prompt fields
 * @param {Prompt} prompt - The prompt to index
 * @returns {string} Lowercase search index
 */
export function buildSearchIndex(prompt) {
    return [prompt.title, prompt.description, prompt.content, ...prompt.tags]
        .join(' ').toLowerCase();
}

/**
 * Creates a new prompt model with generated ID and defaults
 * @param {PromptFormData} data - Form data for the prompt
 * @returns {Prompt} New prompt object
 */
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
    // Lazy-computed search index via getter
    Object.defineProperty(prompt, '_searchIndex', {
        get: function() {
            return buildSearchIndex(this);
        },
        configurable: true,
        enumerable: false
    });
    return prompt;
}

/**
 * Creates a duplicate of an existing prompt
 * @param {Prompt} original - The prompt to duplicate
 * @returns {Prompt} New prompt with new ID and " [Copy]" suffix
 */
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
    // Lazy-computed search index via getter
    Object.defineProperty(newPrompt, '_searchIndex', {
        get: function() {
            return buildSearchIndex(this);
        },
        configurable: true,
        enumerable: false
    });
    return newPrompt;
}

