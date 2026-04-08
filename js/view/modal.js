import { state } from '../state.js';
import { MODAL_PRIORITY, MODALS } from '../config/constants.js';
import { escapeHtml } from '../utils/helpers.js';

// ============================================
// MODAL HELPERS (state-driven)
// ============================================

let previouslyFocusedElement = null;
let currentFocusIndex = 0;
let focusableElements = [];
let _focusTimeoutId = null;

export function openModal(modalId) {
    // Save previously focused element for accessibility
    previouslyFocusedElement = document.activeElement;

    state.ui.openModals.add(modalId);
    const modal = document.getElementById(modalId);
    modal.classList.add('visible');

    // Get all focusable elements
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    focusableElements = Array.from(modal.querySelectorAll(focusableSelector));
    currentFocusIndex = 0;

    // Cancel any pending focus from a previous modal open
    if (_focusTimeoutId !== null) {
        clearTimeout(_focusTimeoutId);
    }

    // Focus first focusable element — capture local ref so a subsequent openModal
    // doesn't focus the wrong modal if this timeout fires late
    const capturedFocusables = focusableElements;
    _focusTimeoutId = setTimeout(() => {
        _focusTimeoutId = null;
        if (capturedFocusables.length > 0) {
            capturedFocusables[0].focus();
        }
    }, 100);

    // Add keydown listener for focus trap (only if not already added)
    modal.removeEventListener('keydown', handleModalKeydown);
    modal.addEventListener('keydown', handleModalKeydown);
}

function handleModalKeydown(e) {
    if (e.key !== 'Tab' || focusableElements.length === 0) return;
    
    e.preventDefault();
    
    if (e.shiftKey) {
        // Shift + Tab: go backwards
        currentFocusIndex = currentFocusIndex <= 0 ? focusableElements.length - 1 : currentFocusIndex - 1;
    } else {
        // Tab: go forwards
        currentFocusIndex = currentFocusIndex >= focusableElements.length - 1 ? 0 : currentFocusIndex + 1;
    }
    
    focusableElements[currentFocusIndex].focus();
}

export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    // Cancel pending focus-on-open timeout so it doesn't steal focus after close
    if (_focusTimeoutId !== null) {
        clearTimeout(_focusTimeoutId);
        _focusTimeoutId = null;
    }

    // Remove keydown listener to prevent accumulation
    modal.removeEventListener('keydown', handleModalKeydown);

    state.ui.openModals.delete(modalId);
    modal.classList.remove('visible');

    // Restore focus to the element that was active before the modal opened
    if (previouslyFocusedElement && previouslyFocusedElement.focus) {
        previouslyFocusedElement.focus();
        previouslyFocusedElement = null;
    }

    // Reset focus trap state
    focusableElements = [];
    currentFocusIndex = 0;
}

export function isModalOpen(modalId) {
    return state.ui.openModals.has(modalId);
}

export function getTopModal() {
    for (const id of MODAL_PRIORITY) {
        if (isModalOpen(id)) return id;
    }
    return null;
}

/**
 * Renders and opens the preview modal for a prompt
 * @param {import('../models/prompt.js').Prompt} prompt 
 */
export function renderPreviewModal(prompt) {
    let previewModal = document.getElementById('previewModal');
    if (!previewModal) {
        previewModal = document.createElement('div');
        previewModal.id = 'previewModal';
        previewModal.className = 'modal-overlay';
        previewModal.innerHTML = `
            <div class="modal-container" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h2 id="previewModalTitle" class="modal-title"></h2>
                    <button class="modal-close" data-action="hide-preview-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="previewModalDescription" style="color: var(--text-muted); margin-bottom: 16px;"></div>
                    <div id="previewModalContent" style="background: var(--bg-secondary); padding: 16px; border-radius: 8px; white-space: pre-wrap; font-family: var(--font-mono);"></div>
                    <div id="previewModalMeta" style="margin-top: 16px; color: var(--text-muted); font-size: 12px;"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" data-action="hide-preview-modal">Close</button>
                    <button class="btn btn-primary" data-action="copy-preview">Copy</button>
                </div>
            </div>
        `;
        document.body.appendChild(previewModal);
    }
    
    document.getElementById('previewModalTitle').textContent = prompt.title;
    document.getElementById('previewModalDescription').textContent = prompt.description || '';
    document.getElementById('previewModalContent').textContent = prompt.content;
    
    const category = state.categories.find(c => c.id === prompt.categoryId);
    const collection = state.collections.find(c => c.id === prompt.collectionId);
    
    const categoryName = category ? escapeHtml(category.name) : 'None';
    const collectionName = collection ? escapeHtml(collection.name) : 'None';
    const tagsHtml = prompt.tags?.length 
        ? prompt.tags.map(t => '#' + escapeHtml(t)).join(', ') 
        : 'No tags';

    document.getElementById('previewModalMeta').innerHTML = `
        Category: ${categoryName} | 
        Collection: ${collectionName} | 
        Tags: ${tagsHtml}<br>
        Created: ${new Date(prompt.createdAt).toLocaleString()} | 
        Updated: ${new Date(prompt.updatedAt).toLocaleString()} |
        Used: ${prompt.usageCount || 0} times
    `;
    
    previewModal.dataset.promptId = prompt.id;
    openModal('previewModal');
}

// ============================================
// CUSTOM CONFIRM DIALOG (race-condition safe)
// ============================================

let currentConfirmId = 0;

// Custom Confirm Dialog
export function showConfirm(message, title, okLabel, callback) {
    const confirmId = ++currentConfirmId;
    state.ui.confirmCallback = callback;
    state.ui.confirmModalOpen = true;
    state.ui.currentConfirmId = confirmId; // Store in state for verification
    
    document.getElementById('confirmModalTitle').textContent = title || 'Confirm';
    document.getElementById('confirmModalMessage').textContent = message;
    document.getElementById('confirmModalOkBtn').textContent = okLabel || 'Delete';
    
    openModal(MODALS.CONFIRM);
    setTimeout(() => document.getElementById('confirmModalOkBtn').focus(), 100);
}

export function hideConfirmModal() {
    closeModal(MODALS.CONFIRM);
    state.ui.confirmCallback = null;
    state.ui.confirmModalOpen = false;
    state.ui.currentConfirmId = 0; // Reset stored confirmId
}

// Export for external verification
export function getCurrentConfirmId() {
    return state.ui.currentConfirmId;
}
