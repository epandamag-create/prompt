import { state } from '../state.js';
import { promptService } from '../services/prompt-service.js';
import { variableService } from '../services/variable-service.js';
import { copyToClipboard } from '../utils/helpers.js';
import { showToast } from '../view/ui.js';
import { modalController } from './modal-controller.js';

export const promptController = {
    save() {
        promptService.savePrompt();
    },

    delete(id) {
        promptService.deletePrompt(id);
    },

    clone(id) {
        promptService.clonePrompt(id);
    },

    toggleFavorite(id) {
        promptService.togglePromptFavorite(id);
    },

    copy(id) {
        const prompt = state.prompts.find(p => p.id === id);
        if (!prompt) return;
        if (prompt.variables && prompt.variables.length > 0) {
            variableService.showUsePromptModal(id);
        } else {
            variableService.copyPromptDirectly(id);
        }
    },

    copyPreview() {
        const previewModal = document.getElementById('previewModal');
        if (previewModal) {
            const promptId = previewModal.dataset.promptId;
            const prompt = state.prompts.find(p => p.id === promptId);
            if (prompt) {
                copyToClipboard(prompt.content).then(() => {
                    showToast('Copied to clipboard!', 'success');
                });
            }
        }
    },

    copyFinalPrompt() {
        variableService.copyFinalPrompt();
    },

    clearVariableValues() {
        variableService.clearVariableValues(state.usingPromptId);
    },

    cloneSelected() {
        const selected = Array.from(state.ui.selectedPrompts)[0];
        if (selected) {
            this.clone(selected);
        }
    },

    previewSelected() {
        const selected = Array.from(state.ui.selectedPrompts)[0];
        if (selected) {
            const prompt = state.prompts.find(p => p.id === selected);
            if (prompt) modalController.showPreview(prompt);
        }
    }
};