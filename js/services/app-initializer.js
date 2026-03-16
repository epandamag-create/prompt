import { state, stateManager } from '../state.js';
import { viewService } from './view-service.js';
import { createPromptModel } from '../models/prompt.js';
import { storageService, SYNC_KEY } from './storage-service.js';

class AppInitializer {
    /**
     * Initialize the application state and data.
     * Returns a Promise — callers must await it.
     * @param {Function} postInitCallback - Runs after data is loaded
     */
    async initialize(postInitCallback) {
        if (stateManager.isInitialized()) return;

        this._setupLifecycle();
        await this._loadData();
        this._ensureDefaultContent();
        this._applyPreferences();

        if (typeof postInitCallback === 'function') {
            postInitCallback();
        }

        stateManager.setInitialized(true);
    }

    _setupLifecycle() {
        window.addEventListener('beforeunload', () => stateManager.save(true));
        // IndexedDB changes don't fire `storage` events across tabs, so
        // storage-service writes a timestamp to SYNC_KEY on every save.
        window.addEventListener('storage', (e) => {
            if (e.key === SYNC_KEY) stateManager.reloadFromTabSync();
        });
    }

    async _loadData() {
        await storageService.migrateFromLocalStorage();
        const loadedData = await stateManager.loadFromStorage();
        if (loadedData) {
            state.prompts = loadedData.prompts ?? [];
            state.collections = loadedData.collections ?? [];
            state.categories = loadedData.categories ?? [];
            state.preferences = { ...state.preferences, ...loadedData.preferences };
            state.sidebarSections = { ...state.sidebarSections, ...loadedData.sidebarSections };
            state.searchQuery = '';
        }
    }

    _ensureDefaultContent() {
        if (state.prompts.length === 0) {
            const examplePrompt = createPromptModel({
                title: 'Code Review Request',
                description: 'Ask AI to review your code and provide feedback',
                content: 'Please review the following {language} code and provide detailed feedback:\n\n{code}\n\nFocus on:\n1. Code quality and best practices\n2. Potential bugs or issues\n3. Performance improvements\n4. Security considerations\n\nPlease provide specific suggestions for improvement.',
                tags: ['coding', 'review', 'example']
            });
            state.prompts.push(examplePrompt);
            stateManager.save();
        }
    }

    _applyPreferences() {
        viewService.applyPreferences();

        const sortOptions = document.querySelectorAll('#sortDropdown .dropdown-option');
        sortOptions.forEach(opt => {
            opt.classList.toggle('active', opt.dataset.sort === state.preferences.sortBy);
        });
    }
}

export const appInitializer = new AppInitializer();
