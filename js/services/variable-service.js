import { state, stateManager } from '../state.js';
import { storageService } from './storage-service.js';
import { openModal, closeModal } from '../view/modal.js';
import { showToast } from '../view/ui.js';
import { escapeHtml, escapeRegex, generatePlaceholder, copyToClipboard } from '../utils/helpers.js';

export const variableService = {
    showUsePromptModal(id) {
        state.usingPromptId = id;
        const prompt = state.prompts.find(p => p.id === id);
        if (!prompt) return;

        document.getElementById('usePromptTitle').textContent = prompt.title;
        const variableInputs = document.getElementById('variableInputs');
        const progressContainer = document.getElementById('variableProgress');
        variableInputs.innerHTML = '';

        const savedValues = storageService.loadVariableValues(id);

        if (prompt.variables.length > 0) {
            progressContainer.style.display = 'block';
            prompt.variables.forEach((variable, index) => {
                const group = document.createElement('div');
                group.className = 'form-group';
                group.innerHTML = `
                    <label class="form-label" for="use-prompt-var-${index}">${escapeHtml(variable)}</label>
                    <input type="text" class="form-input variable-input" 
                        placeholder="${escapeHtml(generatePlaceholder(variable))}"
                        id="use-prompt-var-${index}" data-var="${escapeHtml(variable)}" 
                        value="${escapeHtml(savedValues[variable] || '')}" autocomplete="off">
                `;
                variableInputs.appendChild(group);
            });

            document.querySelectorAll('.variable-input').forEach(input => {
                input.addEventListener('input', () => {
                    this.updateFinalPrompt();
                    this.updateProgress();
                    storageService.saveVariableValues(id, this.getVariableValuesFromForm());
                });
            });
        } else {
            progressContainer.style.display = 'none';
        }

        this.updateFinalPrompt();
        this.updateProgress();
        openModal('usePromptModal');
    },

    getVariableValuesFromForm() {
        const values = {};
        document.querySelectorAll('.variable-input').forEach(input => {
            values[input.dataset.var] = input.value;
        });
        return values;
    },

    updateFinalPrompt() {
        const prompt = state.prompts.find(p => p.id === state.usingPromptId);
        if (!prompt) return;

        let finalText = prompt.content;
        document.querySelectorAll('.variable-input').forEach(input => {
            const value = input.value.trim();
            if (value) {
                finalText = finalText.replace(new RegExp('\\{' + escapeRegex(input.dataset.var) + '\\}', 'g'), value);
            }
        });

        let highlightedText = escapeHtml(finalText);
        highlightedText = highlightedText.replace(/\{([^}]+)\}/g, '<span style="color: var(--accent);">{$1}</span>');
        document.getElementById('finalPromptPreview').innerHTML = highlightedText;
    },

    updateProgress() {
        const inputs = document.querySelectorAll('.variable-input');
        if (inputs.length === 0) return;
        const filled = Array.from(inputs).filter(i => i.value.trim() !== '').length;
        const percentage = (filled / inputs.length) * 100;
        document.getElementById('progressText').textContent = filled + '/' + inputs.length;
        document.getElementById('progressBar').style.width = percentage + '%';
    },

    copyFinalPrompt() {
        const prompt = state.prompts.find(p => p.id === state.usingPromptId);
        if (!prompt) return;

        const inputs = document.querySelectorAll('.variable-input');
        const firstEmpty = Array.from(inputs).find(i => !i.value.trim());

        if (firstEmpty) {
            firstEmpty.focus();
            firstEmpty.classList.add('invalid');
            setTimeout(() => firstEmpty.classList.remove('invalid'), 2000);
            showToast('Please fill all variables', 'error');
            return;
        }

        let finalText = prompt.content;
        inputs.forEach(input => {
            finalText = finalText.replace(new RegExp('\\{' + escapeRegex(input.dataset.var) + '\\}', 'g'), input.value.trim());
        });

        copyToClipboard(finalText).then(() => {
            prompt.usageCount++;
            prompt.lastUsed = Date.now();
            
            // Use centralized stateManager for saving
            stateManager.save();
            
            storageService.clearVariableValues(prompt.id);
            
            const btn = document.getElementById('copyPromptBtn');
            const btnText = document.getElementById('copyPromptBtnText');
            btnText.textContent = 'Copied!';
            btn.classList.add('success');
            setTimeout(() => {
                btnText.textContent = 'Copy Prompt';
                btn.classList.remove('success');
            }, 1500);
        }).catch(() => {
            showToast('Failed to copy to clipboard', 'error');
        });
    },

    copyPromptDirectly(id) {
        const prompt = state.prompts.find(p => p.id === id);
        if (!prompt) return;
        
        copyToClipboard(prompt.content).then(() => {
            prompt.usageCount++;
            prompt.lastUsed = Date.now();
            
            // Use centralized stateManager for saving
            stateManager.save();
            
            showToast('Copied to clipboard!', 'success');
        }).catch(() => {
            showToast('Failed to copy to clipboard', 'error');
        });
    },

    clearVariableValues(id) {
        storageService.clearVariableValues(id);
        document.querySelectorAll('.variable-input').forEach(input => input.value = '');
        this.updateFinalPrompt();
        this.updateProgress();
    }
};
