import { sanitizeId, generateId, extractVariables } from '../utils/helpers.js';
import { buildSearchIndex } from '../models/prompt.js';
import { COLORS } from '../config/constants.js';

/**
 * Validates that a color string is a valid hex color format.
 * @param {string} color - The color string to validate
 * @returns {boolean} - True if valid hex color, false otherwise
 */
function isValidHexColor(color) {
    return typeof color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Validates and sanitizes the entire imported data structure.
 * Ensures all items have required fields, correct types, and sanitized IDs.
 * Updates foreign keys (collectionId, categoryId) based on sanitized parent IDs.
 * @param {object} data - The raw data parsed from the JSON file.
 * @returns {{validatedData: object, stats: object, errors: string[]}}
 */
export function validateAndSanitizeData(data) {
    const errors = [];
    const stats = { prompts: 0, collections: 0, categories: 0 };
    
    const collectionIdMap = new Map();
    const categoryIdMap = new Map();

    // 1. Validate Collections
    const validatedCollections = (Array.isArray(data.collections) ? data.collections : [])
        .map((c, i) => {
            if (!c || typeof c !== 'object') {
                errors.push(`Collection #${i+1} is not a valid object.`);
                return null;
            }
            const oldId = c.id;
            const newId = sanitizeId(c.id) || generateId();
            if (oldId && oldId !== newId) {
                collectionIdMap.set(oldId, newId);
            }
            
            if (!c.name || typeof c.name !== 'string' || c.name.trim() === '') {
                errors.push(`Collection #${i+1} (ID: ${oldId ?? 'N/A'}) is missing a valid name.`);
                return null;
            }

            return {
                id: newId,
                name: c.name.trim().slice(0, 100),
                color: isValidHexColor(c.color) ? c.color : COLORS[i % COLORS.length],
                createdAt: typeof c.createdAt === 'number' ? c.createdAt : Date.now()
            };
        })
        .filter(Boolean);
    stats.collections = validatedCollections.length;

    // 2. Validate Categories
    const validatedCategories = (Array.isArray(data.categories) ? data.categories : [])
        .map((cat, i) => {
            if (!cat || typeof cat !== 'object') {
                errors.push(`Category #${i+1} is not a valid object.`);
                return null;
            }
            const oldId = cat.id;
            const newId = sanitizeId(cat.id) || generateId();
            if (oldId && oldId !== newId) {
                categoryIdMap.set(oldId, newId);
            }

            if (!cat.name || typeof cat.name !== 'string' || cat.name.trim() === '') {
                errors.push(`Category #${i+1} (ID: ${oldId ?? 'N/A'}) is missing a valid name.`);
                return null;
            }

            return {
                id: newId,
                name: cat.name.trim().slice(0, 100),
                color: isValidHexColor(cat.color) ? cat.color : COLORS[i % COLORS.length],
                createdAt: typeof cat.createdAt === 'number' ? cat.createdAt : Date.now()
            };
        })
        .filter(Boolean);
    stats.categories = validatedCategories.length;

    // 3. Validate Prompts
    const validatedPrompts = (Array.isArray(data.prompts) ? data.prompts : [])
        .map((p, i) => {
            if (!p || typeof p !== 'object') {
                errors.push(`Prompt #${i+1} is not a valid object.`);
                return null;
            }
            
            if (!p.title || typeof p.title !== 'string' || !p.content || typeof p.content !== 'string') {
                errors.push(`Prompt #${i+1} (Title: "${p.title ?? 'N/A'}") is missing a required title or content.`);
                return null;
            }

            const newId = sanitizeId(p.id) || generateId();
            
            let collectionId = p.collectionId ? (collectionIdMap.get(p.collectionId) || p.collectionId) : null;
            let categoryId = p.categoryId ? (categoryIdMap.get(p.categoryId) || p.categoryId) : null;

            const prompt = {
                id: newId,
                title: p.title.trim().slice(0, 200),
                description: (p.description ?? '').trim().slice(0, 1000),
                content: p.content.slice(0, 50000),
                collectionId: collectionId,
                categoryId: categoryId,
                tags: Array.isArray(p.tags) ? p.tags.map(String) : [],
                variables: extractVariables(p.content),
                favorite: !!p.favorite,
                usageCount: p.usageCount ?? 0,
                lastUsed: p.lastUsed ?? null,
                createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now(),
                updatedAt: typeof p.updatedAt === 'number' ? p.updatedAt : Date.now(),
                _searchIndex: buildSearchIndex({title: p.title, description: p.description ?? '', content: p.content, tags: p.tags ?? []})
            };
            return prompt;
        })
        .filter(Boolean);
    stats.prompts = validatedPrompts.length;

    return { validatedData: { prompts: validatedPrompts, collections: validatedCollections, categories: validatedCategories }, stats, errors };
}
