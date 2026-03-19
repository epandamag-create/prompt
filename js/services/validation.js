import { sanitizeId, generateId, extractVariables, validateField } from '../utils/helpers.js';
import { buildSearchIndex } from '../models/prompt.js';
import { COLORS, VALIDATION_RULES } from '../config/constants.js';

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
                errors.push(`Collection #${i+1}: ID "${oldId}" contained invalid characters and was sanitized to "${newId}".`);
            }

            // Validate name using validation rules
            const nameValidation = validateField(c.name, VALIDATION_RULES.collection.name, 'Collection name');
            if (!nameValidation.valid) {
                errors.push(`Collection #${i+1} (ID: ${oldId ?? 'N/A'}): ${nameValidation.error}`);
                return null;
            }
            
            // Note: ID was auto-corrected via sanitizeId() above if invalid
            
            // Validate color if provided
            if (c.color && !isValidHexColor(c.color)) {
                errors.push(`Collection #${i+1} (ID: ${oldId ?? 'N/A'}): ${VALIDATION_RULES.collection.color.message}. Using default color.`);
            }

            return {
                id: newId,
                name: c.name.trim().slice(0, VALIDATION_RULES.collection.name.maxLength),
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
                errors.push(`Category #${i+1}: ID "${oldId}" contained invalid characters and was sanitized to "${newId}".`);
            }

            // Validate name using validation rules
            const nameValidation = validateField(cat.name, VALIDATION_RULES.category.name, 'Category name');
            if (!nameValidation.valid) {
                errors.push(`Category #${i+1} (ID: ${oldId ?? 'N/A'}): ${nameValidation.error}`);
                return null;
            }
            
            // Note: ID was auto-corrected via sanitizeId() above if invalid
            
            // Validate color if provided
            if (cat.color && !isValidHexColor(cat.color)) {
                errors.push(`Category #${i+1} (ID: ${oldId ?? 'N/A'}): ${VALIDATION_RULES.category.color.message}. Using default color.`);
            }

            return {
                id: newId,
                name: cat.name.trim().slice(0, VALIDATION_RULES.category.name.maxLength),
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
            
            // Sanitize/Truncate strings first to ensure they are valid strings and within limits
            // This handles undefined/null by defaulting to empty string and truncates before validation
            const title = String(p.title || '').trim().slice(0, VALIDATION_RULES.prompt.title.maxLength);
            const content = String(p.content || '').slice(0, VALIDATION_RULES.prompt.content.maxLength);
            const description = String(p.description || '').trim().slice(0, VALIDATION_RULES.prompt.description.maxLength);
            
            // Validate the sanitized values
            const titleValidation = validateField(title, VALIDATION_RULES.prompt.title, 'Prompt title');
            if (!titleValidation.valid) {
                errors.push(`Prompt #${i+1}: ${titleValidation.error}`);
                return null;
            }
            
            const contentValidation = validateField(content, VALIDATION_RULES.prompt.content, 'Prompt content');
            if (!contentValidation.valid) {
                errors.push(`Prompt #${i+1} (Title: "${title || 'N/A'}"): ${contentValidation.error}`);
                return null;
            }
            
            
            // Validate tags if provided
            if (Array.isArray(p.tags) && p.tags.length > 0) {
                const tagsValidation = validateField(p.tags, VALIDATION_RULES.prompt.tags, 'Prompt tags');
                if (!tagsValidation.valid) {
                    errors.push(`Prompt #${i+1} (Title: "${p.title ?? 'N/A'}"): ${tagsValidation.error}`);
                    // Continue with truncated tags rather than rejecting
                }
            }

            const newId = sanitizeId(p.id) || generateId();
            
            let collectionId = p.collectionId ? (collectionIdMap.get(p.collectionId) || p.collectionId) : null;
            let categoryId = p.categoryId ? (categoryIdMap.get(p.categoryId) || p.categoryId) : null;

            const prompt = {
                id: newId,
                title: title,
                description: description,
                content: content,
                collectionId: collectionId,
                categoryId: categoryId,
                tags: Array.isArray(p.tags) ? p.tags.map(String).slice(0, VALIDATION_RULES.prompt.tags.maxItems) : [],
                variables: extractVariables(content),
                favorite: !!p.favorite,
                usageCount: p.usageCount ?? 0,
                lastUsed: p.lastUsed ?? null,
                createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now(),
                updatedAt: typeof p.updatedAt === 'number' ? p.updatedAt : Date.now(),
            };
            Object.defineProperty(prompt, '_searchIndex', {
                value: buildSearchIndex({ title: p.title, description: p.description ?? '', content: p.content, tags: p.tags ?? [] }),
                enumerable: false,
                writable: true,
                configurable: true,
            });
            return prompt;
        })
        .filter(Boolean);
    stats.prompts = validatedPrompts.length;

    return { validatedData: { prompts: validatedPrompts, collections: validatedCollections, categories: validatedCategories }, stats, errors };
}
