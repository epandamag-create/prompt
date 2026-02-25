import { state } from '../state.js';
import { escapeHtml } from '../utils/helpers.js';

// --- Toasts ---
const MAX_TOASTS = 3;

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
    if (undoCallback) {
        html += `<button class="toast-undo-btn" style="
            margin-left: 12px; padding: 4px 10px; border-radius: 4px;
            background: var(--accent); color: white; font-size: 12px;
            font-weight: 600; cursor: pointer; border: none; white-space: nowrap;
        ">Undo</button>`;
    }
    toast.innerHTML = html;

    // Stack toasts vertically
    const offset = state.ui.activeToasts.reduce((acc, t) => acc + t.offsetHeight + 8, 0);
    toast.style.bottom = `${24 + offset}px`;

    document.body.appendChild(toast);
    state.ui.activeToasts.push(toast);

    let toastClickHandled = false;

    if (undoCallback) {
        toast.querySelector('.toast-undo-btn').addEventListener('click', () => {
            if (toastClickHandled) return;  // Prevent double-click
            toastClickHandled = true;
            
            if (!state.ui.activeToasts.includes(toast)) return;  // Validate state
            
            undoCallback();
            toast.classList.remove('visible');
            setTimeout(() => {
                const idx = state.ui.activeToasts.indexOf(toast);
                if (idx > -1) state.ui.activeToasts.splice(idx, 1);
                toast.remove();
                repositionToasts();
            }, 200);
        });
    }
        // ============================================
        // TOAST NOTIFICATIONS (max 3 stacked, supports undo)
        // ============================================
    setTimeout(() => toast.classList.add('visible'), 10);
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => {
            const idx = state.ui.activeToasts.indexOf(toast);
            if (idx > -1) state.ui.activeToasts.splice(idx, 1);
            toast.remove();
            repositionToasts();
        }, 200);
    }, undoCallback ? 6000 : 3000);
}

function repositionToasts() {
    let offset = 0;
    state.ui.activeToasts.forEach(t => {
        t.style.bottom = `${24 + offset}px`;
        offset += t.offsetHeight + 8;
    });
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
    if (el) el.classList.add('open');
}

export function closeDropdown(dropdownId) {
    state.ui.openDropdowns.delete(dropdownId);
    const el = document.getElementById(dropdownId);
    if (el) el.classList.remove('open');
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
        const id = card.dataset.promptId;
        const isSelected = state.ui.selectedPrompts.has(id);
        card.classList.toggle('selected', isSelected);
        // Update select button
        const selectBtn = card.querySelector('.btn-select');
        if (selectBtn) {
            selectBtn.classList.toggle('active', isSelected);
            selectBtn.querySelector('svg').innerHTML = isSelected
                ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>'
                : '<circle cx="12" cy="12" r="9" stroke-width="2"/>';
        }
    });
    // Update bar
    const bar = document.getElementById('bulkActionsBar');
    const count = state.ui.selectedPrompts.size;
    document.getElementById('bulkCount').textContent = `${count} selected`;
    bar.classList.toggle('visible', count > 0);
}
