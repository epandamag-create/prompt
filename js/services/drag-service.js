/**
 * Drag Service — sidebar reordering and prompt-card drop-onto-collection/category.
 * Extracted from event-setup-service.js to keep drag logic in one place.
 */
import { state, stateManager } from '../state.js';
import { showToast } from '../view/ui.js';
import { renderAll } from '../view/render.js';

export function setupDragHandlers() {
    let dragSrcId = null;
    let dragType = null; // 'collection' | 'category' | 'prompt'

    document.addEventListener('dragstart', (e) => {
        // Prompt card takes priority
        const card = e.target.closest('.prompt-card');
        if (card) {
            dragType = 'prompt';
            dragSrcId = card.dataset.originalId;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', dragSrcId);
            return;
        }
        // Sidebar collection / category item
        const item = e.target.closest('.collection-item, .category-item');
        if (!item) return;
        dragType = item.classList.contains('collection-item') ? 'collection' : 'category';
        dragSrcId = item.dataset.originalId;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', dragSrcId);
    });

    document.addEventListener('dragend', () => {
        document.querySelectorAll('.collection-item, .category-item').forEach(el => {
            el.classList.remove('dragging', 'drag-over', 'prompt-drop-target');
        });
        dragSrcId = null;
        dragType = null;
    });

    document.addEventListener('dragover', (e) => {
        const item = e.target.closest('.collection-item, .category-item');
        if (!item) return;

        if (dragType === 'prompt') {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            document.querySelectorAll('.collection-item, .category-item')
                .forEach(el => el.classList.remove('prompt-drop-target'));
            item.classList.add('prompt-drop-target');
            return;
        }

        // Sidebar reordering: only allow same type
        const type = item.classList.contains('collection-item') ? 'collection' : 'category';
        if (type !== dragType) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        document.querySelectorAll(`.${dragType}-item`).forEach(el => el.classList.remove('drag-over'));
        item.classList.add('drag-over');
    });

    document.addEventListener('dragleave', (e) => {
        if (dragType !== 'prompt') return;
        const item = e.target.closest('.collection-item, .category-item');
        if (item && !item.contains(e.relatedTarget)) {
            item.classList.remove('prompt-drop-target');
        }
    });

    document.addEventListener('drop', (e) => {
        const item = e.target.closest('.collection-item, .category-item');
        if (!item) return;
        e.preventDefault();

        if (dragType === 'prompt') {
            _handlePromptDrop(item, dragSrcId);
            return;
        }

        _handleSidebarReorder(item, dragSrcId, dragType);
    });
}

function _handlePromptDrop(item, promptId) {
    item.classList.remove('prompt-drop-target');
    const isCollection = item.classList.contains('collection-item');
    const targetId = item.dataset.originalId;

    // If the dragged card is part of the bulk selection, move all selected prompts
    const idsToMove = (state.ui.selectedPrompts.size > 0 && state.ui.selectedPrompts.has(promptId))
        ? state.ui.selectedPrompts
        : new Set([promptId]);

    const affected = state.prompts.filter(p => idsToMove.has(p.id));
    if (affected.length === 0) return;

    const now = Date.now();
    if (isCollection) {
        affected.forEach(p => { p.collectionId = targetId; p.updatedAt = now; });
    } else {
        affected.forEach(p => { p.categoryId = targetId; p.updatedAt = now; });
    }

    // Use granular commit: collection/category counts in sidebar need refreshing
    // but a full renderAll is appropriate here since sidebar counts change too.
    stateManager.commit();
    showToast(
        `${affected.length > 1 ? affected.length + ' prompts' : '1 prompt'} moved to ${isCollection ? 'collection' : 'category'}!`,
        'success'
    );
}

function _handleSidebarReorder(item, srcId, type) {
    const dropId = item.dataset.originalId;
    if (srcId === dropId) return;

    const arr = type === 'collection' ? state.collections : state.categories;
    const fromIdx = arr.findIndex(x => x.id === srcId);
    const toIdx = arr.findIndex(x => x.id === dropId);
    if (fromIdx === -1 || toIdx === -1) return;

    arr.splice(toIdx, 0, arr.splice(fromIdx, 1)[0]);
    stateManager.save();
    renderAll();
}
