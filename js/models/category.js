import { generateId } from '../utils/helpers.js';
import { COLORS } from '../config/constants.js';

const DEFAULT_CATEGORY_COLOR = COLORS[1]; // #8b5cf6

export function createCategoryModel(data) {
    return {
        id: generateId(),
        name: data.name,
        color: data.color ?? DEFAULT_CATEGORY_COLOR,
        createdAt: Date.now()
    };
}
