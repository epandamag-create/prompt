import { state } from '../state.js';
import { COLORS } from '../config/constants.js';
import { escapeHtml, extractVariables } from '../utils/helpers.js';
        // ============================================
        // VIEW LAYER (DOM Operations)
        // Functions for reading/writing DOM only
        // ============================================
export function getPromptFormData() {
    const tagsInput = document.getElementById('promptTags').value.trim();
    return {
        title: document.getElementById('promptTitle').value.trim(),
        description: document.getElementById('promptDescription').value.trim(),
        content: document.getElementById('promptContent').value.trim(),
        collectionId: document.getElementById('promptCollection').value,
        categoryId: document.getElementById('promptCategory').value,
        tags: tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : []
    };
}

export function populatePromptForm(prompt) {
    document.getElementById('promptTitle').value = prompt.title;
    document.getElementById('promptDescription').value = prompt.description || '';
    document.getElementById('promptContent').value = prompt.content;
    document.getElementById('promptTags').value = prompt.tags.join(', ');
    document.getElementById('promptCollection').value = prompt.collectionId || '';
    document.getElementById('promptCategory').value = prompt.categoryId || '';
}

export function resetPromptForm() {
    document.getElementById('promptForm').reset();
    document.getElementById('variablesPreview').style.display = 'none';
    document.getElementById('tagSuggestions').classList.remove('visible');
}

export function getCollectionFormData() {
    return {
        name: document.getElementById('collectionName').value.trim(),
        color: document.getElementById('collectionColor').value || '#3b82f6'
    };
}

export function getCategoryFormData() {
    return {
        name: document.getElementById('categoryName').value.trim(),
        color: document.getElementById('categoryColor').value || '#8b5cf6'
    };
}
// ============================================
        // PROMPT OPERATIONS
        // ============================================
export function updateCharCounter() {
    const content = document.getElementById('promptContent').value;
    const counter = document.getElementById('charCounter');
    const len = content.length;
    const tokens = Math.ceil(len / 4); 
    counter.textContent = len.toLocaleString() + ' chars · ~' + tokens.toLocaleString() + ' tokens';
    // Color hint: green < 2000, yellow < 4000, red >= 4000
    counter.style.color = len >= 4000 ? 'var(--error)' : len >= 2000 ? 'var(--warning)' : 'var(--text-muted)';
}

// ============================================
        // COLOR SWATCHES
        // ============================================
export function initColorSwatches(containerId, hiddenInputId, defaultColor) {
    const container = document.getElementById(containerId);
    const hidden = document.getElementById(hiddenInputId);
    hidden.value = defaultColor;
    container.innerHTML = '';
    
    COLORS.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch' + (color === defaultColor ? ' active' : '');
        swatch.style.background = color;
        swatch.title = color;
        swatch.onclick = () => {
            container.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
            hidden.value = color;
        };
        container.appendChild(swatch);
    });
}

export function previewVariables() {
    const content = document.getElementById('promptContent').value;
    const variables = extractVariables(content);
    const preview = document.getElementById('variablesPreview');
    const list = document.getElementById('variablesList');
    
    if (variables.length > 0) {
        preview.style.display = 'block';
        list.innerHTML = variables.map(v => 
            `<span style="
                background: var(--accent);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-family: var(--font-mono);
                font-weight: 500;
            ">{${escapeHtml(v)}}</span>`
        ).join('');
    } else {
        preview.style.display = 'none';
    }
}
