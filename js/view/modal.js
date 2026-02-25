import { state } from '../state.js';
import { MODAL_PRIORITY, MODALS } from '../config/constants.js';

// ============================================
// MODAL HELPERS (state-driven)
// ============================================

let previouslyFocusedElement = null;
let currentFocusIndex = 0;
let focusableElements = [];

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
    
    // Focus first focusable element in modal
    setTimeout(() => {
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }
    }, 100);
    
    // Add keydown listener for focus trap
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
    
    // Remove keydown listener to prevent memory leaks
    modal.removeEventListener('keydown', handleModalKeydown);
    
    state.ui.openModals.delete(modalId);
    modal.classList.remove('visible');
    
    // Restore focus to previously focused element
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
