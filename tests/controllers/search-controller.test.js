import { describe, it, expect } from '../test-framework.js';
import { searchController } from '../../js/controllers/search-controller.js';
import { state } from '../../js/state.js';
import { filterService } from '../../js/services/filter-service.js';
import { clearPromptCache } from '../../js/services/prompt-service.js';
import { createPromptModel } from '../../js/models/prompt.js';

describe('Controller: SearchController', () => {
    
    // Setup DOM container
    const container = document.createElement('div');
    container.id = 'test-search-container';
    document.body.appendChild(container);

    // Save original methods to restore later
    const originalSetSearchQuery = filterService.setSearchQuery;
    const originalClearSearch = filterService.clearSearch;

    // Mock tracking variables
    let mockSetSearchQueryCalledWith = null;
    let mockClearSearchCalled = false;

    function resetTestEnvironment() {
        // 1. Reset DOM
        container.innerHTML = `
            <input type="text" id="searchInput" value="">
            <input type="text" id="mobileSearchInput" value="">
            <div id="searchClearBtn" class="hidden"></div>
            <div id="mobileSearchClearBtn" class="hidden"></div>
            <input type="text" id="promptTags" value="">
            <div id="tagSuggestions"></div>
            <!-- promptGrid needed for renderPrompts safety check -->
            <div id="promptGrid"></div> 
            
            <!-- Stats elements needed for renderPrompts -->
            <span id="statsDisplay"></span>
            <span id="allCount"></span>
            <span id="favCount"></span>
            
            <!-- Lists needed for renderAll -->
            <div id="collectionsList"></div>
            <div id="categoriesList"></div>
            <div id="tagsList"></div>
            
            <!-- Title and Filter Bar -->
            <h1 id="contentTitle"></h1>
            <div id="filterBar"></div>
        `;

        // 2. Reset Mocks
        mockSetSearchQueryCalledWith = null;
        mockClearSearchCalled = false;

        filterService.setSearchQuery = (query) => {
            mockSetSearchQueryCalledWith = query;
        };
        filterService.clearSearch = () => {
            mockClearSearchCalled = true;
        };

        // Clear any pending timers from previous tests
        searchController.clearSearch();

        // 3. Reset State
        state.prompts = [];
        state.ui.tagSuggestionIndex = -1;
        clearPromptCache(); // Clear cache to ensure getAllTags reads from new state
    }

    it('handleSearch should sync inputs and call filterService', async () => {
        resetTestEnvironment();

        const desktopInput = document.getElementById('searchInput');
        const mobileInput = document.getElementById('mobileSearchInput');
        const clearBtn = document.getElementById('searchClearBtn');

        // Simulate typing in desktop input
        desktopInput.value = 'test query';
        
        // Call handler
        searchController.handleSearch({ target: desktopInput });

        // Verify mobile input is synced
        expect(mobileInput.value).toBe('test query');
        
        // Verify service was called
        expect(mockSetSearchQueryCalledWith).toBe('test query');
        
        // Verify clear button visibility toggled
        expect(clearBtn.classList.contains('visible')).toBe(true);
    });

    it('clearSearch should clear inputs and reset service', async () => {
        resetTestEnvironment();

        const desktopInput = document.getElementById('searchInput');
        const mobileInput = document.getElementById('mobileSearchInput');
        
        desktopInput.value = 'something';
        mobileInput.value = 'something';
        
        searchController.clearSearch();

        expect(desktopInput.value).toBe('');
        expect(mobileInput.value).toBe('');
        expect(mockClearSearchCalled).toBe(true);
        
        // It should also trigger a search with empty string to update UI
        expect(mockSetSearchQueryCalledWith).toBe('');
    });

    it('handleTagInput should show suggestions based on existing tags', async () => {
        resetTestEnvironment();

        // Setup mock data
        state.prompts = [
            createPromptModel({ title: 'P1', content: 'Content 1', tags: ['javascript', 'react'] }),
            createPromptModel({ title: 'P2', content: 'Content 2', tags: ['java', 'spring'] })
        ];
        // Force cache rebuild
        clearPromptCache();

        const tagInput = document.getElementById('promptTags');
        const suggestions = document.getElementById('tagSuggestions');

        // Simulate typing "java"
        tagInput.value = 'java';
        searchController.handleTagInput({ target: tagInput });

        expect(suggestions.classList.contains('visible')).toBe(true);
        // Should match 'javascript' and 'java'
        expect(suggestions.innerHTML).toContain('javascript');
        expect(suggestions.innerHTML).toContain('java');
        // Should NOT match 'react'
        expect(suggestions.innerHTML).not.toContain('react');
    });
});