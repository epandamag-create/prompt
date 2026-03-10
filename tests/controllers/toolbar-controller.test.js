import { describe, it, expect } from '../test-framework.js';
import { toolbarController } from '../../js/controllers/toolbar-controller.js';
import { viewService } from '../../js/services/view-service.js';
import * as ui from '../../js/view/ui.js';

describe('Controller: ToolbarController', () => {
    
    // Mock tracking variables
    let mockToggleThemeCalled = false;
    let mockSetViewModeCalledWith = null;
    let mockSetDensityCalledWith = null;
    let mockSetSortByCalledWith = null;
    let mockCloseDropdownCalledWith = null;

    // Save original methods
    const originalToggleTheme = viewService.toggleTheme;
    const originalSetViewMode = viewService.setViewMode;
    const originalSetDensity = viewService.setDensity;
    const originalSetSortBy = viewService.setSortBy;
    const originalCloseDropdown = ui.closeDropdown;

    function resetTestEnvironment() {
        // Reset mocks
        mockToggleThemeCalled = false;
        mockSetViewModeCalledWith = null;
        mockSetDensityCalledWith = null;
        mockSetSortByCalledWith = null;
        mockCloseDropdownCalledWith = null;

        // Setup mocks
        viewService.toggleTheme = () => { mockToggleThemeCalled = true; };
        viewService.setViewMode = (mode) => { mockSetViewModeCalledWith = mode; };
        viewService.setDensity = (density) => { mockSetDensityCalledWith = density; };
        viewService.setSortBy = (sort) => { mockSetSortByCalledWith = sort; };
        
        // We need to mock the exported function from ui.js. 
        // Since we imported * as ui, we can try to override it if it's mutable, 
        // but ES modules are read-only. 
        // However, in our test setup (browser native modules), we might need a different approach 
        // or rely on the fact that we are testing the controller logic which calls these functions.
        // For this specific test environment without a bundler/mocking library, 
        // we will assume the controller imports `closeDropdown` directly.
        // To properly mock `closeDropdown` which is imported in `toolbar-controller.js`,
        // we would typically need dependency injection or a module mocker.
        // Given the constraints, we will focus on `viewService` calls which we can mock 
        // because `viewService` is an object exported from a module.
    }

    it('toggleTheme should call viewService.toggleTheme', async () => {
        resetTestEnvironment();
        toolbarController.toggleTheme();
        expect(mockToggleThemeCalled).toBe(true);
    });

    it('setViewMode should call viewService.setViewMode', async () => {
        resetTestEnvironment();
        toolbarController.setViewMode('grid');
        expect(mockSetViewModeCalledWith).toBe('grid');
    });

    it('setSort should call viewService.setSortBy', async () => {
        resetTestEnvironment();
        toolbarController.setSort('newest');
        expect(mockSetSortByCalledWith).toBe('newest');
    });
});