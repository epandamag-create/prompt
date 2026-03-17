import { state } from '../state.js';
import { viewService } from '../services/view-service.js';
import { promptService, getFilteredPrompts } from '../services/prompt-service.js';
import { openModal, showConfirm } from '../view/modal.js';
import { escapeHtml } from '../utils/helpers.js';
import { showToast } from '../view/ui.js';
import { modalController } from './modal-controller.js';

export const bulkController = {
    toggleBulkSelect(id, event) {
        if (event && event.stopPropagation) {
            event.stopPropagation();
        }
        viewService.togglePromptSelection(id);
    },

    selectAll() {
        const prompts = getFilteredPrompts();
        viewService.selectAll(prompts);
    },

    clearSelection() {
        viewService.clearSelection();
    },

    deleteSelected() {
        const count = state.ui.selectedPrompts.size;
        if (count === 0) return;
        
        showConfirm(
            `Delete ${count} selected prompt${count > 1 ? 's' : ''}? You can undo with Ctrl+Z (this session only — undo history is lost on page reload).`,
            'Bulk Delete',
            'Delete All',
            () => {
                promptService.bulkDeletePrompts(state.ui.selectedPrompts);
            }
        );
    },

    toggleFavorite() {
        promptService.bulkToggleFavorites(state.ui.selectedPrompts);
        viewService.clearSelection();
        viewService.updateBulkUI();
    },

    showMoveToCollectionModal() {
        // Populate collections list in the modal
        const container = document.getElementById('bulkMoveCollectionsList');
        if (container && state.collections) {
            container.innerHTML = state.collections.map(collection => `
                <label class="dropdown-option bulk-move-option" style="cursor: pointer; padding: 10px; border-radius: var(--radius-md); transition: background var(--transition-fast);">
                    <input type="radio" name="bulkMoveCollection" value="${escapeHtml(collection.id)}" style="margin-right: 8px; accent-color: var(--accent);">
                    <strong>${escapeHtml(collection.name)}</strong>
                </label>
            `).join('');
        }
        openModal('bulkMoveModal');
    },

    hideMoveToCollectionModal(event) {
        modalController.closeWithCheck('bulkMoveModal', event);
        document.querySelectorAll('input[name="bulkMoveCollection"]').forEach(input => {
            input.checked = false;
        });
    },

    executeMove() {
        const selected = document.querySelector('input[name="bulkMoveCollection"]:checked');
        if (!selected) {
            showToast('Please select a collection', 'error');
            return;
        }

        const collectionId = selected.value || null;
        promptService.bulkMoveToCollectionPrompt(state.ui.selectedPrompts, collectionId);
        viewService.clearSelection();
        this.hideMoveToCollectionModal(null);
    },

    showMoveToCategoryModal() {
        const container = document.getElementById('bulkMoveCategoriesList');
        if (container && state.categories) {
            container.innerHTML = state.categories.map(cat => `
                <label class="dropdown-option bulk-move-option" style="cursor: pointer; padding: 10px; border-radius: var(--radius-md); transition: background var(--transition-fast);">
                    <input type="radio" name="bulkMoveCategory" value="${escapeHtml(cat.id)}" style="margin-right: 8px; accent-color: var(--accent);">
                    <strong>${escapeHtml(cat.name)}</strong>
                </label>
            `).join('');
        }
        const countEl = document.getElementById('bulkMoveCategoryCount');
        if (countEl) countEl.textContent = state.ui.selectedPrompts.size;
        openModal('bulkMoveCategoryModal');
    },

    hideMoveToCategoryModal(event) {
        modalController.closeWithCheck('bulkMoveCategoryModal', event);
        document.querySelectorAll('input[name="bulkMoveCategory"]').forEach(input => {
            input.checked = false;
        });
    },

    showEditTagsModal() {
        const ids = state.ui.selectedPrompts;
        const count = ids.size;
        if (count === 0) return;

        const countEl = document.getElementById('bulkEditTagsCount');
        const pluralEl = document.getElementById('bulkEditTagsPlural');
        if (countEl) countEl.textContent = count;
        if (pluralEl) pluralEl.textContent = count === 1 ? '' : 's';

        // Collect all unique tags from selected prompts
        const tagSet = new Set();
        state.prompts.forEach(p => {
            if (ids.has(p.id) && p.tags) p.tags.forEach(t => tagSet.add(t));
        });

        const container = document.getElementById('bulkTagsCurrentList');
        if (container) {
            if (tagSet.size === 0) {
                container.innerHTML = '<span class="bulk-tags-empty">No tags on selected prompts</span>';
            } else {
                container.innerHTML = [...tagSet].sort().map(tag =>
                    `<span class="bulk-tag-badge" data-action="bulk-tags-click-badge" data-tag="${escapeHtml(tag)}">#${escapeHtml(tag)}</span>`
                ).join('');
            }
        }

        // Reset mode to 'add'
        document.querySelectorAll('.bulk-tags-mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === 'add');
        });

        const input = document.getElementById('bulkTagsInput');
        if (input) input.value = '';

        openModal('bulkEditTagsModal');
    },

    hideEditTagsModal(event) {
        modalController.closeWithCheck('bulkEditTagsModal', event);
    },

    setTagsMode(mode) {
        document.querySelectorAll('.bulk-tags-mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
    },

    executeEditTags() {
        const activeBtn = document.querySelector('.bulk-tags-mode-btn.active');
        const mode = activeBtn ? activeBtn.dataset.mode : 'add';
        const input = document.getElementById('bulkTagsInput');
        const tags = input ? input.value.split(',').map(t => t.trim()).filter(Boolean) : [];

        if (tags.length === 0 && mode !== 'replace') {
            showToast('Please enter at least one tag', 'error');
            return;
        }

        promptService.bulkEditTags(state.ui.selectedPrompts, mode, tags);
        viewService.clearSelection();
        this.hideEditTagsModal(null);
    },

    executeMoveToCategory() {
        const selected = document.querySelector('input[name="bulkMoveCategory"]:checked');
        if (!selected) {
            showToast('Please select a category', 'error');
            return;
        }

        const categoryId = selected.value || null;
        promptService.bulkMoveToCategoryPrompt(state.ui.selectedPrompts, categoryId);
        viewService.clearSelection();
        this.hideMoveToCategoryModal(null);
    }
};