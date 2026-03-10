import { generateId } from '../utils/helpers.js';
import { COLORS } from '../config/constants.js';

/**
 * @typedef {Object} Category
 * @property {string} id - Unique identifier
 * @property {string} name - Category name
 * @property {string} color - Category color hex code
 * @property {number} createdAt - Creation timestamp
 */

/**
 * @typedef {Object} CategoryFormData
 * @property {string} name
 * @property {string} color
 */

const DEFAULT_CATEGORY_COLOR = COLORS[1]; // #8b5cf6

/**
 * Creates a new category model with generated ID
 * @param {CategoryFormData} data - Form data for the category
 * @returns {Category} New category object
 */
export function createCategoryModel(data) {
    return {
        id: generateId(),
        name: data.name,
        color: data.color ?? DEFAULT_CATEGORY_COLOR,
        createdAt: Date.now()
    };
}
