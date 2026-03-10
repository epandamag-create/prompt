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
    
    const promptTags = document.getElementById('promptTags');
    if (promptTags) {
        promptTags.addEventListener('input', (e) => searchController.handleTagInput(e));
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

// Export for external use
export {};
