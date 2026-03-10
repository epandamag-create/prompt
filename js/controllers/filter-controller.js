import { filterService } from '../services/filter-service.js';

export const filterController = {
    toggleCollection(id) {
        filterService.toggleCollection(id);
    },

    toggleCategory(id) {
        filterService.toggleCategory(id);
    },

    toggleTag(tag) {
        filterService.toggleTag(tag);
    },

    clearAll() {
        filterService.clearAll();
    }
};