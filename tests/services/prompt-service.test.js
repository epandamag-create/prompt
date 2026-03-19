import { describe, it, expect } from '../test-framework.js';
import { promptService } from '../../js/services/prompt-service.js';
import { historyService } from '../../js/services/history-service.js';
import { state, stateManager } from '../../js/state.js';
import { createPromptModel } from '../../js/models/prompt.js';

describe('Service: PromptService — deletePrompt undo registration', () => {

    // Full DOM fixture so stateManager.commit → renderAll() doesn't throw
    const container = document.createElement('div');
    document.body.appendChild(container);

    const originalSave = stateManager.save;
    const originalRestorePrompt = stateManager.restorePrompt;

    let restorePromptCallCount = 0;

    function resetTestEnvironment() {
        historyService._undoStack = [];
        historyService._redoStack = [];

        restorePromptCallCount = 0;

        // Suppress IndexedDB writes (same pattern as io-controller tests)
        stateManager.save = () => {};

        // Track restorePrompt calls while still running the real logic
        stateManager.restorePrompt = (deleted) => {
            restorePromptCallCount++;
            originalRestorePrompt.call(stateManager, deleted);
        };

        state.prompts = [createPromptModel({ title: 'Test Prompt', content: 'Body' })];
        state.collections = [];
        state.categories = [];

        container.innerHTML = `
            <div id="promptGrid"></div>
            <span id="statsDisplay"></span>
            <span id="allCount"></span>
            <span id="favCount"></span>
            <div id="collectionsList"></div>
            <div id="categoriesList"></div>
            <div id="tagsList"></div>
            <h1 id="contentTitle"></h1>
            <div id="filterBar"></div>
            <select id="promptCollection"></select>
            <select id="promptCategory"></select>
        `;

        if (!document.getElementById('toast-container')) {
            const tc = document.createElement('div');
            tc.id = 'toast-container';
            document.body.appendChild(tc);
        }
    }

    function teardown() {
        stateManager.save = originalSave;
        stateManager.restorePrompt = originalRestorePrompt;
    }

    it('deletePrompt() registers exactly one undo entry in historyService', () => {
        resetTestEnvironment();
        const id = state.prompts[0].id;

        promptService.deletePrompt(id);

        expect(historyService._undoStack.length).toBe(1);
        teardown();
    });

    it('deletePrompt() undo entry restores the prompt (calls stateManager.restorePrompt once)', () => {
        resetTestEnvironment();
        const id = state.prompts[0].id;

        promptService.deletePrompt(id);
        historyService.undo();

        expect(restorePromptCallCount).toBe(1);
        teardown();
    });

    it('deletePrompt() does not expose a second restore path — undo only via historyService', () => {
        resetTestEnvironment();
        const id = state.prompts[0].id;

        promptService.deletePrompt(id);
        // No restore must have happened during the delete itself
        expect(restorePromptCallCount).toBe(0);

        historyService.undo();
        // Exactly one restore — triggered only by undo
        expect(restorePromptCallCount).toBe(1);
        teardown();
    });

});
