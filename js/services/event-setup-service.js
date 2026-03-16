/**
 * Event Setup Service - Centralizes DOM event listener registration
 * Provides consistent pattern for app-wide event handling
 */
import { state, stateManager } from '../state.js';
import { eventRouter } from '../utils/event-router.js';
import { 
    showToast, 
    toggleDropdown, 
    openDropdown, 
    closeDropdown,
    updateBulkUI 
} from '../view/ui.js';
import { 
    openModal, 
    closeModal, 
    getTopModal, 
    showConfirm, 
    hideConfirmModal 
} from '../view/modal.js';
import { 
    getPromptFormData, 
    populatePromptForm, 
    resetPromptForm, 
    updateCharCounter, 
    previewVariables 
} from '../view/form.js';
import { getFilteredPrompts } from '../services/prompt-service.js';
import { promptService } from './prompt-service.js';
import { escapeHtml, debounce } from '../utils/helpers.js';
import { SEARCH_DEBOUNCE_MS } from '../config/constants.js';
import { renderAll } from '../view/render.js';
import { searchController } from '../controllers/search-controller.js';
import { taxonomyController } from '../controllers/taxonomy-controller.js';

// Track initialization to prevent duplicate event listeners
let _initialized = false;

/**
 * Initialize all event listeners in one place
 * Only runs once - subsequent calls are ignored
 */
export function initializeEventListeners() {
    if (_initialized) return;
    _initialized = true;
    
    // 2. Dropdown close logic
    setupDropdownCloseHandlers();
    
    // 3. Tag suggestions
    setupTagSuggestionHandlers();
    
    // 4. Form handlers
    setupFormHandlers();
    
    // 5. Search handlers
    setupSearchHandlers();
    
    // 6. Confirm dialog handlers
    setupConfirmHandlers();
    
    // 7. Keyboard shortcuts
    // Handled by hotkeyManager in events.js init()
    
    // 8. Window events
    setupWindowHandlers();
    
    // 9. Prompt content hover tooltip
    setupPromptContentHover();

    // 10. Sidebar drag-and-drop reordering
    setupSidebarDragHandlers();

    // 11. Card hover tracking for hotkeys
    setupCardHoverTracking();

    // 12. Card keyboard navigation
    setupCardKeyboardNavigation();
}

function setupDropdownCloseHandlers() {
    document.addEventListener('click', (e) => {
        if (state.ui.openDropdowns.size === 0) return;
        
        state.ui.openDropdowns.forEach(dropdownId => {
            const dropdown = document.getElementById(dropdownId);
            if (dropdown && !dropdown.contains(e.target)) {
                const toggleSelectors = {
                    'densityDropdown': '[data-action="toggle-density-menu"]',
                    'sortDropdown': '[data-action="toggle-sort-menu"]',
                    'shortcutsDropdown': '[data-action="toggle-shortcuts-menu"]'
                };
                const toggleSelector = toggleSelectors[dropdownId];
                if (!toggleSelector || !e.target.closest(toggleSelector)) {
                    closeDropdown(dropdownId);
                }
            }
        });
    });
}

function setupTagSuggestionHandlers() {
    document.addEventListener('click', (e) => {
        const container = document.getElementById('tagSuggestions');
        if (container && !container.contains(e.target) && !e.target.closest('#promptTags')) {
            container.classList.remove('visible');
        }
    });
}

function setupFormHandlers() {
    document.body.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Handle form submissions
        if (e.target.id === 'promptForm') {
            promptService.savePrompt();
        } else if (e.target.id === 'collectionForm') {
            taxonomyController.saveCollection();
        } else if (e.target.id === 'categoryForm') {
            taxonomyController.saveCategory();
        }
    });
    
    const promptContent = document.getElementById('promptContent');
    if (promptContent) {
        promptContent.addEventListener('input', () => {
            previewVariables();
            updateCharCounter();
        });
    }

    const promptTitle = document.getElementById('promptTitle');
    if (promptTitle) {
        promptTitle.addEventListener('input', () => {
            const len = promptTitle.value.length;
            const MAX = 200;
            let hint = promptTitle.parentNode.querySelector('.title-length-hint');
            if (!hint) {
                hint = document.createElement('small');
                hint.className = 'title-length-hint';
                hint.style.cssText = 'display:block;font-size:11px;margin-top:2px;';
                promptTitle.parentNode.appendChild(hint);
            }
            if (len > MAX) {
                hint.textContent = `Title too long: ${len}/${MAX}`;
                hint.style.color = 'var(--error)';
                promptTitle.style.borderColor = 'var(--error)';
            } else if (len > MAX * 0.85) {
                hint.textContent = `${len}/${MAX} characters`;
                hint.style.color = 'var(--warning)';
                promptTitle.style.borderColor = '';
            } else {
                hint.textContent = '';
                promptTitle.style.borderColor = '';
            }
        });
    }

    const promptTags = document.getElementById('promptTags');
    if (promptTags) {
        promptTags.addEventListener('input', (e) => {
            searchController.handleTagInput(e);
            const tags = promptTags.value.split(',').map(t => t.trim()).filter(Boolean);
            const MAX_TAGS = 10;
            let hint = promptTags.parentNode.querySelector('.tags-count-hint');
            if (!hint) {
                hint = document.createElement('small');
                hint.className = 'tags-count-hint';
                hint.style.cssText = 'display:block;font-size:11px;margin-top:2px;';
                promptTags.parentNode.appendChild(hint);
            }
            if (tags.length > MAX_TAGS) {
                hint.textContent = `Too many tags: ${tags.length}/${MAX_TAGS} max`;
                hint.style.color = 'var(--error)';
            } else if (tags.length >= MAX_TAGS - 2) {
                hint.textContent = `${tags.length}/${MAX_TAGS} tags`;
                hint.style.color = 'var(--warning)';
            } else {
                hint.textContent = '';
            }
        });
        promptTags.addEventListener('keydown', (e) => searchController.handleTagKeydown(e));
    }
}

function setupSearchHandlers() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => searchController.handleSearch(e));
    }
    
    const mobileSearchInput = document.getElementById('mobileSearchInput');
    if (mobileSearchInput) {
        mobileSearchInput.addEventListener('input', (e) => searchController.handleSearch(e));
    }
}

function setupConfirmHandlers() {
    const confirmOkBtn = document.getElementById('confirmModalOkBtn');
    if (confirmOkBtn) {
        confirmOkBtn.addEventListener('click', () => {
            if (state.ui.confirmCallback && state.ui.currentConfirmId > 0) {
                state.ui.confirmCallback();
            }
            hideConfirmModal();
        });
    }
    
    const confirmCancelBtn = document.getElementById('confirmModalCancelBtn');
    if (confirmCancelBtn) {
        confirmCancelBtn.addEventListener('click', () => hideConfirmModal());
    }
}

function setupWindowHandlers() {
    window.addEventListener('beforeunload', () => stateManager.save(true));
}

// ============================================
// Event Handlers (extracted for clarity)
// ============================================

// ============================================
// Prompt Content Hover Tooltip
// ============================================
function setupPromptContentHover() {
    let tooltipEl = null;
    let hideTimeout = null;
    
    // Create tooltip element
    function createTooltip() {
        if (tooltipEl) return tooltipEl;
        tooltipEl = document.createElement('div');
        tooltipEl.id = 'promptContentTooltip';
        tooltipEl.className = 'prompt-content-tooltip';
        tooltipEl.style.cssText = `
            position: fixed;
            z-index: 1000;
            background: var(--bg-secondary, #1e1e1e);
            border: 1px solid var(--border-color, #3a3a3a);
            border-radius: 8px;
            padding: 12px;
            max-width: 400px;
            max-height: 300px;
            overflow-y: auto;
            font-family: var(--font-mono, monospace);
            font-size: 12px;
            color: var(--text-primary, #e0e0e0);
            white-space: pre-wrap;
            word-break: break-word;
            box-shadow: 0 4px 20px rgba(0,0,0,0.4);
            display: none;
            pointer-events: none;
        `;
        document.body.appendChild(tooltipEl);
        return tooltipEl;
    }
    
    document.addEventListener('mouseover', (e) => {
        const contentEl = e.target.closest('.prompt-content');
        if (!contentEl) return;
        
        clearTimeout(hideTimeout);
        
        const content = contentEl.dataset.promptContent;
        if (!content) return;
        
        const tooltip = createTooltip();
        tooltip.textContent = content;
        tooltip.style.display = 'block';
        
        // Position tooltip
        const rect = contentEl.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let left = rect.left;
        let top = rect.bottom + 8;
        
        // Keep tooltip within viewport
        if (left + tooltipRect.width > window.innerWidth - 20) {
            left = window.innerWidth - tooltipRect.width - 20;
        }
        if (top + tooltipRect.height > window.innerHeight - 20) {
            top = rect.top - tooltipRect.height - 8;
        }
        
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
    });
    
    document.addEventListener('mouseout', (e) => {
        const contentEl = e.target.closest('.prompt-content');
        if (!contentEl) return;
        
        hideTimeout = setTimeout(() => {
            if (tooltipEl) {
                tooltipEl.style.display = 'none';
            }
        }, 200);
    });
}

// ============================================
// Sidebar Drag-and-Drop Reordering
// ============================================
function setupSidebarDragHandlers() {
    let dragSrcId = null;
    let dragType = null; // 'collection' or 'category'

    document.addEventListener('dragstart', (e) => {
        const item = e.target.closest('.collection-item, .category-item');
        if (!item) return;
        dragType = item.classList.contains('collection-item') ? 'collection' : 'category';
        dragSrcId = item.dataset.originalId;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', dragSrcId);
    });

    document.addEventListener('dragend', () => {
        document.querySelectorAll('.collection-item, .category-item').forEach(el => {
            el.classList.remove('dragging', 'drag-over');
        });
    });

    document.addEventListener('dragover', (e) => {
        const item = e.target.closest('.collection-item, .category-item');
        if (!item) return;
        const type = item.classList.contains('collection-item') ? 'collection' : 'category';
        if (type !== dragType) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        document.querySelectorAll(`.${dragType}-item`).forEach(el => el.classList.remove('drag-over'));
        item.classList.add('drag-over');
    });

    document.addEventListener('drop', (e) => {
        const item = e.target.closest('.collection-item, .category-item');
        if (!item) return;
        const type = item.classList.contains('collection-item') ? 'collection' : 'category';
        if (type !== dragType) return;
        e.preventDefault();
        const dropId = item.dataset.originalId;
        if (dragSrcId === dropId) return;

        const arr = dragType === 'collection' ? state.collections : state.categories;
        const fromIdx = arr.findIndex(x => x.id === dragSrcId);
        const toIdx = arr.findIndex(x => x.id === dropId);
        if (fromIdx === -1 || toIdx === -1) return;

        arr.splice(toIdx, 0, arr.splice(fromIdx, 1)[0]);
        stateManager.save();
        renderAll();
    });
}

// ============================================
// Card Arrow-Key Navigation
// ============================================
function setupCardKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        if (state.ui.openModals.size > 0) return;
        if (document.activeElement && document.activeElement.matches('input, textarea, select')) return;
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;

        const cards = [...document.querySelectorAll('.prompt-card')];
        if (cards.length === 0) return;

        e.preventDefault();
        const currentIndex = cards.indexOf(document.activeElement);
        let nextIndex;

        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            nextIndex = currentIndex < cards.length - 1 ? currentIndex + 1 : 0;
        } else {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : cards.length - 1;
        }

        cards[nextIndex].focus();
        state.ui.hoveredCardId = cards[nextIndex].dataset.originalId;
    });
}

// ============================================
// Card Hover Tracking for Hotkeys
// ============================================
function setupCardHoverTracking() {
    document.addEventListener('mouseover', (e) => {
        const card = e.target.closest('.prompt-card');
        state.ui.hoveredCardId = card ? card.dataset.originalId : null;
    });

    document.addEventListener('mouseout', (e) => {
        const card = e.target.closest('.prompt-card');
        if (card && !card.contains(e.relatedTarget)) {
            state.ui.hoveredCardId = null;
        }
    });
}

// Export for external use
export {};
