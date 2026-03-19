import { describe, it, expect } from '../test-framework.js';
import { promptController } from '../../js/controllers/prompt-controller.js';
import { state, stateManager } from '../../js/state.js';
import { promptService } from '../../js/services/prompt-service.js';
import { variableService } from '../../js/services/variable-service.js';
import { modalController } from '../../js/controllers/modal-controller.js';
import { historyService } from '../../js/services/history-service.js';

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

// ── BLOCKER-1: deletePrompt must not register a duplicate restore path ────────
// Before the fix, showToast received an undo callback that also called
// this.restore(), so clicking the toast AND pressing Ctrl+Z would each restore
// the prompt independently. After the fix only historyService is the undo path.

describe('Service: PromptService — deletePrompt undo registration', () => {

    const originalDeletePromptMethod = promptService.deletePrompt;
    const originalCommit = stateManager.commit;
    const originalDeleteState = stateManager.deletePrompt;
    const originalRestore = stateManager.restorePrompt;

    let restoreCallCount = 0;

    function resetTestEnvironment() {
        restoreCallCount = 0;

        historyService._undoStack = [];
        historyService._redoStack = [];

        // Minimal state — one prompt to delete
        state.prompts = [{ id: 'del1', title: 'To Delete', content: 'Bye', tags: [], variables: [] }];
        state.collections = [];
        state.categories = [];
        state.ui.selectedPrompts = new Set();

        // Suppress commit's heavy DOM/DB work
        stateManager.commit = () => {};

        // Track restore calls
        stateManager.restorePrompt = (deleted) => {
            restoreCallCount++;
            // Put the prompt back so repeated undo calls don't crash
            if (deleted && deleted.prompt) state.prompts.push(deleted.prompt);
        };
    }

    function teardown() {
        stateManager.commit = originalCommit;
        stateManager.restorePrompt = originalRestore;
    }

    it('deletePrompt() registers exactly one undo entry in historyService', async () => {
        resetTestEnvironment();
        promptService.deletePrompt('del1');
        expect(historyService._undoStack.length).toBe(1);
        teardown();
    });

    it('deletePrompt() undo entry restores the prompt (calls stateManager.restorePrompt once)', async () => {
        resetTestEnvironment();
        promptService.deletePrompt('del1');
        historyService.undo();
        expect(restoreCallCount).toBe(1);
        teardown();
    });

    it('deletePrompt() does not expose a second restore path — undo only via historyService', async () => {
        // After the fix there is no toast callback; the only undo path is
        // historyService. We verify by exhausting the stack: one undo call
        // is all that exists, and a second undo does nothing.
        resetTestEnvironment();
        promptService.deletePrompt('del1');

        historyService.undo(); // correct undo
        const countAfterFirstUndo = restoreCallCount;

        historyService.undo(); // stack is empty — should be a no-op
        const countAfterSecondUndo = restoreCallCount;

        expect(countAfterFirstUndo).toBe(1);
        expect(countAfterSecondUndo).toBe(1); // no extra restore triggered
        teardown();
    });
});