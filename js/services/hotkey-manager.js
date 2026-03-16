import { state } from '../state.js';
import { escapeHtml } from '../utils/helpers.js';

class HotkeyManager {
    constructor() {
        this.registry = [];
        this.boundHandler = this.handleHotkey.bind(this);
        this.isListening = false;
    }

    /**
     * Register a hotkey
     * @param {Object} config - { key, ctrl, context, description, handler }
     */
    register(config) {
        this.registry.push(config);
    }

    /**
     * Register multiple hotkeys
     * @param {Array} configs 
     */
    registerAll(configs) {
        this.registry.push(...configs);
    }

    init() {
        if (this.isListening) return;
        document.addEventListener('keydown', this.boundHandler);
        this.isListening = true;
    }

    destroy() {
        document.removeEventListener('keydown', this.boundHandler);
        this.isListening = false;
    }

    handleHotkey(e) {
        const tag = e.target.tagName;
        const isTyping = (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable);
        
        const anyModalOpen = state.ui.openModals.size > 0;
        let currentContext = anyModalOpen ? 'modal' : 'global';

        // Find matching hotkey
        const match = this.registry.find(h => {
            // Check key
            const keyMatch = h.key.toLowerCase() === e.key.toLowerCase();
            if (!keyMatch) return false;

            // Check modifiers
            const ctrlMatch = h.ctrl ? (e.ctrlKey || e.metaKey) : true;
            if (!ctrlMatch) return false;

            // Check shift modifier (strict when explicitly defined)
            if (h.shift === true && !e.shiftKey) return false;
            if (h.shift === false && e.shiftKey) return false;

            // Context check
            if (h.context === 'always') {
                // pass
            } else if (h.context === 'modal' && currentContext !== 'modal') {
                return false;
            } else if (h.context === 'global' && currentContext !== 'global') {
                return false;
            }
            
            // Typing safety
            if (isTyping) {
                // Allow hotkeys with modifiers (Ctrl+S) or specific exceptions (Escape)
                if (!e.ctrlKey && !e.metaKey && !e.altKey && h.key !== 'Escape') {
                    return false;
                }
            }

            return true;
        });

        if (match) {
            e.preventDefault();
            e.stopPropagation();
            match.handler();
        }
    }

    renderShortcuts(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const grouped = { always: [], modal: [], global: [] };
        this.registry.forEach(hotkey => {
            if (hotkey.description && grouped[hotkey.context]) {
                grouped[hotkey.context].push(hotkey);
            }
        });

        const formatKey = (hotkey) => {
            let parts = [];
            if (hotkey.ctrl) parts.push('Ctrl');
            if (hotkey.shift) parts.push('Shift');
            parts.push(hotkey.key.toUpperCase());
            return parts.join(' + ');
        };

        let html = '';
        const sections = [
            { id: 'global', title: 'Global' },
            { id: 'modal', title: 'In Modal' },
            { id: 'always', title: 'Always' }
        ];

        sections.forEach(section => {
            if (grouped[section.id].length > 0) {
                html += `<div class="shortcuts-title">${section.title}</div>`;
                grouped[section.id].forEach(hotkey => {
                    html += `<div class="shortcut-row"><span>${escapeHtml(hotkey.description)}</span><kbd>${formatKey(hotkey)}</kbd></div>`;
                });
            }
        });

        container.innerHTML = html;
    }
}

export const hotkeyManager = new HotkeyManager();