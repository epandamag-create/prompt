import { viewService } from '../services/view-service.js';
import { stateManager } from '../state.js';
import { filterService } from '../services/filter-service.js';

export const sidebarController = {
    toggleSidebar() {
        const isMobile = window.innerWidth <= 768;
        const sidebar = document.getElementById('sidebar');
        
        if (isMobile) {
            const backdrop = document.getElementById('sidebarBackdrop');
            sidebar.classList.toggle('mobile-open');
            backdrop.classList.toggle('visible');
        } else {
            viewService.toggleSidebar();
        }
        
        const toggleBtn = document.getElementById('sidebarToggleBtn');
        if (toggleBtn) {
            const isOpen = isMobile ? sidebar.classList.contains('mobile-open') : !sidebar.classList.contains('collapsed');
            toggleBtn.setAttribute('aria-expanded', isOpen);
        }
    },

    toggleSection(section) {
        viewService.toggleSidebarSection(section);
    },

    closeMobileSidebar() {
        document.getElementById('sidebar').classList.remove('mobile-open');
        document.getElementById('sidebarBackdrop').classList.remove('visible');
    },

    setView(view) {
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            this.closeMobileSidebar();
        }
        
        document.getElementById('sidebar').classList.remove('mobile-open');
        const backdrop = document.getElementById('sidebarBackdrop');
        if (backdrop) backdrop.classList.remove('visible');
        
        filterService.setView(view);
        stateManager.commit();
    }
};