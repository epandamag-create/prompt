import { state } from '../state.js';
import { getFilteredPrompts } from '../services/prompt-service.js';
import { sanitizeId, escapeHtml, highlightMarkdown, formatDate } from '../utils/helpers.js';

// Pagination configuration
const PAGINATION_THRESHOLD = 50; // Enable pagination at 50+ prompts
const ITEMS_PER_PAGE = 50;

let paginationState = {
    currentPage: 1,
    totalPages: 1
};

export function renderAll(updates = {}) {
    const renderEverything = Object.keys(updates).length === 0;
    const { 
        prompts = true, 
        filterBar = true, 
        collections = true, 
        categories = true, 
        tags = true 
    } = renderEverything ? { prompts: true, filterBar: true, collections: true, categories: true, tags: true } : updates;

    if (prompts) renderPrompts();
    if (filterBar) renderFilterBar();
    if (collections) renderCollections();
    if (categories) renderCategories();
    if (tags) renderTags();

    updateSidebarHighlights();
    updateContentTitle();
}

export function renderPrompts() {
    const grid = document.getElementById('promptGrid');
    const prompts = getFilteredPrompts();
    
    if (prompts.length === 0) {
        renderEmptyState(grid);
        updateStats(prompts.length);
        removePagination(grid);
        return;
    }

    // Check if we should use pagination
    const usePagination = prompts.length > PAGINATION_THRESHOLD;
    
    // Calculate which prompts to show
    let promptsToRender = prompts;
    let currentPage = paginationState.currentPage;
    
    if (usePagination) {
        paginationState.totalPages = Math.ceil(prompts.length / ITEMS_PER_PAGE);
        // Clamp current page to valid range
        if (currentPage < 1) currentPage = 1;
        if (currentPage > paginationState.totalPages) currentPage = paginationState.totalPages;
        paginationState.currentPage = currentPage;
        
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, prompts.length);
        promptsToRender = prompts.slice(startIndex, endIndex);
    } else {
        paginationState.currentPage = 1;
        paginationState.totalPages = 1;
    }

    // Clear empty state if it exists
    if (grid.querySelector('.empty-state')) {
        grid.innerHTML = '';
    }

    // Use DocumentFragment for batch DOM insertion
    const fragment = document.createDocumentFragment();
    
    promptsToRender.forEach(prompt => {
        const card = generatePromptCardHTML(prompt);
        fragment.appendChild(card);
    });
    
    // Single DOM operation instead of multiple appends
    grid.innerHTML = '';
    grid.appendChild(fragment);

    updateStats(prompts.length);
    if (usePagination) {
        renderPagination(grid, prompts);
    } else {
        removePagination(grid);
    }
}

function renderPagination(grid, prompts) {
    // Check if pagination already exists
    let pagination = document.getElementById('paginationControls');
    if (!pagination) {
        pagination = document.createElement('div');
        pagination.id = 'paginationControls';
        pagination.className = 'pagination-controls';
        grid.parentNode.insertBefore(pagination, grid.nextSibling);
    }
    
    const { currentPage, totalPages } = paginationState;
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '<div class="pagination-info">';
    html += `<span>Page ${currentPage} of ${totalPages}</span>`;
    html += `<span class="pagination-count">(${prompts.length} total)</span>`;
    html += '</div>';
    html += '<div class="pagination-buttons">';
    
    // Previous button
    if (currentPage > 1) {
        html += `<button class="pagination-btn" data-action="page-prev">← Previous</button>`;
    }
    
    // Page numbers (show up to 5 pages)
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    if (startPage > 1) {
        html += `<button class="pagination-btn" data-action="page-1">1</button>`;
        if (startPage > 2) {
            html += `<span class="pagination-ellipsis">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage ? 'active' : '';
        html += `<button class="pagination-btn ${isActive}" data-action="page-${i}">${i}</button>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span class="pagination-ellipsis">...</span>`;
        }
        html += `<button class="pagination-btn" data-action="page-${totalPages}">${totalPages}</button>`;
    }
    
    // Next button
    if (currentPage < totalPages) {
        html += `<button class="pagination-btn" data-action="page-next">Next →</button>`;
    }
    
    html += '</div>';
    pagination.innerHTML = html;
    
    // Add click handlers
    pagination.querySelectorAll('.pagination-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.dataset.action;
            if (action === 'page-prev') {
                paginationState.currentPage--;
            } else if (action === 'page-next') {
                paginationState.currentPage++;
            } else if (action.startsWith('page-')) {
                paginationState.currentPage = parseInt(action.replace('page-', ''));
            }
            renderPrompts();
        });
    });
}

function removePagination(grid) {
    const pagination = document.getElementById('paginationControls');
    if (pagination) {
        pagination.remove();
    }
}

// ============================================
// RENDERING
// ============================================
function generatePromptCardHTML(prompt) {
    const hasVariables = prompt.variables && prompt.variables.length > 0;
    const category = state.categories.find(c => c.id === prompt.categoryId);
    const collection = state.collections.find(c => c.id === prompt.collectionId);
    const safeId = sanitizeId(prompt.id);
    const isSelected = state.ui.selectedPrompts.has(prompt.id);
    
    const div = document.createElement('div');
    div.className = `prompt-card ${isSelected ? 'selected' : ''}`;
    div.setAttribute('role', 'article');
    div.setAttribute('aria-label', prompt.title);
    div.dataset.promptId = safeId;
    div.dataset.updatedAt = prompt.updatedAt;
    div.dataset.favorite = prompt.favorite;
    
    div.innerHTML = `
        <div class="prompt-card-header">
            <div class="prompt-title" data-action="edit" title="Click to edit">${escapeHtml(prompt.title)}</div>
            <div class="prompt-badges">
                ${category ? `<span class="prompt-category-badge" style="background: ${category.color};" data-action="filter-category" data-id="${sanitizeId(category.id)}">${escapeHtml(category.name)}</span>` : ''}
                ${collection ? `<span class="prompt-collection-badge" style="border-color: ${collection.color}; color: ${collection.color};" data-action="filter-collection" data-id="${sanitizeId(collection.id)}" title="Collection: ${escapeHtml(collection.name)}">📁 ${escapeHtml(collection.name)}</span>` : ''}
            </div>
            <button class="prompt-favorite ${prompt.favorite ? 'active' : ''}" data-action="toggle-favorite" title="${prompt.favorite ? 'Remove from favorites' : 'Add to favorites'}" aria-label="${prompt.favorite ? 'Remove from favorites' : 'Add to favorites'}" aria-pressed="${prompt.favorite}">
                <svg fill="${prompt.favorite ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                </svg>
            </button>
            <div class="prompt-actions">
                <button class="prompt-action-btn btn-copy" data-action="copy" title="${hasVariables ? 'Fill variables & copy' : 'Copy to clipboard'}" aria-label="Copy prompt">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        ${hasVariables
                            ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>'
                            : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>'}
                    </svg>
                </button>
                <button class="prompt-action-btn btn-edit" data-action="edit" title="Edit" aria-label="Edit prompt">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                    </svg>
                </button>
                <button class="prompt-action-btn btn-clone" data-action="clone" title="Duplicate" aria-label="Duplicate prompt">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                    </svg>
                </button>
                <button class="prompt-action-btn btn-select ${isSelected ? 'active' : ''}" data-action="select" title="Select" aria-label="Select prompt">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        ${isSelected 
                            ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>'
                            : '<circle cx="12" cy="12" r="9" stroke-width="2"/>'}
                    </svg>
                </button>
                <button class="prompt-action-btn btn-delete" data-action="delete" title="Delete" aria-label="Delete prompt">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                </button>
            </div>
        </div>
        ${prompt.description ? `<div class="prompt-description">${escapeHtml(prompt.description)}</div>` : ''}
        <div class="prompt-content">${highlightMarkdown(prompt.content)}</div>
        <div class="prompt-tags">
            ${prompt.tags.map(tag => { return `<span class="prompt-tag" data-action="filter-tag" data-tag="${escapeHtml(tag)}">#${escapeHtml(tag)}</span>`; }).join('')}
            ${hasVariables ? `<span class="variable-badge">${prompt.variables.length} var${prompt.variables.length > 1 ? 's' : ''}</span>` : ''}
            <span class="prompt-date">${formatDate(prompt.updatedAt)}${prompt.usageCount > 0 ? ` &middot; ${prompt.usageCount}&times;` : ''}</span>
        </div>
    `;
    
    return div;
}

function generateEmptyStateHTML(isFiltered) {
    if (isFiltered) {
        const actionBtn = state.searchQuery 
            ? `<button class="btn btn-secondary" data-action="clear-search">Clear Search</button>`
            : `<button class="btn btn-secondary" data-action="clear-all-filters">Clear Filters</button>`;
        
        return `
            <div class="empty-state">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <h3>No prompts found</h3>
                <p>${state.searchQuery ? 'Try a different search term' : 'This view is empty'}</p>
                ${actionBtn}
            </div>
        `;
    }
    
    return `
        <div class="empty-state">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <h3>No prompts yet</h3>
            <p>Start building your AI prompt library</p>
            <button class="btn btn-primary" data-action="show-add-prompt-modal">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                Create Your First Prompt
            </button>
        </div>
    `;
}

function renderEmptyState(grid) {
    const isFiltered = state.searchQuery || state.currentView !== 'all';
    grid.innerHTML = generateEmptyStateHTML(isFiltered);
}

export function renderCollections() {
    const container = document.getElementById('collectionsList');
    if (state.collections.length === 0) { container.innerHTML = ''; return; }

    // Pre-compute counts once - O(n)
    const promptCounts = state.prompts.reduce((acc, p) => {
        if (p.collectionId) acc[p.collectionId] = (acc[p.collectionId] || 0) + 1;
        return acc;
    }, {});

    container.innerHTML = state.collections.map(collection => {
        const count = promptCounts[collection.id] || 0;
        const color = collection.color || '#3b82f6';
        const safeId = sanitizeId(collection.id);
        return `
            <div class="collection-item" data-action="set-collection-view" data-id="${safeId}" role="treeitem" aria-label="${escapeHtml(collection.name)}, ${count} prompts">
                <span class="collection-color-dot" style="background: ${color};"></span>
                <span class="collection-item-name">${escapeHtml(collection.name)}</span>
                <span class="collection-item-count">${count}</span>
                <div class="collection-item-menu">
                    <button class="collection-menu-btn" data-action="show-edit-collection-modal" data-id="${safeId}" title="Edit collection" aria-label="Edit ${escapeHtml(collection.name)}">
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                        </svg>
                    </button>
                    <button class="collection-menu-btn" data-action="delete-collection" data-id="${safeId}" title="Delete collection" aria-label="Delete ${escapeHtml(collection.name)}">
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                    </button>
                </div>
            </div>`;
    }).join('');
}

export function renderCategories() {
    const container = document.getElementById('categoriesList');
    if (state.categories.length === 0) { container.innerHTML = ''; return; }

    container.innerHTML = state.categories.map(cat => {
        const count = state.prompts.filter(p => p.categoryId === cat.id).length;
        const color = cat.color || '#8b5cf6';
        const safeId = sanitizeId(cat.id);
        return `
            <div class="category-item" data-action="set-category-view" data-id="${safeId}" role="treeitem" aria-label="${escapeHtml(cat.name)}, ${count} prompts">
                <span class="category-dot" style="background: ${color};"></span>
                <span class="category-item-name">${escapeHtml(cat.name)}</span>
                <span class="category-item-count">${count}</span>
                <div class="category-item-menu">
                    <button class="category-menu-btn" data-action="show-edit-category-modal" data-id="${safeId}" title="Edit category" aria-label="Edit ${escapeHtml(cat.name)}">
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                        </svg>
                    </button>
                    <button class="category-menu-btn" data-action="delete-category" data-id="${safeId}" title="Delete category" aria-label="Delete ${escapeHtml(cat.name)}">
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                    </button>
                </div>
            </div>`;
    }).join('');
}

export function renderTags() {
    const container = document.getElementById('tagsList');
    const tagCounts = {};
    state.prompts.forEach(p => p.tags.forEach(tag => { tagCounts[tag] = (tagCounts[tag] || 0) + 1; }));
    const tags = Object.entries(tagCounts).sort((a, b) => a[0].localeCompare(b[0]));

    if (tags.length === 0) {
        container.innerHTML = '<div style="padding: 4px 8px; color: var(--text-muted); font-size: 12px;">No tags yet</div>';
        return;
    }

    container.className = 'tags-cloud';
    container.innerHTML = tags.map(([tag, count]) => {
        return `
        <div class="tag-chip" data-action="set-tag-view" data-tag="${escapeHtml(tag)}" role="treeitem" aria-label="Tag ${escapeHtml(tag)}, ${count} prompts">
            <span>#${escapeHtml(tag)}</span>
            <span class="tag-count">${count}</span>
        </div>`;
    }).join('');
}

// ============================================
// FILTER BAR
// ============================================
export function renderFilterBar() {
    const bar = document.getElementById('filterBar');
    if (!bar) return;
    const chips = [];

    state.currentCategories.forEach(id => {
        const cat = state.categories.find(c => c.id === id);
        if (cat) chips.push(`<span class="filter-chip" style="background: ${cat.color}22; color: ${cat.color};"><span>${escapeHtml(cat.name)}</span><span class="filter-chip-remove" data-action="set-category-view" data-id="${sanitizeId(id)}">&times;</span></span>`);
    });
    state.currentCollections.forEach(id => {
        const col = state.collections.find(c => c.id === id);
        if (col) chips.push(`<span class="filter-chip" style="background: ${col.color}22; color: ${col.color};"><span>${escapeHtml(col.name)}</span><span class="filter-chip-remove" data-action="set-collection-view" data-id="${sanitizeId(id)}">&times;</span></span>`);
    });
    state.currentTags.forEach(tag => {
        chips.push(`<span class="filter-chip"><span>#${escapeHtml(tag)}</span><span class="filter-chip-remove" data-action="set-tag-view" data-tag="${escapeHtml(tag)}">&times;</span></span>`);
    });

    if (chips.length > 0) {
        bar.innerHTML = chips.join('') + `<span class="filter-clear-btn" data-action="clear-all-filters">Clear all</span>`;
        bar.classList.add('visible');
    } else {
        bar.innerHTML = '';
        bar.classList.remove('visible');
    }
}

export function updateStats(count) {
    document.getElementById('statsDisplay').textContent = `${count} prompt${count !== 1 ? 's' : ''}`;
    document.getElementById('allCount').textContent = state.prompts.length;
    document.getElementById('favCount').textContent = state.prompts.filter(p => p.favorite).length;
}

export function updateSidebarHighlights() {
    document.querySelectorAll('.quick-access-item').forEach(item => {
        const isQuickView = ['all', 'favorites', 'recent'].includes(state.currentView);
        item.classList.toggle('active', isQuickView && item.dataset.view === state.currentView);
    });
    document.querySelectorAll('.collection-item').forEach(item => {
        item.classList.toggle('active', state.currentCollections.includes(item.dataset.id));
    });
    document.querySelectorAll('.category-item').forEach(item => {
        item.classList.toggle('active', state.currentCategories.includes(item.dataset.id));
    });
    document.querySelectorAll('.tag-chip').forEach(item => {
        item.classList.toggle('active', state.currentTags.includes(item.dataset.tag));
    });
}

export function updateContentTitle() {
    const parts = [];
    if (state.currentView === 'favorites') parts.push('Favorites');
    else if (state.currentView === 'recent') parts.push('Recent');

    state.currentCategories.forEach(id => {
        const cat = state.categories.find(c => c.id === id);
        if (cat) parts.push(cat.name);
    });
    state.currentCollections.forEach(id => {
        const col = state.collections.find(c => c.id === id);
        if (col) parts.push(col.name);
    });
    state.currentTags.forEach(tag => parts.push('#' + tag));

    if (parts.length === 0) {
        document.getElementById('contentTitle').textContent = 'All Prompts';
    } else {
        document.getElementById('contentTitle').textContent = parts.join(' + ');
    }
}

export function updateCollectionDropdown() {
    const select = document.getElementById('promptCollection');
    select.innerHTML = '<option value="">No Collection</option>';
    state.collections.forEach(collection => {
        const option = document.createElement('option');
        option.value = collection.id;
        option.textContent = collection.name;
        select.appendChild(option);
    });
}

export function updateCategoryDropdown() {
    const select = document.getElementById('promptCategory');
    select.innerHTML = '<option value="">No Category</option>';
    state.categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        select.appendChild(option);
    });
}
