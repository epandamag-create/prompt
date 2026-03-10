import { describe, it, expect } from '../test-framework.js';
import { promptController } from '../../js/controllers/prompt-controller.js';
import { state } from '../../js/state.js';
import { promptService } from '../../js/services/prompt-service.js';
import { variableService } from '../../js/services/variable-service.js';
import { modalController } from '../../js/controllers/modal-controller.js';

describe('Controller: PromptController', () => {
    
    // Mock tracking variables
    let mockDeletePromptCalledWith = null;
    let mockClonePromptCalledWith = null;
    let mockShowUsePromptModalCalledWith = null;
    let mockCopyPromptDirectlyCalledWith = null;
    let mockShowPreviewCalledWith = null;

    // Save original methods
    const originalDeletePrompt = promptService.deletePrompt;
    const originalClonePrompt = promptService.clonePrompt;
    const originalShowUsePromptModal = variableService.showUsePromptModal;
    const originalCopyPromptDirectly = variableService.copyPromptDirectly;
    const originalShowPreview = modalController.showPreview;

    function resetTestEnvironment() {
        // Reset mocks
        mockDeletePromptCalledWith = null;
        mockClonePromptCalledWith = null;
        mockShowUsePromptModalCalledWith = null;
        mockCopyPromptDirectlyCalledWith = null;
        mockShowPreviewCalledWith = null;

        // Setup mocks
        promptService.deletePrompt = (id) => { mockDeletePromptCalledWith = id; };
        promptService.clonePrompt = (id) => { mockClonePromptCalledWith = id; };
        variableService.showUsePromptModal = (id) => { mockShowUsePromptModalCalledWith = id; };
        variableService.copyPromptDirectly = (id) => { mockCopyPromptDirectlyCalledWith = id; };
        modalController.showPreview = (prompt) => { mockShowPreviewCalledWith = prompt; };

        // Reset state
        state.prompts = [
            { id: 'p1', title: 'Simple Prompt', content: 'Hello', variables: [], tags: [] },
            { id: 'p2', title: 'Variable Prompt', content: 'Hello {name}', variables: ['name'], tags: [] }
        ];
        state.ui.selectedPrompts = new Set();
    }

    it('delete should call promptService.deletePrompt', async () => {
        resetTestEnvironment();
        promptController.delete('p1');
        expect(mockDeletePromptCalledWith).toBe('p1');
    });

    it('clone should call promptService.clonePrompt', async () => {
        resetTestEnvironment();
        promptController.clone('p1');
        expect(mockClonePromptCalledWith).toBe('p1');
    });

    it('copy should open modal if prompt has variables', async () => {
        resetTestEnvironment();
        promptController.copy('p2'); // Has variables
        expect(mockShowUsePromptModalCalledWith).toBe('p2');
        expect(mockCopyPromptDirectlyCalledWith).toBe(null);
    });

    it('copy should copy directly if prompt has no variables', async () => {
        resetTestEnvironment();
        promptController.copy('p1'); // No variables
        expect(mockShowUsePromptModalCalledWith).toBe(null);
        expect(mockCopyPromptDirectlyCalledWith).toBe('p1');
    });

    it('cloneSelected should clone the selected prompt', async () => {
        resetTestEnvironment();
        state.ui.selectedPrompts.add('p1');
        promptController.cloneSelected();
        expect(mockClonePromptCalledWith).toBe('p1');
    });

    it('cloneSelected should do nothing if no prompt selected', async () => {
        resetTestEnvironment();
        promptController.cloneSelected();
        expect(mockClonePromptCalledWith).toBe(null);
    });

    it('previewSelected should show preview for selected prompt', async () => {
        resetTestEnvironment();
        state.ui.selectedPrompts.add('p1');
        promptController.previewSelected();
        expect(mockShowPreviewCalledWith).toBeTruthy();
        expect(mockShowPreviewCalledWith.id).toBe('p1');
    });
});