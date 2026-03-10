import { state, stateManager } from '../state.js';
import { VIEWS, DENSITY, SORT_OPTIONS } from '../config/constants.js';
import { showToast, applyTheme, applyDensity, applyViewMode, applySidebarSection, updateBulkUI } from '../view/ui.js';
import { renderAll } from '../view/render.js';
import { clearPromptCache } from './prompt-service.js';

// Use centralized stateManager.save() instead of duplicate function
const saveState = () => stateManager.save();

/**
 * View Service - Manages UI state for views, themes, and selections
 * @module viewService
 */
export const viewService = {
    // ============================================
    // VIEW & NAVIGATION
    // ============================================

    /**
     * Set the current view mode
     * @param {string} view - View mode (all, favorites, recent, filtered)
     */
    setView(view) {
        state.currentView = view;
        clearPromptCache();
        renderAll();
        saveState();
    },

    /**
     * Toggle sidebar collapsed state
     */
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;
        sidebar.classList.toggle('collapsed');
        state.preferences.sidebarCollapsed = sidebar.classList.contains('collapsed');
        saveState();
    },

    /**
     * Toggle a specific sidebar section
     * @param {string} section - Section name (quickaccess, categories, collections, tags)
     */
    toggleSidebarSection(section) {
        if (state.sidebarSections.hasOwnProperty(section)) {
            state.sidebarSections[section] = !state.sidebarSections[section];
            applySidebarSection(section);
            saveState();
        }
    },

    // ============================================
    // PREFERENCES - Theme, Density, View Mode, Sort
    // ============================================

    /**
     * Set application theme
     * @param {'dark'|'light'} theme - Theme name
     */
    setTheme(theme) {
        state.preferences.theme = theme;
        applyTheme(theme);
        saveState();
    },

    /**
     * Set density mode
     * @param {'comfortable'|'compact'|'spacious'} density - Density mode
     */
    setDensity(density) {
        state.preferences.density = density;
        applyDensity(density);
        saveState();
    },

    /**
     * Set view mode (grid or list)
     * @param {'grid'|'list'} viewMode - View mode
     */
    setViewMode(viewMode) {
        state.preferences.viewMode = viewMode;
        applyViewMode(viewMode);
        saveState();
    },

    /**
     * Set sort option
     * @param {string} sortBy - Sort option (newest, oldest, az, za, mostused, recentlyused)
     */
    setSortBy(sortBy) {
        state.preferences.sortBy = sortBy;
        document.querySelectorAll('#sortDropdown .dropdown-option').forEach(opt => {
            opt.classList.toggle('active', opt.dataset.sort === sortBy);
        });
        clearPromptCache();
        renderAll();
        saveState();
    },

    /**
     * Toggle between dark and light theme
     */
    toggleTheme() {
        const themes = ['dark', 'light'];
        const currentIdx = themes.indexOf(state.preferences.theme);
        const nextTheme = themes[(currentIdx + 1) % themes.length];
        this.setTheme(nextTheme);
    },

    // ============================================
    // SELECTION STATE
    // ============================================

    /**
     * Clear all selected prompts
     */
    clearSelection() {
        state.ui.selectedPrompts.clear();
        this.updateBulkUI();
    },

    /**
     * Toggle selection of a single prompt
     * @param {string} promptId - Prompt ID
     */
    togglePromptSelection(promptId) {
        if (state.ui.selectedPrompts.has(promptId)) {
            state.ui.selectedPrompts.delete(promptId);
        } else {
            state.ui.selectedPrompts.add(promptId);
        }
        this.updateBulkUI();
        renderAll({ prompts: true, filterBar: false });
    },

    /**
     * Select all prompts
     * @param {Array} prompts - Array of prompt objects
     */
    selectAll(prompts) {
        prompts.forEach(p => state.ui.selectedPrompts.add(p.id));
        this.updateBulkUI();
    },

    /**
     * Update bulk action UI elements
     */
    updateBulkUI() {
        updateBulkUI();
    },

    // ============================================
    // INITIALIZATION
    // ============================================

    /**
     * Apply saved preferences on app initialization
     */
    applyPreferences() {
        applyTheme(state.preferences.theme);
        applyDensity(state.preferences.density);
        applyViewMode(state.preferences.viewMode);
        if (state.preferences.sidebarCollapsed) {
            document.getElementById('sidebar').classList.add('collapsed');
        }
        Object.keys(state.sidebarSections).forEach(section => {
            applySidebarSection(section);
        });
    }
};
