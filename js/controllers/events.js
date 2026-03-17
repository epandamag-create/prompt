import { state, stateManager } from '../state.js';
import { initializeEventListeners } from '../services/event-setup-service.js';
import { 
    renderAll, updateCollectionDropdown, updateCategoryDropdown 
} from '../view/render.js';
import { eventRouter } from '../utils/event-router.js';
import { hotkeyManager } from '../services/hotkey-manager.js';
import { appInitializer } from '../services/app-initializer.js';
import { modalController } from './modal-controller.js';
import { searchController } from './search-controller.js';
import { ioController } from './io-controller.js';
import { bulkController } from './bulk-controller.js';
import { sidebarController } from './sidebar-controller.js';
import { promptController } from './prompt-controller.js';
import { taxonomyController } from './taxonomy-controller.js';
import { toolbarController } from './toolbar-controller.js';
import { filterController } from './filter-controller.js';
import { toggleDropdown, closeDropdown } from '../view/ui.js';
import { historyService } from '../services/history-service.js';

// ============================================
// EVENT ROUTER REGISTRATION
// ============================================
function registerEventHandlers() {
    // Prompt Card Actions - используем originalId для получения реального ID
    eventRouter.register('edit', (el) => {
        const card = el.closest('.prompt-card');
        if (card) {
            const cardId = card.dataset.originalId;
            state.editingPromptId = cardId;
            modalController.openWithConfig('promptModal', 'edit', state.prompts.find(p => p.id === cardId));
        }
    });

    eventRouter.register('delete', (el) => {
        const card = el.closest('.prompt-card');
        if (card) promptController.delete(card.dataset.originalId);
    });

    eventRouter.register('copy', (el) => {
        const card = el.closest('.prompt-card');
        if (card) promptController.copy(card.dataset.originalId);
    });

    eventRouter.register('clone', (el) => {
        const card = el.closest('.prompt-card');
        if (card) promptController.clone(card.dataset.originalId);
    });

    eventRouter.register('toggle-favorite', (el) => {
        const card = el.closest('.prompt-card');
        if (card) promptController.toggleFavorite(card.dataset.originalId);
    });

    eventRouter.register('select', (el, e) => {
        if (e && typeof e.stopPropagation === 'function') {
            e.stopPropagation();
        }
        
        const card = el.closest('.prompt-card');
        
        if (card && card.dataset && card.dataset.originalId) {
            bulkController.toggleBulkSelect(card.dataset.originalId, e);
        }
    });

    // Modals - Open
    eventRouter.register('show-add-prompt-modal', () => {
        state.editingPromptId = null;
        modalController.openWithConfig('promptModal', 'add');
    });

    eventRouter.register('show-add-collection-modal', () => {
        state.editingCollectionId = null;
        modalController.openWithConfig('collectionModal', 'add');
    });

    eventRouter.register('show-add-category-modal', () => {
        state.editingCategoryId = null;
        modalController.openWithConfig('categoryModal', 'add');
    });

    eventRouter.register('show-import-modal', () => ioController.showImportModal());

    eventRouter.register('show-edit-collection-modal', (el, e, data) => {
        e.stopPropagation();
        modalController.showEditCollection(data.id);
    });

    eventRouter.register('delete-collection', (el, e, data) => {
        e.stopPropagation();
        taxonomyController.deleteCollectionWithConfirm(data.id);
    });

    eventRouter.register('show-edit-category-modal', (el, e, data) => {
        e.stopPropagation();
        modalController.showEditCategory(data.id);
    });

    eventRouter.register('delete-category', (el, e, data) => {
        e.stopPropagation();
        taxonomyController.deleteCategoryWithConfirm(data.id);
    });

    // Modals - Hide
    eventRouter.register('hide-prompt-modal', (el, e) => {
        if (el.classList.contains('modal-overlay') && e.target !== el) return;
        modalController.closeWithCheck('promptModal', e);
    });

    eventRouter.register('hide-collection-modal', (el, e) => {
        if (el.classList.contains('modal-overlay') && e.target !== el) return;
        modalController.closeWithCheck('collectionModal', e);
    });

    eventRouter.register('hide-category-modal', (el, e) => {
        if (el.classList.contains('modal-overlay') && e.target !== el) return;
        modalController.closeWithCheck('categoryModal', e);
    });

    eventRouter.register('hide-use-prompt-modal', (el, e) => {
        if (el.classList.contains('modal-overlay') && e.target !== el) return;
        modalController.closeWithCheck('usePromptModal', e);
    });

    eventRouter.register('hide-import-modal', (el, e) => {
        if (el.classList.contains('modal-overlay') && e.target !== el) return;
        modalController.closeWithCheck('importModal', e);
    });

    eventRouter.register('hide-bulk-move-modal', (el, e) => {
        if (el.classList.contains('modal-overlay') && e.target !== el) return;
        bulkController.hideMoveToCollectionModal(e);
    });

    eventRouter.register('hide-bulk-move-category-modal', (el, e) => {
        if (el.classList.contains('modal-overlay') && e.target !== el) return;
        bulkController.hideMoveToCategoryModal(e);
    });

    eventRouter.register('hide-bulk-edit-tags-modal', (el, e) => {
        if (el.classList.contains('modal-overlay') && e.target !== el) return;
        bulkController.hideEditTagsModal(e);
    });

    eventRouter.register('hide-confirm-modal', () => modalController.hideConfirm());

    // Forms
    eventRouter.register('submit-form', (el, e, data) => {
        document.getElementById(data.formId)?.requestSubmit();
    });

    eventRouter.register('copy-final-prompt', () => variableService.copyFinalPrompt());
    eventRouter.register('clear-variable-values', () => promptController.clearVariableValues());
    
    eventRouter.register('import-prompts', () => ioController.importPrompts());
    eventRouter.register('toggle-export-menu', () => ioController.showExportModal());
    eventRouter.register('export-current-view', () => ioController.showExportModal('filtered'));
    eventRouter.register('hide-export-modal', (el, e) => {
        if (el.classList.contains('modal-overlay') && e.target !== el) return;
        ioController.hideExportModal();
    });
    eventRouter.register('execute-export', () => ioController.exportPrompts());
    eventRouter.register('execute-bulk-move', () => bulkController.executeMove());
    eventRouter.register('execute-bulk-move-category', () => bulkController.executeMoveToCategory());

    // Sidebar & Views
    eventRouter.register('toggle-sidebar', () => sidebarController.toggleSidebar());

    eventRouter.register('toggle-sidebar-section', (el, e, data) => {
        if (data.section) sidebarController.toggleSection(data.section);
    });

    eventRouter.register('close-mobile-sidebar', () => sidebarController.closeMobileSidebar());

    eventRouter.register('set-view', (el, e, data) => {
        sidebarController.setView(data.view);
    });

    // FILTER ACTIONS
    eventRouter.register('set-collection-view', (el, e, data) => {
        filterController.toggleCollection(data.id);
    });

    eventRouter.register('set-category-view', (el, e, data) => {
        filterController.toggleCategory(data.id);
    });

    eventRouter.register('set-tag-view', (el, e, data) => {
        filterController.toggleTag(data.tag);
    });

    // Tag click in prompt card
    eventRouter.register('filter-tag', (el, e, data) => {
        e.stopPropagation();
        filterController.toggleTag(data.tag); 
    });

    // Category click in prompt card
    eventRouter.register('filter-category', (el, e, data) => {
        e.stopPropagation();
        filterController.toggleCategory(data.id);
    });

    // Collection click in prompt card
    eventRouter.register('filter-collection', (el, e, data) => {
        e.stopPropagation();
        filterController.toggleCollection(data.id);
    });

    eventRouter.register('clear-all-filters', () => filterController.clearAll());

    // Toolbar
    eventRouter.register('toggle-theme', () => toolbarController.toggleTheme());
    eventRouter.register('set-view-mode', (el, e, data) => toolbarController.setViewMode(data.mode));
    eventRouter.register('toggle-density-menu', () => toggleDropdown('densityDropdown'));
    eventRouter.register('set-density', (el, e, data) => toolbarController.setDensity(data.density));
    eventRouter.register('toggle-sort-menu', () => toggleDropdown('sortDropdown'));
    eventRouter.register('set-sort', (el, e, data) => toolbarController.setSort(data.sort));
    eventRouter.register('toggle-shortcuts-menu', () => toggleDropdown('shortcutsDropdown'));
    eventRouter.register('close-dropdown', (el, e, data) => closeDropdown(data.id));

    // Search
    eventRouter.register('clear-search', () => searchController.clearSearch());
    eventRouter.register('clear-mobile-search', () => searchController.clearSearch());

    // Bulk Actions
    eventRouter.register('bulk-select-all', () => bulkController.selectAll());
    eventRouter.register('bulk-clear-selection', () => bulkController.clearSelection());
    eventRouter.register('bulk-delete', () => bulkController.deleteSelected());
    eventRouter.register('bulk-toggle-favorite', () => bulkController.toggleFavorite());
    eventRouter.register('bulk-move-to-collection', () => bulkController.showMoveToCollectionModal());
    eventRouter.register('bulk-move-to-category', () => bulkController.showMoveToCategoryModal());
    eventRouter.register('bulk-edit-tags', () => bulkController.showEditTagsModal());
    eventRouter.register('bulk-tags-set-mode', (el) => bulkController.setTagsMode(el.dataset.mode));
    eventRouter.register('bulk-tags-click-badge', (el) => {
        const input = document.getElementById('bulkTagsInput');
        if (!input) return;
        const tag = el.dataset.tag;
        const existing = input.value.split(',').map(t => t.trim()).filter(Boolean);
        if (!existing.includes(tag)) {
            input.value = existing.length ? existing.join(', ') + ', ' + tag : tag;
        }
    });
    eventRouter.register('execute-bulk-edit-tags', () => bulkController.executeEditTags());

    // Tag Suggestions
    eventRouter.register('select-tag-suggestion', (el, e, data) => {
        searchController.selectTagSuggestion(data.tag);
    });

    // Preview Modal handlers
    eventRouter.register('hide-preview-modal', (el, e) => {
        if (el.classList.contains('modal-overlay') && e.target !== el) return;
        modalController.closePreview();
    });

    eventRouter.register('copy-preview', () => {
        promptController.copyPreview();
    });
}

// ============================================
// EVENT LISTENERS & INIT
// ============================================
export function setupEventListeners() {
    // First set up event router
    eventRouter.listen(document.body, 'click');
    
    // Register all handlers
    registerEventHandlers();
    
    // Also call initializeEventListeners for additional setup
    initializeEventListeners();
}

// ============================================
// HOTKEYS
// ============================================
const APP_HOTKEYS = [
    { key: 'z', ctrl: true, shift: false, context: 'global', description: 'Undo', handler: () => historyService.undo() },
    { key: 'z', ctrl: true, shift: true, context: 'global', description: 'Redo', handler: () => historyService.redo() },
    { key: 'Escape', context: 'always', description: 'Close modal', handler: () => modalController.closeTopModal() },
    { key: 's', ctrl: true, context: 'modal', description: 'Save (in modal)', handler: () => modalController.saveCurrentModal() },
    { key: 'b', ctrl: true, context: 'global', description: 'New Prompt', handler: () => modalController.openWithConfig('promptModal', 'add') },
    { key: 'k', ctrl: true, context: 'global', description: 'Search', handler: () => document.getElementById('searchInput').focus() },
    { key: 'i', ctrl: true, context: 'global', description: 'Import', handler: () => ioController.showImportModal() },
    { key: 'e', ctrl: true, context: 'global', description: 'Export', handler: () => ioController.exportPrompts() },
    { key: '\\', context: 'global', description: 'Toggle Sidebar', handler: () => document.getElementById('sidebarToggleBtn').click() },
    // New hotkeys
    { key: 'd', ctrl: true, context: 'global', description: 'Duplicate selected', handler: () => promptController.cloneSelected() },
    { key: 'p', ctrl: true, context: 'global', description: 'Preview selected', handler: () => promptController.previewSelected() },
    // Card hotkeys (fire when a card is hovered)
    { key: 'e', context: 'global', description: 'Edit hovered card', handler: () => {
        const id = state.ui.hoveredCardId;
        if (id) { state.editingPromptId = id; modalController.openWithConfig('promptModal', 'edit', state.prompts.find(p => p.id === id)); }
    }},
    { key: 'c', context: 'global', description: 'Copy hovered card', handler: () => {
        const id = state.ui.hoveredCardId;
        if (id) promptController.copy(id);
    }},
    { key: 'f', context: 'global', description: 'Toggle favorite hovered card', handler: () => {
        const id = state.ui.hoveredCardId;
        if (id) promptController.toggleFavorite(id);
    }},
    { key: 'Delete', context: 'global', description: 'Delete hovered/selected', handler: () => {
        const id = state.ui.hoveredCardId;
        if (id) promptController.delete(id); else bulkController.deleteSelected();
    }},
];

// ============================================
// INIT
// ============================================
export async function init() {
    await appInitializer.initialize(() => {
        hotkeyManager.registerAll(APP_HOTKEYS);
        hotkeyManager.init();
        hotkeyManager.renderShortcuts('shortcutsList');

        setupEventListeners();
        renderAll();
        updateCollectionDropdown();
        updateCategoryDropdown();
    });
}
