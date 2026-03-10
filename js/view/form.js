import { state } from '../state.js';
import { COLORS } from '../config/constants.js';
import { escapeHtml, extractVariables } from '../utils/helpers.js';

// ============================================
// VIEW LAYER (DOM Operations)
// Functions for reading/writing DOM only
// ============================================

/**
 * Gets form data from the prompt form
 * @returns {import('../models/prompt.js').PromptFormData} Form data object
 */
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

/**
 * Populates the prompt form with existing prompt data
 * @param {import('../models/prompt.js').Prompt} prompt - The prompt to populate
 * @returns {void}
 */
export function populatePromptForm(prompt) {
    document.getElementById('promptTitle').value = prompt.title;
    document.getElementById('promptDescription').value = prompt.description || '';
    document.getElementById('promptContent').value = prompt.content;
    document.getElementById('promptTags').value = prompt.tags.join(', ');
    document.getElementById('promptCollection').value = prompt.collectionId || '';
    document.getElementById('promptCategory').value = prompt.categoryId || '';
}

/**
 * Resets the prompt form to its default state
 * @returns {void}
 */
export function resetPromptForm() {
    document.getElementById('promptForm').reset();
    document.getElementById('variablesPreview').style.display = 'none';
    document.getElementById('tagSuggestions').classList.remove('visible');
}

/**
 * Gets form data from the collection form
 * @returns {import('../models/collection.js').CollectionFormData} Form data object
 */
export function getCollectionFormData() {
    return {
        name: document.getElementById('collectionName').value.trim(),
        color: document.getElementById('collectionColor').value || '#3b82f6'
    };
}

/**
 * Gets form data from the category form
 * @returns {import('../models/category.js').CategoryFormData} Form data object
 */
export function getCategoryFormData() {
    return {
        name: document.getElementById('categoryName').value.trim(),
        color: document.getElementById('categoryColor').value || '#8b5cf6'
    };
}

// ============================================
// PROMPT OPERATIONS
// ============================================

/**
 * Updates the character and token counter display
 * @returns {void}
 */
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

/**
 * Initializes color swatches in a container
 * @param {string} containerId - ID of the container element
 * @param {string} hiddenInputId - ID of the hidden input to store value
 * @param {string} defaultColor - Default color hex code
 * @returns {void}
 */
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

/**
 * Previews variables extracted from prompt content
 * @returns {void}
 */
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
