import { state, stateManager } from '../state.js';
import { viewService } from './view-service.js';
import { generateId, extractVariables } from '../utils/helpers.js';

class AppInitializer {
    /**
     * Initialize the application state and data
     * @param {Function} postInitCallback - Callback to run after data is loaded but before UI is fully interactive
     */
    initialize(postInitCallback) {
        if (stateManager.isInitialized()) {
            return;
        }

        this._setupLifecycle();
        this._loadData();
        this._ensureDefaultContent();
        this._applyPreferences();

        if (typeof postInitCallback === 'function') {
            postInitCallback();
        }

        stateManager.setInitialized(true);
    }

    _setupLifecycle() {
        window.addEventListener('beforeunload', () => stateManager.save(true));
    }

    _loadData() {
        const loadedData = stateManager.loadFromStorage();
        if (loadedData) {
            state.prompts = loadedData.prompts ?? [];
            state.collections = loadedData.collections ?? [];
            state.categories = loadedData.categories ?? [];
            state.preferences = { ...state.preferences, ...loadedData.preferences };
            state.sidebarSections = { ...state.sidebarSections, ...loadedData.sidebarSections };
            state.searchQuery = ''; // Reset search to prevent heavy initial indexing
        }
    }

    _ensureDefaultContent() {
        if (state.prompts.length === 0) {
            const content = 'Please review the following {language} code and provide detailed feedback:\n\n{code}\n\nFocus on:\n1. Code quality and best practices\n2. Potential bugs or issues\n3. Performance improvements\n4. Security considerations\n\nPlease provide specific suggestions for improvement.';
            const examplePrompt = {
                id: generateId(),
                title: 'Code Review Request',
                description: 'Ask AI to review your code and provide feedback',
                content: content,
                collectionId: null,
                categoryId: null,
                tags: ['coding', 'review', 'example'],
                variables: extractVariables(content),
                favorite: false,
                usageCount: 0,
                lastUsed: null,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            examplePrompt._searchIndex = [examplePrompt.title, examplePrompt.description, examplePrompt.content, ...examplePrompt.tags].join(' ').toLowerCase();
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