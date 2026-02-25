import { DEFAULT_PREFERENCES } from './config/constants.js';        
        // ============================================
        // STATE MANAGEMENT
        // ============================================
export const state = {
            prompts: [],
            collections: [],
            categories: [],
            currentView: 'all',
            currentCollections: [],   // multi-select
            currentTags: [],          // multi-select
            currentCategories: [],    // multi-select
            searchQuery: '',
            editingPromptId: null,
            editingCollectionId: null,
            editingCategoryId: null,
            usingPromptId: null,
            sidebarSections: { quickaccess: true, categories: true, collections: true, tags: true },
            preferences: { ...DEFAULT_PREFERENCES }, 
            ui: {
                // Modals state (instead of DOM .visible classes)
                openModals: new Set(),
                
                // Bulk selection (was global state.ui.selectedPrompts)
                selectedPrompts: new Set(),
                
                // Tag autocomplete (was global state.ui.tagSuggestionIndex)
                tagSuggestionIndex: -1,
                
                // Toast notifications (was global state.ui.activeToasts)
                activeToasts: [],
                
                // Confirm dialog (was global state.ui.confirmCallback/state.ui.confirmModalOpen)
                confirmCallback: null,
                confirmModalOpen: false,
                currentConfirmId: 0, // Track current confirm dialog ID for race condition prevention
                
                // Dropdown menus state (instead of DOM .open classes)
                openDropdowns: new Set()
            }
        };
