import { generateId } from '../utils/helpers.js';
import { COLORS } from '../config/constants.js';

const DEFAULT_COLLECTION_COLOR = COLORS[0]; // #3b82f6

export function createCollectionModel(data) {
    return {
        id: generateId(),
        name: data.name,
        color: data.color ?? DEFAULT_COLLECTION_COLOR,
        createdAt: Date.now()
    };
}
