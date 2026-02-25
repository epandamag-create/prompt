import { state } from '../state.js';
import { SAVE_DEBOUNCE_MS, MODALS, MODAL_PRIORITY, VIEWS, SORT_OPTIONS } from '../config/constants.js';
import { 
    saveToLocalStorage, loadFromLocalStorage, getStorageInfo,
    saveVariableValues, loadVariableValues, clearVariableValues as clearStorageVariables 
} from '../services/storage.js';
import { createPromptModel, duplicatePromptModel } from '../models/prompt.js';
import { createCollectionModel } from '../models/collection.js';
import { createCategoryModel } from '../models/category.js';
import { getFilteredPrompts, clearPromptCache } from '../services/prompt-service.js';
import { 
    renderAll, renderPrompts, renderFilterBar, updateStats, 
    updateSidebarHighlights, updateContentTitle, updateCollectionDropdown, 
    updateCategoryDropdown 
} from '../view/render.js';
import { validateAndSanitizeData } from '../services/validation.js';
import { 
    openModal, closeModal, getTopModal, 
    showConfirm, hideConfirmModal 
} from '../view/modal.js';
import { 
    showToast, applyTheme, applyDensity, applyViewMode, 
    applySidebarSection, closeDropdown, toggleDropdown, 
    updateBulkUI 
} from '../view/ui.js';
import { 
    getPromptFormData, populatePromptForm, resetPromptForm, 
    getCollectionFormData, getCategoryFormData, updateCharCounter, 
    initColorSwatches, previewVariables 
} from '../view/form.js';
import { 
    generateId, sanitizeId, escapeHtml, copyToClipboard, 
    escapeRegex, extractVariables, generatePlaceholder 
} from '../utils/helpers.js';

// ============================================
// STORAGE & STATE OPERATIONS
// ============================================
let saveTimeout;
let isInitialized = false;

function saveToStorage(immediate = false) {
    clearTimeout(saveTimeout);
    if (immediate) {
        performSave();
    } else {
        saveTimeout = setTimeout(performSave, SAVE_DEBOUNCE_MS);
    }
}

function performSave() {
    const data = {
        prompts: state.prompts,
        collections: state.collections,
        categories: state.categories,
        preferences: state.preferences,
        sidebarSections: state.sidebarSections
    };
    
    const result = saveToLocalStorage(data);
    if (!result.success && result.error?.name === 'QuotaExceededError') {
        const info = getStorageInfo();
        const sizeKB = info ? info.sizeKB : 'N/A';
        
        if (confirm(
            `⚠️ STORAGE FULL\n\n` +
            `Your data could not be saved due to storage limits.\n` +
            `Current size: ${sizeKB}KB\n` +
            `Limit: ~5MB\n\n` +
            `IMPORTANT: Your recent changes may be lost!\n\n` +
            `Click OK to export all data now (recommended).\n` +
            `Click Cancel to continue without saving.`
        )) {
            exportPrompts();
        }
        console.error('Error saving to storage:', result.error);
        showToast(`Failed to save data. Check console for errors.`, 'error');
    }
}

function commitState(updates = {}) {
    clearPromptCache();  // Invalidate cache when state changes
    saveToStorage();
    renderAll(updates);
}

// ============================================
// MODAL CONFIGURATION
// ============================================
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
            document.getElementById('tagSuggestions').classList.remove('visible');
            updateCharCounter();
            updateCollectionDropdown();
            updateCategoryDropdown();
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
// Generic modal open with configuration
function openModalWithConfig(modalId, mode, data = null) {
    const config = MODAL_CONFIG[modalId];
    if (!config) {
        openModal(modalId);
        return;
    }
// Set title if applicable
    if (config.titleId) {
        const titleEl = document.getElementById(config.titleId);
        if (titleEl) {
            const type = modalId.replace('Modal', '');
            const typeName = type.charAt(0).toUpperCase() + type.slice(1);
            titleEl.textContent = mode === 'add' ? `New ${typeName}` : `Edit ${typeName}`;
        }
    }
// Set save button text if applicable
    if (config.saveBtnId) {
        const btnEl = document.getElementById(config.saveBtnId);
        if (btnEl) btnEl.textContent = mode === 'add' ? 'Create' : 'Save';
    }
            // Set save button text for promptModal (different structure)

    if (modalId === 'promptModal') {
        const btnEl = document.getElementById('savePromptText');
        if (btnEl) btnEl.textContent = mode === 'add' ? 'Save' : 'Update';
    }
            // Reset or populate form

    if (mode === 'add' && config.onReset) config.onReset();
    else if (mode === 'edit' && config.onPopulate && data) config.onPopulate(data);

    openModal(modalId);
}

function closeModalWithCheck(modalId, event, force = false) {
    const config = MODAL_CONFIG[modalId];
    if (!force && config?.hasUnsavedChanges && config.hasUnsavedChanges()) {
        if (!confirm('You have unsaved changes. Close anyway?')) return;
    }
    closeModal(modalId);
}

// ============================================
// PROMPT ACTIONS
// ============================================
function savePrompt() {
    const formData = getPromptFormData();
    const isEditing = !!state.editingPromptId;

    if (isEditing) {
        const prompt = state.prompts.find(p => p.id === state.editingPromptId);
        if (prompt) {
            Object.assign(prompt, {
                ...formData,
                variables: extractVariables(formData.content),
                updatedAt: Date.now()
            });
            // Re-build search index
            prompt._searchIndex = [prompt.title, prompt.description, prompt.content, ...prompt.tags].join(' ').toLowerCase();
        }
    } else {
        const newPrompt = createPromptModel(formData);
        state.prompts.unshift(newPrompt);
    }

    commitState();
    closeModal('promptModal');
    showToast(isEditing ? 'Prompt updated!' : 'Prompt created!', 'success');
}

function deletePrompt(id) {
    const idx = state.prompts.findIndex(p => p.id === id);
    if (idx === -1) return;
    
    // Save neighbor IDs for undo positioning - get neighbors BEFORE splice
    const prevPrompt = state.prompts[idx - 1];
    const nextPrompt = state.prompts[idx + 1];  // FIX: was getting idx after splice (wrong element)
    const neighbors = {
        prevId: prevPrompt?.id || null,
        nextId: nextPrompt?.id || null
    };
    
    const deleted = state.prompts[idx];
    state.prompts.splice(idx, 1);

    commitState();
    showToast('Prompt deleted', 'success', () => {
        // Undo: restore prompt between its original neighbors
        let restoreIndex;
        if (neighbors.nextId) {
            restoreIndex = state.prompts.findIndex(p => p.id === neighbors.nextId);
            if (restoreIndex === -1) restoreIndex = state.prompts.length;
        } else if (neighbors.prevId) {
            const prevIndex = state.prompts.findIndex(p => p.id === neighbors.prevId);
            restoreIndex = prevIndex !== -1 ? prevIndex + 1 : state.prompts.length;
        } else {
            restoreIndex = 0;
        }
        
        state.prompts.splice(restoreIndex, 0, deleted);
        commitState();
        showToast('Prompt restored!', 'success');
    });
}

function clonePrompt(id) {
    const original = state.prompts.find(p => p.id === id);
    if (!original) return;
    
    const clone = duplicatePromptModel(original);
    const idx = state.prompts.findIndex(p => p.id === id);
    state.prompts.splice(idx + 1, 0, clone);
    
    commitState();
    showToast('Prompt duplicated!', 'success');
}

function toggleFavorite(id) {
    const prompt = state.prompts.find(p => p.id === id);
    if (prompt) {
        prompt.favorite = !prompt.favorite;
        prompt.updatedAt = Date.now();
        commitState({ prompts: true });
    }
}

// ============================================
// USE PROMPT LOGIC
// ============================================
function copyPrompt(id) {
    const prompt = state.prompts.find(p => p.id === id);
    if (!prompt) return;

    if (prompt.variables.length > 0) {
        showUsePromptModal(id);
    } else {
        copyToClipboard(prompt.content).then(() => {
            showToast('Prompt copied to clipboard!', 'success');
            prompt.usageCount++;
            prompt.lastUsed = Date.now();
            saveToStorage();
            renderPrompts();
        }).catch(() => {
            showToast('Failed to copy to clipboard', 'error');
        });
    }
}

function showUsePromptModal(id) {
    state.usingPromptId = id;
    const prompt = state.prompts.find(p => p.id === id);
    if (!prompt) return;

    document.getElementById('usePromptTitle').textContent = prompt.title;
    const variableInputs = document.getElementById('variableInputs');
    const progressContainer = document.getElementById('variableProgress');
    variableInputs.innerHTML = '';

    const savedValues = loadVariableValues(id);

    if (prompt.variables.length > 0) {
        progressContainer.style.display = 'block';
        prompt.variables.forEach((variable, index) => {
            const group = document.createElement('div');
            group.className = 'form-group';
            const placeholder = generatePlaceholder(variable);
            const savedValue = savedValues[variable] || '';
            group.innerHTML = `
                <label class="form-label" for="use-prompt-var-${index}">
                    ${escapeHtml(variable)}
                </label>
                <input type="text" class="form-input variable-input" 
                    placeholder="${escapeHtml(placeholder)}"
                    id="use-prompt-var-${index}" data-var="${escapeHtml(variable)}" 
                    value="${escapeHtml(savedValue)}" autocomplete="off">
            `;
            variableInputs.appendChild(group);
        });

        document.querySelectorAll('.variable-input').forEach(input => {
            input.addEventListener('input', () => {
                updateFinalPrompt();
                updateProgress();
                saveVariableValues(id, getVariableValuesFromForm());
            });
        });
        setTimeout(() => document.querySelector('.variable-input')?.focus(), 100);
    } else {
        progressContainer.style.display = 'none';
    }

    updateFinalPrompt();
    updateProgress();
    openModal('usePromptModal');
}

function getVariableValuesFromForm() {
    const values = {};
    document.querySelectorAll('.variable-input').forEach(input => {
        values[input.dataset.var] = input.value;
    });
    return values;
}

function updateFinalPrompt() {
    const prompt = state.prompts.find(p => p.id === state.usingPromptId);
    if (!prompt) return;

    let finalText = prompt.content;
    
    document.querySelectorAll('.variable-input').forEach(input => {
        const variable = input.dataset.var;
        const value = input.value.trim();
        if (value) {
            finalText = finalText.replace(new RegExp(`\\{${escapeRegex(variable)}\\}`, 'g'), value);
        }
    });

    let highlightedText = escapeHtml(finalText);
    highlightedText = highlightedText.replace(/\{([^}]+)\}/g, '<span style="color: var(--accent); font-weight: 600;">{$1}</span>');
    document.getElementById('finalPromptPreview').innerHTML = highlightedText;
}

function updateProgress() {
    const inputs = document.querySelectorAll('.variable-input');
    if (inputs.length === 0) return;
    const filled = Array.from(inputs).filter(input => input.value.trim() !== '').length;
    const percentage = (filled / inputs.length) * 100;
    document.getElementById('progressText').textContent = `${filled}/${inputs.length}`;
    document.getElementById('progressBar').style.width = `${percentage}%`;
}

function copyFinalPrompt() {
    const prompt = state.prompts.find(p => p.id === state.usingPromptId);
    if (!prompt) return;

    // Check for unfilled variables
    let firstEmpty = null;
    document.querySelectorAll('.variable-input').forEach(input => {
        if (!input.value.trim() && !firstEmpty) {
            firstEmpty = input;
        }
    });

    if (firstEmpty) {
        firstEmpty.focus();
        firstEmpty.classList.add('invalid');
        setTimeout(() => { firstEmpty.classList.remove('invalid'); }, 2000);
        showToast('Please fill all variables', 'error');
        return;
    }

    let finalText = prompt.content;
    document.querySelectorAll('.variable-input').forEach(input => {
        finalText = finalText.replace(new RegExp(`\\{${escapeRegex(input.dataset.var)}\\}`, 'g'), input.value.trim());
    });

    copyToClipboard(finalText).then(() => {
        const btn = document.getElementById('copyPromptBtn');
        const btnText = document.getElementById('copyPromptBtnText');
        
        if (btn.classList.contains('success')) return; // Avoid multiple rapid clicks

        btn.classList.add('success');
        btnText.textContent = 'Copied!';

        setTimeout(() => {
            btnText.textContent = 'Copy Prompt';
            btn.classList.remove('success');
        }, 1500);

        prompt.usageCount++;
        prompt.lastUsed = Date.now();
        saveToStorage();
        renderPrompts();
    }).catch(() => {
        showToast('Failed to copy to clipboard', 'error');
    });
}

// ============================================
// COLLECTION & CATEGORY ACTIONS
// ============================================
function showEditCollectionModal(id) {
    const collection = state.collections.find(c => c.id === id);
    if (!collection) return;
    state.editingCollectionId = id;
    openModalWithConfig('collectionModal', 'edit', collection);
}

function showEditCategoryModal(id) {
    const category = state.categories.find(c => c.id === id);
    if (!category) return;
    state.editingCategoryId = id;
    openModalWithConfig('categoryModal', 'edit', category);
}

function saveCollection() {
    const formData = getCollectionFormData();

    // Check for duplicate names (case-insensitive)
    const duplicate = state.collections.find(c => 
        c.name.toLowerCase() === formData.name.toLowerCase() && 
        c.id !== state.editingCollectionId
    );
    
    if (duplicate) {
        showToast(`Collection "${formData.name}" already exists`, 'error');
        document.getElementById('collectionName').focus();
        return;
    }

    const isEditing = !!state.editingCollectionId;

    if (isEditing) {
        const collection = state.collections.find(c => c.id === state.editingCollectionId);
        if (collection) {
            collection.name = formData.name;
            collection.color = formData.color;
        }
    } else {
        state.collections.push(createCollectionModel(formData));
    }
    
    commitState();
    updateCollectionDropdown();
    closeModal('collectionModal');
    showToast(isEditing ? 'Collection updated!' : 'Collection created!', 'success');
}

function deleteCollection(id) {
    showConfirm('Delete this collection? Prompts inside will not be deleted.', 'Delete Collection', 'Delete', () => {
        state.prompts.forEach(p => { if (p.collectionId === id) p.collectionId = null; });
        state.collections = state.collections.filter(c => c.id !== id);
        state.currentCollections = state.currentCollections.filter(cid => cid !== id);
        commitState();
        showToast('Collection deleted', 'success');
    });
}

function saveCategory() {
    const formData = getCategoryFormData();

    // Check for duplicate names (case-insensitive)
    const duplicate = state.categories.find(c => 
        c.name.toLowerCase() === formData.name.toLowerCase() && 
        c.id !== state.editingCategoryId
    );
    
    if (duplicate) {
        showToast(`Category "${formData.name}" already exists`, 'error');
        document.getElementById('categoryName').focus();
        return;
    }

    const isEditing = !!state.editingCategoryId;

    if (isEditing) {
        const category = state.categories.find(c => c.id === state.editingCategoryId);
        if (category) {
            category.name = formData.name;
            category.color = formData.color;
        }
    } else {
        state.categories.push(createCategoryModel(formData));
    }
    
    commitState();
    updateCategoryDropdown();
    closeModal('categoryModal');
    showToast(isEditing ? 'Category updated!' : 'Category created!', 'success');
}

function deleteCategory(id) {
    showConfirm('Delete this category? Prompts inside will not be deleted.', 'Delete Category', 'Delete', () => {
        state.prompts.forEach(p => { if (p.categoryId === id) p.categoryId = null; });
        state.categories = state.categories.filter(c => c.id !== id);
        state.currentCategories = state.currentCategories.filter(cid => cid !== id);
        commitState();
        showToast('Category deleted', 'success');
    });
}

// ============================================
// SEARCH & TAGS
// ============================================
let searchDebounceTimer;
function handleSearch() {
    state.searchQuery = document.getElementById('searchInput').value.toLowerCase();
    document.getElementById('mobileSearchInput').value = document.getElementById('searchInput').value;
    const clearBtn = document.getElementById('searchClearBtn');
    clearBtn.classList.toggle('visible', state.searchQuery.length > 0);
    document.getElementById('mobileSearchClearBtn').classList.toggle('visible', state.searchQuery.length > 0);
    
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => renderPrompts(), 150);
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    document.getElementById('mobileSearchInput').value = '';
    state.searchQuery = '';
    handleSearch();
}

function handleMobileSearch() {
    state.searchQuery = document.getElementById('mobileSearchInput').value.toLowerCase();
    document.getElementById('searchInput').value = document.getElementById('mobileSearchInput').value;
    const clearBtn = document.getElementById('mobileSearchClearBtn');
    clearBtn.classList.toggle('visible', state.searchQuery.length > 0);
    document.getElementById('searchClearBtn').classList.toggle('visible', state.searchQuery.length > 0);
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => renderPrompts(), 150);
}

function handleTagInput() {
    const input = document.getElementById('promptTags');
    const container = document.getElementById('tagSuggestions');
    const value = input.value;
    const parts = value.split(',');
    const currentPart = parts[parts.length - 1].trim().toLowerCase();

    state.ui.tagSuggestionIndex = -1;
    if (!currentPart) {
        container.classList.remove('visible');
        return;
    }

    const allTags = new Set();
    state.prompts.forEach(p => p.tags.forEach(t => allTags.add(t)));
    const matches = Array.from(allTags).filter(tag => tag.toLowerCase().includes(currentPart)).slice(0, 10);

    if (matches.length === 0) {
        container.classList.remove('visible');
        return;
    }

    container.innerHTML = matches.map(tag => 
        `<span class="tag-suggestion-item" data-action="select-tag-suggestion" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</span>`
    ).join('');
    container.classList.add('visible');
}

function handleTagKeydown(e) {
    const container = document.getElementById('tagSuggestions');
    if (!container.classList.contains('visible')) return;

    const items = container.querySelectorAll('.tag-suggestion-item');
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        state.ui.tagSuggestionIndex = Math.min(state.ui.tagSuggestionIndex + 1, items.length - 1);
        items.forEach((el, i) => el.classList.toggle('focused', i === state.ui.tagSuggestionIndex));
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        state.ui.tagSuggestionIndex = Math.max(state.ui.tagSuggestionIndex - 1, -1);
        items.forEach((el, i) => el.classList.toggle('focused', i === state.ui.tagSuggestionIndex));
    } else if (e.key === 'Enter' && state.ui.tagSuggestionIndex >= 0) {
        e.preventDefault();
        const focused = items[state.ui.tagSuggestionIndex];
        if (focused) selectTagSuggestion(focused.dataset.tag);
    } else if (e.key === 'Escape') {
        container.classList.remove('visible');
    }
}

function selectTagSuggestion(tag) {
    const input = document.getElementById('promptTags');
    const parts = input.value.split(',');
    parts[parts.length - 1] = ' ' + tag;
    input.value = parts.map(p => p.trim()).filter(Boolean).join(', ') + ', ';
    input.focus();
    document.getElementById('tagSuggestions').classList.remove('visible');
}

// ============================================
// IMPORT / EXPORT
// ============================================
function importPrompts() {
    const fileInput = document.getElementById('importFile');
    const file = fileInput.files[0];
    const importMode = document.querySelector('input[name="importMode"]:checked')?.value ?? 'merge';
    
    if (!file) return showToast('Please select a file', 'error');

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // 1. Validate and Sanitize Data
            const { validatedData, stats, errors } = validateAndSanitizeData(data);

            if (errors.length > 0) {
                console.error('Import validation errors:', errors);
                showToast(`Import failed: ${errors.length} error(s). Check console.`, 'error');
                return;
            }

            // 2. Apply data based on import mode
            if (importMode === 'replace') {
                state.prompts = validatedData.prompts;
                state.collections = validatedData.collections;
                state.categories = validatedData.categories;
            } else {
                // Merge: add new items, skip duplicates by ID
                const promptIds = new Set(state.prompts.map(p => p.id));
                const collectionIds = new Set(state.collections.map(c => c.id));
                const categoryIds = new Set(state.categories.map(c => c.id));

                validatedData.prompts.forEach(p => { if (!promptIds.has(p.id)) state.prompts.push(p); });
                validatedData.collections.forEach(c => { if (!collectionIds.has(c.id)) state.collections.push(c); });
                validatedData.categories.forEach(c => { if (!categoryIds.has(c.id)) state.categories.push(c); });
            }
            
            // 3. Final cleanup of any orphaned references
            const validCollectionIds = new Set(state.collections.map(c => c.id));
            const validCategoryIds = new Set(state.categories.map(c => c.id));
            
            state.prompts.forEach(p => {
                if (p.collectionId && !validCollectionIds.has(p.collectionId)) p.collectionId = null;
                if (p.categoryId && !validCategoryIds.has(p.categoryId)) p.categoryId = null;
            });

            // 4. Update UI
            commitState();
            updateCollectionDropdown();
            updateCategoryDropdown();
            closeModal('importModal');

            const count = stats.prompts;
            showToast(`Successfully imported ${count} prompt${count !== 1 ? 's' : ''}.`, 'success');
        } catch (error) {
            showToast('Error importing file: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);
}

function exportPrompts() {
    if (!state.prompts || state.prompts.length === 0) {
        showToast("There are no prompts to export.", "error");
        return;
    }

    const isFiltered = state.currentView !== 'all' || 
                    state.searchQuery || 
                    state.currentCollections.length > 0 || 
                    state.currentCategories.length > 0 || 
                    state.currentTags.length > 0;
    
    let promptsToExport = state.prompts;
    let exportLabel = 'all';

    if (isFiltered) {
        const filteredPrompts = getFilteredPrompts();
        const filterDesc = getFilterDescription();
        
        if (confirm(`Export filtered prompts?\n\nCurrent filter: ${filterDesc}\nFiltered: ${filteredPrompts.length}\nTotal: ${state.prompts.length}\n\nOK: Export filtered\nCancel: Export all`)) {
            promptsToExport = filteredPrompts;
            exportLabel = 'filtered';
        }
    }

    const data = {
        prompts: promptsToExport,
        exportType: exportLabel,
        totalPrompts: state.prompts.length,
        exportedPrompts: promptsToExport.length,
        collections: state.collections,
        categories: state.categories,
        exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompts-${exportLabel}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Exported ${promptsToExport.length} prompts!`, 'success');
}

function getFilterDescription() {
    const parts = [];
    if (state.currentView === 'favorites') parts.push('Favorites');
    else if (state.currentView === 'recent') parts.push('Recent');

    state.currentCategories.forEach(id => {
        const cat = state.categories.find(c => c.id === id);
        if (cat) parts.push(cat.name);
    });
    state.currentCollections.forEach(id => {
        const col = state.collections.find(c => c.id === id);
        if (col) parts.push(col.name);
    });
    state.currentTags.forEach(tag => parts.push('#' + tag));
    if (state.searchQuery) parts.push(`Search: "${state.searchQuery}"`);

    return parts.length > 0 ? parts.join(' + ') : 'All Prompts';
}

// ============================================
// BULK OPERATIONS
// ============================================

function toggleBulkSelect(id, event) {
    event.stopPropagation();
    if (state.ui.selectedPrompts.has(id)) {
        state.ui.selectedPrompts.delete(id);
    } else {
        state.ui.selectedPrompts.add(id);
    }
    updateBulkUI();
}

function bulkSelectAll() {
    const prompts = getFilteredPrompts();
    prompts.forEach(p => state.ui.selectedPrompts.add(p.id));
    updateBulkUI();
}

function bulkClearSelection() {
    state.ui.selectedPrompts.clear();
    updateBulkUI();
}

function bulkDelete() {
    const count = state.ui.selectedPrompts.size;
    showConfirm(
        `Delete ${count} selected prompt${count > 1 ? 's' : ''}? This cannot be undone.`,
        'Bulk Delete',
        'Delete All',
        () => {
            state.prompts = state.prompts.filter(p => !state.ui.selectedPrompts.has(p.id));
            bulkClearSelection();
            commitState();
            showToast(`${count} prompt${count > 1 ? 's' : ''} deleted`, 'success');
        }
    );
}

function bulkToggleFavorite() {
    state.ui.selectedPrompts.forEach(id => {
        const p = state.prompts.find(pr => pr.id === id);
        if (p) {
            p.favorite = !p.favorite;
            p.updatedAt = Date.now();
        }
    });
    bulkClearSelection();
    commitState({ prompts: true });
    showToast('Favorites updated!', 'success');
}

function bulkMoveToCollection() {
    if (state.collections.length === 0) {
        showToast('Create a collection first', 'error');
        return;
    }
    
    const count = state.ui.selectedPrompts.size;
    document.getElementById('bulkMoveCount').textContent = count;
    
    const container = document.getElementById('bulkMoveCollectionsList');
    container.innerHTML = state.collections.map(c => `
        <label class="dropdown-option bulk-move-option">
            <input type="radio" name="bulkMoveCollection" value="${sanitizeId(c.id)}">
            <span class="collection-color-dot" style="background: ${c.color || '#3b82f6'};"></span>
            <span>${escapeHtml(c.name)}</span>
        </label>
    `).join('');
    
    openModal('bulkMoveModal');
}

function hideBulkMoveModal(event) {
    closeModalWithCheck('bulkMoveModal', event);
    document.querySelectorAll('input[name="bulkMoveCollection"]').forEach(input => {
        input.checked = false;
    });
}

function executeBulkMove() {
    const selected = document.querySelector('input[name="bulkMoveCollection"]:checked');
    if (!selected) return showToast('Please select a collection', 'error');
    
    const collectionId = selected.value || null;
    state.ui.selectedPrompts.forEach(id => {
        const p = state.prompts.find(pr => pr.id === id);
        if (p) p.collectionId = collectionId;
    });
    
    hideBulkMoveModal();
    bulkClearSelection();
    commitState();
    showToast(`Prompts moved to collection!`, 'success');
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        // Mobile: toggle mobile-open class and backdrop
        sidebar.classList.toggle('mobile-open');
        backdrop.classList.toggle('visible');
    } else {
        // Desktop: toggle collapsed class
        sidebar.classList.toggle('collapsed');
        state.preferences.sidebarCollapsed = sidebar.classList.contains('collapsed');
        saveToStorage();
    }
    
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    if (toggleBtn) {
        const isOpen = isMobile ? sidebar.classList.contains('mobile-open') : !sidebar.classList.contains('collapsed');
        toggleBtn.setAttribute('aria-expanded', isOpen);
    }
}

function toggleSidebarSection(section) {
    state.sidebarSections[section] = !state.sidebarSections[section];
    applySidebarSection(section);
    saveToStorage();
}

// ============================================
// EVENT LISTENERS & INIT
// ============================================
export function setupEventListeners() {
    // Close dropdowns when clicking outside
    document.addEventListener('click', e => {
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

    // Close tag suggestions when clicking outside
    document.addEventListener('click', e => {
        const container = document.getElementById('tagSuggestions');
        if (container && container.classList.contains('visible') && 
            !e.target.closest('#promptTags') && !e.target.closest('#tagSuggestions')) {
            container.classList.remove('visible');
        }
    });

    document.body.addEventListener('click', e => {
        const actionEl = e.target.closest('[data-action]');
        if (!actionEl) return;
        const action = actionEl.dataset.action;
        const id = actionEl.dataset.id;

        // Prompt Card Actions
        if (action === 'edit' && actionEl.closest('.prompt-card')) {
            const cardId = actionEl.closest('.prompt-card').dataset.promptId;
            state.editingPromptId = cardId;
            openModalWithConfig('promptModal', 'edit', state.prompts.find(p => p.id === cardId));
        }
        if (action === 'delete' && actionEl.closest('.prompt-card')) {
            deletePrompt(actionEl.closest('.prompt-card').dataset.promptId);
        }
        if (action === 'copy' && actionEl.closest('.prompt-card')) {
            copyPrompt(actionEl.closest('.prompt-card').dataset.promptId);
        }
        if (action === 'clone' && actionEl.closest('.prompt-card')) {
            clonePrompt(actionEl.closest('.prompt-card').dataset.promptId);
        }
        if (action === 'toggle-favorite' && actionEl.closest('.prompt-card')) {
            toggleFavorite(actionEl.closest('.prompt-card').dataset.promptId);
        }
        if (action === 'select' && actionEl.closest('.prompt-card')) {
            e.stopPropagation();
            const cardId = actionEl.closest('.prompt-card').dataset.promptId;
            toggleBulkSelect(cardId, e);
        }

        // Modals
        if (action === 'show-add-prompt-modal') { state.editingPromptId = null; openModalWithConfig('promptModal', 'add'); }
        if (action === 'show-add-collection-modal') { state.editingCollectionId = null; openModalWithConfig('collectionModal', 'add'); }
        if (action === 'show-add-category-modal') { state.editingCategoryId = null; openModalWithConfig('categoryModal', 'add'); }
        if (action === 'show-import-modal') openModal('importModal');
        
        if (action === 'show-edit-collection-modal') {
            e.stopPropagation();
            showEditCollectionModal(id);
        }
        if (action === 'delete-collection') {
            e.stopPropagation();
            deleteCollection(id);
        }
        if (action === 'show-edit-category-modal') {
            e.stopPropagation();
            showEditCategoryModal(id);
        }
        if (action === 'delete-category') {
            e.stopPropagation();
            deleteCategory(id);
        }

        if (action === 'hide-prompt-modal') {
            if (actionEl.classList.contains('modal-overlay') && e.target !== actionEl) return;
            closeModalWithCheck('promptModal', e);
        }
        if (action === 'hide-collection-modal') {
            if (actionEl.classList.contains('modal-overlay') && e.target !== actionEl) return;
            closeModalWithCheck('collectionModal', e);
        }
        if (action === 'hide-category-modal') {
            if (actionEl.classList.contains('modal-overlay') && e.target !== actionEl) return;
            closeModalWithCheck('categoryModal', e);
        }
        if (action === 'hide-use-prompt-modal') {
            if (actionEl.classList.contains('modal-overlay') && e.target !== actionEl) return;
            closeModalWithCheck('usePromptModal', e);
        }
        if (action === 'hide-import-modal') {
            if (actionEl.classList.contains('modal-overlay') && e.target !== actionEl) return;
            closeModalWithCheck('importModal', e);
        }
        if (action === 'hide-bulk-move-modal') {
            if (actionEl.classList.contains('modal-overlay') && e.target !== actionEl) return;
            hideBulkMoveModal(e);
        }

        if (action === 'hide-confirm-modal') hideConfirmModal();

        // Forms
        if (action === 'submit-form') document.getElementById(actionEl.dataset.formId)?.requestSubmit();
        if (action === 'copy-final-prompt') copyFinalPrompt();
        if (action === 'clear-variable-values') {
            clearStorageVariables(state.usingPromptId);
            document.querySelectorAll('.variable-input').forEach(i => i.value = '');
            updateFinalPrompt();
        }
        if (action === 'import-prompts') importPrompts();
        if (action === 'export-prompts') exportPrompts();
        if (action === 'execute-bulk-move') executeBulkMove();

        // Sidebar & Views
        if (action === 'toggle-sidebar') {
            toggleSidebar();
        }
        if (action === 'toggle-sidebar-section') {
            const section = actionEl.dataset.section;
            if (section) toggleSidebarSection(section);
        }
        if (action === 'close-mobile-sidebar') closeMobileSidebar();
        if (action === 'set-view') {
            const isMobile = window.innerWidth <= 768;
            if (isMobile) closeMobileSidebar();
            document.getElementById('sidebar').classList.remove('mobile-open');
            document.getElementById('sidebarBackdrop').classList.remove('visible');
            state.currentView = actionEl.dataset.view;
            state.currentCollections = []; state.currentCategories = []; state.currentTags = [];
            commitState();
        }
        if (action === 'set-collection-view') {
            if (state.currentCollections.includes(id)) state.currentCollections = state.currentCollections.filter(c => c !== id);
            else state.currentCollections.push(id);
            state.currentView = 'filtered';
            commitState();
        }
        if (action === 'set-category-view') {
            if (state.currentCategories.includes(id)) state.currentCategories = state.currentCategories.filter(c => c !== id);
            else state.currentCategories.push(id);
            state.currentView = 'filtered';
            commitState();
        }
        if (action === 'set-tag-view') {
            const tag = actionEl.dataset.tag;
            if (state.currentTags.includes(tag)) state.currentTags = state.currentTags.filter(t => t !== tag);
            else state.currentTags.push(tag);
            state.currentView = 'filtered';
            commitState();
        }
        if (action === 'clear-all-filters') {
            state.currentCollections = []; state.currentCategories = []; state.currentTags = [];
            state.currentView = 'all';
            commitState();
        }

        // Toolbar
        if (action === 'toggle-theme') {
            const newTheme = state.preferences.theme === 'dark' ? 'light' : 'dark';
            state.preferences.theme = newTheme;
            applyTheme(newTheme);
            saveToStorage();
        }
        if (action === 'set-view-mode') {
            state.preferences.viewMode = actionEl.dataset.mode;
            applyViewMode(state.preferences.viewMode);
            saveToStorage();
        }
        if (action === 'toggle-density-menu') toggleDropdown('densityDropdown');
        if (action === 'set-density') {
            state.preferences.density = actionEl.dataset.density;
            applyDensity(state.preferences.density);
            saveToStorage();
            closeDropdown('densityDropdown');
        }
        if (action === 'toggle-sort-menu') toggleDropdown('sortDropdown');
        if (action === 'set-sort') {
            state.preferences.sortBy = actionEl.dataset.sort;
            
            // Update dropdown UI - remove active class from all, add to selected
            document.querySelectorAll('#sortDropdown .dropdown-option').forEach(opt => {
                opt.classList.toggle('active', opt.dataset.sort === state.preferences.sortBy);
            });
            
            saveToStorage();
            renderPrompts();
            closeDropdown('sortDropdown');
        }
        if (action === 'toggle-shortcuts-menu') toggleDropdown('shortcutsDropdown');
        if (action === 'close-dropdown') closeDropdown(id);
        
        // Search
        if (action === 'clear-search') clearSearch();
        if (action === 'clear-mobile-search') clearSearch();

        // Bulk Actions
        if (action === 'bulk-select-all') bulkSelectAll();
        if (action === 'bulk-clear-selection') bulkClearSelection();
        if (action === 'bulk-delete') bulkDelete();
        if (action === 'bulk-toggle-favorite') bulkToggleFavorite();
        if (action === 'bulk-move-to-collection') bulkMoveToCollection();

        // Tag Suggestions
        if (action === 'select-tag-suggestion') {
            selectTagSuggestion(actionEl.dataset.tag);
        }
    });

    // Form Submits
    document.body.addEventListener('submit', e => {
        e.preventDefault();
        if (e.target.id === 'promptForm') savePrompt();
        if (e.target.id === 'collectionForm') saveCollection();
        if (e.target.id === 'categoryForm') saveCategory();
    });

    // Inputs
    document.getElementById('searchInput')?.addEventListener('input', handleSearch);
    document.getElementById('mobileSearchInput')?.addEventListener('input', handleMobileSearch);
    document.getElementById('promptTags')?.addEventListener('input', handleTagInput);
    document.getElementById('promptTags')?.addEventListener('keydown', handleTagKeydown);
    document.getElementById('promptContent')?.addEventListener('input', () => {
        previewVariables();
        updateCharCounter();
    });
    
// Confirm Modal - verify confirmId to prevent race conditions (using state-based verification)
    document.getElementById('confirmModalOkBtn')?.addEventListener('click', () => {
        if (state.ui.confirmCallback && state.ui.currentConfirmId > 0) {
            state.ui.confirmCallback();
        }
        hideConfirmModal();
    });
    
    // Confirm Modal Cancel
    document.getElementById('confirmModalCancelBtn')?.addEventListener('click', () => {
        hideConfirmModal();
    });
}

function closeMobileSidebar() {
    document.getElementById('sidebar').classList.remove('mobile-open');
    document.getElementById('sidebarBackdrop').classList.remove('visible');
}

const HOTKEY_REGISTRY = [
    { key: 'Escape', context: 'always', description: 'Close modal', handler: () => {
        const topModal = getTopModal();
        if (topModal) closeModalWithCheck(topModal, null, topModal !== 'promptModal');
    }},
    { key: 's', ctrl: true, context: 'modal', description: 'Save (in modal)', handler: () => {
        const topModal = getTopModal();
        if (topModal === 'promptModal') document.getElementById('promptForm').requestSubmit();
        else if (topModal === 'collectionModal') document.getElementById('collectionForm').requestSubmit();
        else if (topModal === 'categoryModal') document.getElementById('categoryForm').requestSubmit();
    }},
    { key: 'b', ctrl: true, context: 'global', description: 'New Prompt', handler: () => openModalWithConfig('promptModal', 'add') },
    { key: 'k', ctrl: true, context: 'global', description: 'Search', handler: () => document.getElementById('searchInput').focus() },
    { key: 'e', ctrl: true, context: 'global', description: 'Export', handler: () => exportPrompts() },
    { key: '\\', context: 'global', description: 'Toggle Sidebar', handler: () => document.getElementById('sidebarToggleBtn').click() },
];

function handleHotkey(e) {
    const tag = document.activeElement.tagName;
    const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    const anyModalOpen = state.ui.openModals.size > 0;

    let currentContext;
    if (anyModalOpen) currentContext = 'modal';
    else if (isTyping) currentContext = 'typing';
    else currentContext = 'global';

    for (const hotkey of HOTKEY_REGISTRY) {
        const keyMatch = hotkey.key.toLowerCase() === e.key.toLowerCase();
        if (!keyMatch) continue;

        const ctrlMatch = hotkey.ctrl ? (e.ctrlKey || e.metaKey) : true;
        if (!ctrlMatch) continue;

        if (hotkey.context === 'always') {
            // Always active
        } else if (hotkey.context === 'modal' && currentContext !== 'modal') {
            continue;
        } else if (hotkey.context === 'global' && currentContext !== 'global') {
            continue;
        }

        e.preventDefault();
        hotkey.handler();
        return;
    }
}

function renderShortcuts() {
    const container = document.getElementById('shortcutsList');
    if (!container) return;

    const grouped = { always: [], modal: [], global: [] };
    HOTKEY_REGISTRY.forEach(hotkey => {
        if (hotkey.description) grouped[hotkey.context].push(hotkey);
    });

    const formatKey = (hotkey) => {
        let parts = [];
        if (hotkey.ctrl) parts.push('Ctrl');
        parts.push(hotkey.key.toUpperCase());
        return parts.join(' + ');
    };

    let html = '';
    if (grouped.global.length > 0) {
        html += `<div class="shortcuts-title">Global</div>`;
        grouped.global.forEach(hotkey => {
            html += `<div class="shortcut-row"><span>${escapeHtml(hotkey.description)}</span><kbd>${formatKey(hotkey)}</kbd></div>`;
        });
    }
    if (grouped.modal.length > 0) {
        html += `<div class="shortcuts-title">In Modal</div>`;
        grouped.modal.forEach(hotkey => {
            html += `<div class="shortcut-row"><span>${escapeHtml(hotkey.description)}</span><kbd>${formatKey(hotkey)}</kbd></div>`;
        });
    }
    if (grouped.always.length > 0) {
        html += `<div class="shortcuts-title">Always</div>`;
        grouped.always.forEach(hotkey => {
            html += `<div class="shortcut-row"><span>${escapeHtml(hotkey.description)}</span><kbd>${formatKey(hotkey)}</kbd></div>`;
        });
    }

    container.innerHTML = html;
}

export function init() {
    if (isInitialized) {
        console.warn("Initialization has already been performed. Skipping.");
        return;
    }
    isInitialized = true;

    // Ensure data is saved before closing
    window.addEventListener('beforeunload', () => saveToStorage(true));

    const loadedData = loadFromLocalStorage();
    if (loadedData) {
        state.prompts = loadedData.prompts ?? [];
        state.collections = loadedData.collections ?? [];
        state.categories = loadedData.categories ?? [];
        state.preferences = { ...state.preferences, ...loadedData.preferences };
        state.sidebarSections = { ...state.sidebarSections, ...loadedData.sidebarSections };
    }

    // Add example prompt if first time
    if (state.prompts.length === 0) {
        const content = `Please review the following {language} code and provide detailed feedback:\n\n{code}\n\nFocus on:\n1. Code quality and best practices\n2. Potential bugs or issues\n3. Performance improvements\n4. Security considerations\n\nPlease provide specific suggestions for improvement.`;
        const examplePrompt = {
            id: generateId(),
            title: "Code Review Request",
            description: "Ask AI to review your code and provide feedback",
            content: content,
            collectionId: null,
            categoryId: null,
            tags: ["coding", "review", "example"],
            variables: extractVariables(content),
            favorite: false,
            usageCount: 0,
            lastUsed: null,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        examplePrompt._searchIndex = [examplePrompt.title, examplePrompt.description, examplePrompt.content, ...examplePrompt.tags].join(' ').toLowerCase();
        state.prompts.push(examplePrompt);
        saveToStorage();
    }

    applyTheme(state.preferences.theme);
    applyDensity(state.preferences.density);
    applyViewMode(state.preferences.viewMode);
    if (state.preferences.sidebarCollapsed) document.getElementById('sidebar').classList.add('collapsed');
    
    Object.keys(state.sidebarSections).forEach(section => {
        applySidebarSection(section);
    });

    // Sync dropdown UI with saved preferences
    document.querySelectorAll('#sortDropdown .dropdown-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.sort === state.preferences.sortBy);
    });

    document.addEventListener('keydown', handleHotkey);
    renderShortcuts();

    setupEventListeners();
    renderAll();
    updateCollectionDropdown();
    updateCategoryDropdown();
}
