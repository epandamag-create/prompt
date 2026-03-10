import { state, stateManager } from '../state.js';
import { collectionService } from '../services/collection-service.js';
import { categoryService } from '../services/category-service.js';
import { createCategoryModel } from '../models/category.js';
import { closeModal, showConfirm } from '../view/modal.js';
import { showToast } from '../view/ui.js';
import { getCollectionFormData, getCategoryFormData } from '../view/form.js';
import { renderAll, updateCollectionDropdown, updateCategoryDropdown } from '../view/render.js';
import { clearPromptCache } from '../services/prompt-service.js';

export const taxonomyController = {
    saveCollection() {
        const formData = getCollectionFormData();
        const isEditing = !!state.editingCollectionId;

        if (isEditing) {
            collectionService.update(state.editingCollectionId, formData);
        } else {
            collectionService.create(formData);
        }

        stateManager.save();
        renderAll({ collections: true, prompts: true });
        updateCollectionDropdown();
        
        closeModal('collectionModal');
        showToast(isEditing ? 'Collection updated!' : 'Collection created!', 'success');
    },

    deleteCollectionWithConfirm(id) {
        const collection = collectionService.getById(id);
        if (!collection) return;

        const affectedCount = state.prompts.filter(p => p.collectionId === id).length;
        
        const confirmMessage = affectedCount > 0
            ? `Delete "${collection.name}"? ${affectedCount} prompt${affectedCount > 1 ? 's' : ''} will be unlinked.`
            : `Delete "${collection.name}"?`;

        showConfirm(
            confirmMessage,
            'Delete Collection',
            'Delete',
            () => {
                stateManager.deleteCollection(id);
                clearPromptCache();
                stateManager.commit({ collections: true, prompts: true });
                updateCollectionDropdown();
                showToast('Collection deleted', 'success');
            }
        );
    },

    saveCategory() {
        const formData = getCategoryFormData();
        const isEditing = !!state.editingCategoryId;

        if (isEditing) {
            stateManager.updateCategory(state.editingCategoryId, formData);
        } else {
            stateManager.addCategory(createCategoryModel(formData));
        }

        stateManager.save();
        renderAll({ categories: true, prompts: true });
        updateCategoryDropdown();
        
        closeModal('categoryModal');
        showToast(isEditing ? 'Category updated!' : 'Category created!', 'success');
    },

    deleteCategoryWithConfirm(id) {
        const category = categoryService.getById(id);
        if (!category) return;

        const affectedCount = state.prompts.filter(p => p.categoryId === id).length;
        
        const confirmMessage = affectedCount > 0
            ? `Delete "${category.name}"? ${affectedCount} prompt${affectedCount > 1 ? 's' : ''} will be unlinked.`
            : `Delete "${category.name}"?`;

        showConfirm(
            confirmMessage,
            'Delete Category',
            'Delete',
            () => {
                stateManager.deleteCategory(id);
                clearPromptCache();
                stateManager.commit({ categories: true, prompts: true });
                updateCategoryDropdown();
                showToast('Category deleted', 'success');
            }
        );
    }
};