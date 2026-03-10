import { state } from '../state.js';
import { MODALS } from '../config/constants.js';
import { collectionService } from '../services/collection-service.js';
import { categoryService } from '../services/category-service.js';
import { openModal, closeModal, renderPreviewModal, showConfirm, getTopModal, hideConfirmModal } from '../view/modal.js';
import { 
    populatePromptForm, resetPromptForm, updateCharCounter, 
    initColorSwatches, previewVariables 
} from '../view/form.js';
import { updateCollectionDropdown, updateCategoryDropdown } from '../view/render.js';

const MODAL_CONFIG = {
    [MODALS.PROMPT]: {
        titleId: 'promptModalTitle',
        onReset: () => {
            resetPromptForm();
            updateCharCounter();
            updateCollectionDropdown();
            updateCategoryDropdown();
        },
        onPopulate: (data) => {
            populatePromptForm(data);
            const tagSuggestions = document.getElementById('tagSuggestions');
            if (tagSuggestions) tagSuggestions.classList.remove('visible');
            updateCharCounter();
            // Pass the prompt's collectionId and categoryId to preserve selection
            updateCollectionDropdown(data.collectionId);
            updateCategoryDropdown(data.categoryId);
            previewVariables();
        },
        hasUnsavedChanges: () => {
            const title = document.getElementById('promptTitle').value.trim();
            const content = document.getElementById('promptContent').value.trim();
            if (state.editingPromptId) {
                const prompt = state.prompts.find(p => p.id === state.editingPromptId);
                if (!prompt) return false;
                return title !== prompt.title || content !== prompt.content;
            }
            return title !== '' || content !== '';
        }
    },
    [MODALS.COLLECTION]: {
        titleId: 'collectionModalTitle',
        saveBtnId: 'collectionModalSaveBtn',
        onReset: () => {
            document.getElementById('collectionForm').reset();
            initColorSwatches('collectionColorSwatches', 'collectionColor', '#3b82f6');
        },
        onPopulate: (data) => {
            document.getElementById('collectionName').value = data.name;
            initColorSwatches('collectionColorSwatches', 'collectionColor', data.color || '#3b82f6');
        }
    },
    [MODALS.CATEGORY]: {
        titleId: 'categoryModalTitle',
        saveBtnId: 'categoryModalSaveBtn',
        onReset: () => {
            document.getElementById('categoryForm').reset();
            initColorSwatches('categoryColorSwatches', 'categoryColor', '#8b5cf6');
        },
        onPopulate: (data) => {
            document.getElementById('categoryName').value = data.name;
            initColorSwatches('categoryColorSwatches', 'categoryColor', data.color || '#8b5cf6');
        }
    }
};

export const modalController = {
    openWithConfig(modalId, mode, data = null) {
        const config = MODAL_CONFIG[modalId];
        if (!config) {
            openModal(modalId);
            return;
        }
        
        if (config.titleId) {
            const titleEl = document.getElementById(config.titleId);
            if (titleEl) {
                const type = modalId.replace('Modal', '');
                const typeName = type.charAt(0).toUpperCase() + type.slice(1);
                titleEl.textContent = mode === 'add' ? 'New ' + typeName : 'Edit ' + typeName;
            }
        }
        
        if (config.saveBtnId) {
            const btnEl = document.getElementById(config.saveBtnId);
            if (btnEl) btnEl.textContent = mode === 'add' ? 'Create' : 'Save';
        }

        if (modalId === 'promptModal') {
            const btnEl = document.getElementById('savePromptText');
            if (btnEl) btnEl.textContent = mode === 'add' ? 'Save' : 'Update';
        }

        if (mode === 'add' && config.onReset) config.onReset();
        else if (mode === 'edit' && config.onPopulate && data) config.onPopulate(data);

        openModal(modalId);
    },

    closeWithCheck(modalId, event, force = false) {
        const config = MODAL_CONFIG[modalId];
        if (!force && config?.hasUnsavedChanges && config.hasUnsavedChanges()) {
            showConfirm(
                'You have unsaved changes. Close anyway?',
                'Unsaved Changes',
                'Close',
                () => closeModal(modalId)
            );
            return;
        }
        closeModal(modalId);
    },

    showEditCollection(id) {
        const collection = collectionService.getById(id);
        if (!collection) return;
        state.editingCollectionId = id;
        this.openWithConfig('collectionModal', 'edit', collection);
    },

    showEditCategory(id) {
        const category = categoryService.getById(id);
        if (!category) return;
        state.editingCategoryId = id;
        this.openWithConfig('categoryModal', 'edit', category);
    },
    
    showPreview(prompt) {
        if (!prompt) return;
        renderPreviewModal(prompt);
    },

    closePreview() {
        closeModal('previewModal');
    },

    closeTopModal() {
        const topModal = getTopModal();
        if (topModal) {
            this.closeWithCheck(topModal, null, topModal !== 'promptModal');
        }
    },

    saveCurrentModal() {
        const topModal = getTopModal();
        if (topModal === 'promptModal') document.getElementById('promptForm')?.requestSubmit();
        else if (topModal === 'collectionModal') document.getElementById('collectionForm')?.requestSubmit();
        else if (topModal === 'categoryModal') document.getElementById('categoryForm')?.requestSubmit();
    },

    hideConfirm() {
        hideConfirmModal();
    }
};