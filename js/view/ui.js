import { state } from '../state.js';
import { escapeHtml } from '../utils/helpers.js';

// --- Toasts ---
const MAX_TOASTS = 3;

// Fix #7: Use a container div so CSS handles stacking — no offsetHeight reads
function getToastContainer() {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        document.body.appendChild(container);
    }
    return container;
}

export function showToast(message, type = 'success', undoCallback = null) {
    // Remove oldest toasts if limit reached
    while (state.ui.activeToasts.length >= MAX_TOASTS) {
        const oldest = state.ui.activeToasts.shift();
        if (oldest && oldest.parentNode) {
            oldest.classList.remove('visible');
            setTimeout(() => oldest.remove(), 200);
        }
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = type === 'success'
        ? '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>'
        : '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>';

    let html = `${icon}<span>${escapeHtml(message)}</span>`;
    let undoHandler = null;

    if (undoCallback) {
        html += `<button class="toast-undo-btn" style="
            margin-left: 12px; padding: 4px 10px; border-radius: 4px;
            background: var(--accent); color: white; font-size: 12px;
            font-weight: 600; cursor: pointer; border: none; white-space: nowrap;
        ">Undo</button>`;
    }
    toast.innerHTML = html;

    getToastContainer().appendChild(toast);
    state.ui.activeToasts.push(toast);

    // Add undo handler if needed
    if (undoCallback) {
        const undoBtn = toast.querySelector('.toast-undo-btn');
        let toastClickHandled = false;

        undoHandler = () => {
            if (toastClickHandled) return;
            toastClickHandled = true;
            if (!state.ui.activeToasts.includes(toast)) return;
            undoCallback();
            removeToast(toast);
        };

        undoBtn.addEventListener('click', undoHandler);
    }

    toast._undoHandler = undoHandler;

    setTimeout(() => toast.classList.add('visible'), 10);

    const displayTime = undoCallback ? 6000 : 3000;
    setTimeout(() => removeToast(toast), displayTime);
}

function removeToast(toast) {
    if (!toast || !toast.parentNode) return;

    if (toast._undoHandler) {
        const undoBtn = toast.querySelector('.toast-undo-btn');
        if (undoBtn) undoBtn.removeEventListener('click', toast._undoHandler);
        toast._undoHandler = null;
    }

    toast.classList.remove('visible');
    setTimeout(() => {
        const idx = state.ui.activeToasts.indexOf(toast);
        if (idx > -1) state.ui.activeToasts.splice(idx, 1);
        if (toast.parentNode) toast.remove();
    }, 200);
}

// --- Theme & Layout ---
export function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const themeBtn = document.getElementById('themeToggleBtn');
    const themeIcon = document.getElementById('themeIcon');

    if (theme === 'light') {
        themeIcon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`;
        themeBtn.classList.add('active');
    } else {
        themeIcon.innerHTML = `
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        `;
        themeBtn.classList.remove('active');
    }
}

export function applyDensity(density) {
    document.documentElement.setAttribute('data-density', density);
    document.querySelectorAll('.dropdown-option[data-density]').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.density === density);
    });
}

export function applyViewMode(mode) {
    const grid = document.getElementById('promptGrid');
    const gridBtn = document.getElementById('gridViewBtn');
    const listBtn = document.getElementById('listViewBtn');

    if (mode === 'list') {
        grid.classList.add('list-view');
        gridBtn.classList.remove('active');
        listBtn.classList.add('active');
    } else {
        grid.classList.remove('list-view');
        gridBtn.classList.add('active');
        listBtn.classList.remove('active');
    }
}

export function applySidebarSection(section) {
    const body = document.getElementById('body-' + section);
    const toggle = document.getElementById('toggle-' + section);
    if (!body || !toggle) return;
    
    const isOpen = state.sidebarSections[section];
    body.classList.toggle('collapsed', !isOpen);
    toggle.classList.toggle('collapsed', !isOpen);
}

// --- Dropdowns ---
export function openDropdown(dropdownId) {
    state.ui.openDropdowns.add(dropdownId);
    const el = document.getElementById(dropdownId);
    if (el) {
        el.classList.add('open');
        el.style.display = ''; // Clear inline display:none
    }
}

export function closeDropdown(dropdownId) {
    state.ui.openDropdowns.delete(dropdownId);
    const el = document.getElementById(dropdownId);
    if (el) {
        el.classList.remove('open');
        el.style.display = 'none'; // Restore inline display:none
    }
}

export function toggleDropdown(dropdownId) {
    if (state.ui.openDropdowns.has(dropdownId)) {
        closeDropdown(dropdownId);
    } else {
        openDropdown(dropdownId);
    }
}

// --- Bulk Actions ---
export function updateBulkUI() {
    // Update card styles and select buttons
    document.querySelectorAll('.prompt-card').forEach(card => {
        // Use originalId to match state (which stores unsanitized IDs)
        const id = card.dataset.originalId;
        const isSelected = state.ui.selectedPrompts.has(id);
        card.classList.toggle('selected', isSelected);
        // Update select button
        const selectBtn = card.querySelector('.btn-select');
        if (selectBtn) {
            selectBtn.classList.toggle('active', isSelected);
            const svg = selectBtn.querySelector('svg');
            if (svg) {
                svg.innerHTML = isSelected
                    ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>'
                    : '<circle cx="12" cy="12" r="9" stroke-width="2"/>';
            }
        }
    });
    // Update bulk actions bar
    const count = state.ui.selectedPrompts.size;
    const bulkCountEl = document.getElementById('bulkCount');
    if (bulkCountEl) {
        bulkCountEl.textContent = `${count} selected`;
    }
    const bar = document.getElementById('bulkActionsBar');
    if (bar) {
        if (count > 0) {
            bar.classList.add('visible');
            bar.style.display = 'flex';
        } else {
            bar.classList.remove('visible');
            bar.style.display = 'none';
        }
    }
}
