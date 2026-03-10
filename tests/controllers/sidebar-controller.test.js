import { describe, it, expect } from '../test-framework.js';
import { sidebarController } from '../../js/controllers/sidebar-controller.js';
import { viewService } from '../../js/services/view-service.js';
import { filterService } from '../../js/services/filter-service.js';
import { stateManager } from '../../js/state.js';

describe('Controller: SidebarController', () => {
    
    // Setup DOM container
    const container = document.createElement('div');
    container.id = 'test-sidebar-container';
    document.body.appendChild(container);

    // Mock tracking variables
    let mockToggleSidebarCalled = false;
    let mockToggleSidebarSectionCalledWith = null;
    let mockSetViewCalledWith = null;
    let mockStateCommitCalled = false;

    // Save original methods
    const originalToggleSidebar = viewService.toggleSidebar;
    const originalToggleSidebarSection = viewService.toggleSidebarSection;
    const originalSetView = filterService.setView;
    const originalCommit = stateManager.commit;

    function resetTestEnvironment() {
        // 1. Reset DOM
        container.innerHTML = `
            <div id="sidebar"></div>
            <div id="sidebarBackdrop"></div>
            <button id="sidebarToggleBtn"></button>
        `;

        // 2. Reset Mocks
        mockToggleSidebarCalled = false;
        mockToggleSidebarSectionCalledWith = null;
        mockSetViewCalledWith = null;
        mockStateCommitCalled = false;

        // Setup mocks
        viewService.toggleSidebar = () => { mockToggleSidebarCalled = true; };
        viewService.toggleSidebarSection = (section) => { mockToggleSidebarSectionCalledWith = section; };
        filterService.setView = (view) => { mockSetViewCalledWith = view; };
        stateManager.commit = () => { mockStateCommitCalled = true; };
    }

    it('toggleSidebar should call viewService.toggleSidebar on desktop', async () => {
        resetTestEnvironment();
        
        // Mock window.innerWidth to be desktop size
        Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
        
        sidebarController.toggleSidebar();
        
        expect(mockToggleSidebarCalled).toBe(true);
    });

    it('toggleSidebar should toggle classes on mobile', async () => {
        resetTestEnvironment();
        
        // Mock window.innerWidth to be mobile size
        Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 500 });
        
        const sidebar = document.getElementById('sidebar');
        const backdrop = document.getElementById('sidebarBackdrop');
        
        sidebarController.toggleSidebar();
        
        expect(sidebar.classList.contains('mobile-open')).toBe(true);
        expect(backdrop.classList.contains('visible')).toBe(true);
        expect(mockToggleSidebarCalled).toBe(false); // Should NOT call viewService on mobile
    });

    it('toggleSection should call viewService.toggleSidebarSection', async () => {
        resetTestEnvironment();
        sidebarController.toggleSection('categories');
        expect(mockToggleSidebarSectionCalledWith).toBe('categories');
    });

    it('closeMobileSidebar should remove classes', async () => {
        resetTestEnvironment();
        
        const sidebar = document.getElementById('sidebar');
        const backdrop = document.getElementById('sidebarBackdrop');
        
        // Set initial state
        sidebar.classList.add('mobile-open');
        backdrop.classList.add('visible');
        
        sidebarController.closeMobileSidebar();
        
        expect(sidebar.classList.contains('mobile-open')).toBe(false);
        expect(backdrop.classList.contains('visible')).toBe(false);
    });

    it('setView should update view and commit state', async () => {
        resetTestEnvironment();
        
        // Mock window.innerWidth to be desktop size to avoid mobile logic interference
        Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });

        sidebarController.setView('favorites');
        
        expect(mockSetViewCalledWith).toBe('favorites');
        expect(mockStateCommitCalled).toBe(true);
    });
});