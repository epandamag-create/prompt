import { describe, it, expect } from '../test-framework.js';
import { filterController } from '../../js/controllers/filter-controller.js';
import { filterService } from '../../js/services/filter-service.js';

describe('Controller: FilterController', () => {
    
    // Mock tracking variables
    let mockToggleCollectionCalledWith = null;
    let mockToggleCategoryCalledWith = null;
    let mockToggleTagCalledWith = null;
    let mockClearAllCalled = false;

    // Save original methods
    const originalToggleCollection = filterService.toggleCollection;
    const originalToggleCategory = filterService.toggleCategory;
    const originalToggleTag = filterService.toggleTag;
    const originalClearAll = filterService.clearAll;

    function resetTestEnvironment() {
        // Reset mocks
        mockToggleCollectionCalledWith = null;
        mockToggleCategoryCalledWith = null;
        mockToggleTagCalledWith = null;
        mockClearAllCalled = false;

        // Setup mocks
        filterService.toggleCollection = (id) => { mockToggleCollectionCalledWith = id; };
        filterService.toggleCategory = (id) => { mockToggleCategoryCalledWith = id; };
        filterService.toggleTag = (tag) => { mockToggleTagCalledWith = tag; };
        filterService.clearAll = () => { mockClearAllCalled = true; };
    }

    it('toggleCollection should call filterService.toggleCollection', async () => {
        resetTestEnvironment();
        filterController.toggleCollection('col1');
        expect(mockToggleCollectionCalledWith).toBe('col1');
    });

    it('toggleCategory should call filterService.toggleCategory', async () => {
        resetTestEnvironment();
        filterController.toggleCategory('cat1');
        expect(mockToggleCategoryCalledWith).toBe('cat1');
    });

    it('toggleTag should call filterService.toggleTag', async () => {
        resetTestEnvironment();
        filterController.toggleTag('tag1');
        expect(mockToggleTagCalledWith).toBe('tag1');
    });

    it('clearAll should call filterService.clearAll', async () => {
        resetTestEnvironment();
        filterController.clearAll();
        expect(mockClearAllCalled).toBe(true);
    });
});