import { describe, it, expect } from '../test-framework.js';
import { filterService } from '../../js/services/filter-service.js';
import { state } from '../../js/state.js';

describe('Service: FilterService', () => {

    // Save real applyFilters — restored after each test via resetTestEnvironment
    const originalApplyFilters = filterService.applyFilters;

    let applyFiltersCalled = false;

    function resetTestEnvironment() {
        applyFiltersCalled = false;
        // Intercept applyFilters to avoid real DOM/render calls
        filterService.applyFilters = () => { applyFiltersCalled = true; };
        // Reset relevant state slices
        state.searchQuery = '';
        state.currentCollections = [];
        state.currentCategories = [];
        state.currentTags = [];
        state.ui.selectedPrompts = new Set();
    }

    // ── BLOCKER-3: clearSearch must trigger applyFilters ─────────────────────

    it('clearSearch() sets searchQuery to empty string', () => {
        resetTestEnvironment();
        state.searchQuery = 'hello world';
        filterService.clearSearch();
        expect(state.searchQuery).toBe('');
    });

    it('clearSearch() calls applyFilters so the UI re-renders', () => {
        resetTestEnvironment();
        state.searchQuery = 'something';
        filterService.clearSearch();
        expect(applyFiltersCalled).toBe(true);
    });

    it('clearSearch() calls applyFilters even when searchQuery was already empty', () => {
        resetTestEnvironment();
        // state.searchQuery already '' — still must refresh UI
        filterService.clearSearch();
        expect(applyFiltersCalled).toBe(true);
    });

    // ── SUGGESTION-6: hasActiveFilters() must return strict boolean ───────────

    it('hasActiveFilters() returns exactly false (not empty string) when nothing is active', () => {
        resetTestEnvironment();
        const result = filterService.hasActiveFilters();
        expect(result === false).toBe(true);
    });

    it('hasActiveFilters() returns exactly true (not a truthy string) when searchQuery is set', () => {
        resetTestEnvironment();
        state.searchQuery = 'hello';
        const result = filterService.hasActiveFilters();
        expect(result === true).toBe(true);
    });

    it('hasActiveFilters() returns true when a collection filter is active', () => {
        resetTestEnvironment();
        state.currentCollections = ['col1'];
        expect(filterService.hasActiveFilters()).toBe(true);
    });

    it('hasActiveFilters() returns true when a category filter is active', () => {
        resetTestEnvironment();
        state.currentCategories = ['cat1'];
        expect(filterService.hasActiveFilters()).toBe(true);
    });

    it('hasActiveFilters() returns true when a tag filter is active', () => {
        resetTestEnvironment();
        state.currentTags = ['mytag'];
        expect(filterService.hasActiveFilters()).toBe(true);
    });

    it('hasActiveFilters() returns false after clearFilters()', () => {
        resetTestEnvironment();
        state.searchQuery = 'test';
        state.currentCollections = ['col1'];
        state.currentCategories = ['cat1'];
        state.currentTags = ['tag1'];
        filterService.clearFilters();
        // clearFilters calls applyFilters internally — that's already mocked
        expect(filterService.hasActiveFilters()).toBe(false);
    });
});
