import { viewService } from '../services/view-service.js';
import { closeDropdown } from '../view/ui.js';

export const toolbarController = {
    toggleTheme() {
        viewService.toggleTheme(); // This saves state
    },

    setViewMode(mode) {
        viewService.setViewMode(mode); // This saves state
    },

    setDensity(density) {
        viewService.setDensity(density); // This saves state
        closeDropdown('densityDropdown');
    },

    setSort(sort) {
        // The viewService handles state update, saving, and re-rendering
        viewService.setSortBy(sort);
        closeDropdown('sortDropdown');
    }
};