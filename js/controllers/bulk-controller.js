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
            `Delete ${count} selected prompt${count > 1 ? 's' : ''}? You can undo this with Ctrl+Z.`,
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