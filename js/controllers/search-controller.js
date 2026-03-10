import { state } from '../state.js';
import { filterService } from '../services/filter-service.js';
import { getAllTags } from '../services/prompt-service.js';
import { renderPrompts } from '../view/render.js';
import { escapeHtml } from '../utils/helpers.js';

const searchDebounceTimers = {
    desktop: null,
    mobile: null
};

let isSyncingSearch = false;

export const searchController = {
    handleSearch(event) {
        if (isSyncingSearch) return;
        
        const query = event.target.value;
        const sourceId = event.target.id;

        try {
            isSyncingSearch = true;
            const targetId = sourceId === 'searchInput' ? 'mobileSearchInput' : 'searchInput';
            const targetInput = document.getElementById(targetId);
            if (targetInput) targetInput.value = query;
        } finally {
            isSyncingSearch = false;
        }
        
        filterService.setSearchQuery(query);
        
        this._updateClearButtons(query);
        
        const timerKey = sourceId === 'searchInput' ? 'desktop' : 'mobile';
        // Clear both timers to avoid race conditions if user switches inputs quickly
        clearTimeout(searchDebounceTimers.desktop);
        clearTimeout(searchDebounceTimers.mobile);
        searchDebounceTimers[timerKey] = setTimeout(() => renderPrompts(), 150);
    },

    clearSearch() {
        clearTimeout(searchDebounceTimers.desktop);
        clearTimeout(searchDebounceTimers.mobile);
        
        const desktopInput = document.getElementById('searchInput');
        const mobileInput = document.getElementById('mobileSearchInput');
        
        if (desktopInput) desktopInput.value = '';
        if (mobileInput) mobileInput.value = '';
        
        filterService.clearSearch();
        
        // Manually trigger a search with empty query to update view without debounce
        this.handleSearch({ target: { value: '', id: 'searchInput' } });
    },

    _updateClearButtons(query) {
        const hasQuery = query.length > 0;
        const desktopClearBtn = document.getElementById('searchClearBtn');
        if (desktopClearBtn) desktopClearBtn.classList.toggle('visible', hasQuery);
        const mobileClearBtn = document.getElementById('mobileSearchClearBtn');
        if (mobileClearBtn) mobileClearBtn.classList.toggle('visible', hasQuery);
    },

    handleTagInput(event) {
        const input = event.target;
        const container = document.getElementById('tagSuggestions');
        if (!container) return;
        
        const value = input.value;
        const parts = value.split(',');
        const currentPart = parts[parts.length - 1].trim().toLowerCase();

        state.ui.tagSuggestionIndex = -1;
        if (!currentPart) {
            container.classList.remove('visible');
            return;
        }

        const allTags = getAllTags();
        const matches = Array.from(allTags).filter(tag => tag.toLowerCase().includes(currentPart)).slice(0, 10);

        if (matches.length === 0) {
            container.classList.remove('visible');
            return;
        }

        container.innerHTML = matches.map(tag => 
            '<span class="tag-suggestion-item" data-action="select-tag-suggestion" data-tag="' + escapeHtml(tag) + '">' + escapeHtml(tag) + '</span>'
        ).join('');
        container.classList.add('visible');
    },

    handleTagKeydown(event) {
        const container = document.getElementById('tagSuggestions');
        if (!container || !container.classList.contains('visible')) return;

        const items = container.querySelectorAll('.tag-suggestion-item');
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            state.ui.tagSuggestionIndex = Math.min(state.ui.tagSuggestionIndex + 1, items.length - 1);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (state.ui.tagSuggestionIndex > 0) {
                state.ui.tagSuggestionIndex--;
            }
        } else if (event.key === 'Enter' && state.ui.tagSuggestionIndex >= 0) {
            event.preventDefault();
            const focused = items[state.ui.tagSuggestionIndex];
            if (focused) this.selectTagSuggestion(focused.dataset.tag);
        } else if (event.key === 'Escape') {
            container.classList.remove('visible');
            return;
        }
        
        items.forEach((el, i) => el.classList.toggle('focused', i === state.ui.tagSuggestionIndex));
    },

    selectTagSuggestion(tag) {
        const input = document.getElementById('promptTags');
        if (!input) return;
        const parts = input.value.split(',');
        parts[parts.length - 1] = ' ' + tag;
        input.value = parts.map(p => p.trim()).filter(Boolean).join(', ') + ', ';
        input.focus();
        const container = document.getElementById('tagSuggestions');
        if (container) container.classList.remove('visible');
    }
};