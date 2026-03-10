import { generateId } from '../utils/helpers.js';
import { COLORS } from '../config/constants.js';

/**
 * @typedef {Object} Collection
 * @property {string} id - Unique identifier
 * @property {string} name - Collection name
 * @property {string} color - Collection color hex code
 * @property {number} createdAt - Creation timestamp
 */

/**
 * @typedef {Object} CollectionFormData
 * @property {string} name
 * @property {string} color
 */

const DEFAULT_COLLECTION_COLOR = COLORS[0]; // #3b82f6

/**
 * Creates a new collection model with generated ID
 * @param {CollectionFormData} data - Form data for the collection
 * @returns {Collection} New collection object
 */
export function createCollectionModel(data) {
    return {
        id: generateId(),
        name: data.name,
        color: data.color ?? DEFAULT_COLLECTION_COLOR,
        createdAt: Date.now()
    };
}
