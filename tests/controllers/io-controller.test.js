import { describe, it, expect } from '../test-framework.js';
import { ioController } from '../../js/controllers/io-controller.js';
import { importExportService } from '../../js/services/import-export-service.js';
import { state, stateManager } from '../../js/state.js';
import * as promptService from '../../js/services/prompt-service.js';
import { createPromptModel } from '../../js/models/prompt.js';

describe('Controller: IOController', () => {
    
    // Setup DOM container
    const container = document.createElement('div');
    container.id = 'test-io-container';
    document.body.appendChild(container);

    // Mock tracking variables
    let mockImportFromFileCalledWith = null;
    let mockImportFromCsvCalledWith = null;
    let mockExportToFileCalledWith = null;
    let mockExportToCsvCalledWith = null;

    // Save original methods
    const originalImportFromFile = importExportService.importFromFile;
    const originalImportFromCsv = importExportService.importFromCsv;
    const originalExportToFile = importExportService.exportToFile;
    const originalExportToCsv = importExportService.exportToCsv;
    const originalCommit = stateManager.commit;
    const originalSave = stateManager.save;

    function teardown() {
        importExportService.importFromFile = originalImportFromFile;
        importExportService.importFromCsv = originalImportFromCsv;
        importExportService.exportToFile = originalExportToFile;
        importExportService.exportToCsv = originalExportToCsv;
        stateManager.commit = originalCommit;
        stateManager.save = originalSave;
    }

    function resetTestEnvironment() {
        // 1. Reset DOM
        container.innerHTML = `
            <input type="file" id="importFile">
            <input type="radio" name="importMode" value="merge" checked>
            <input type="radio" name="exportFormat" value="json" checked>
            <input type="radio" name="exportScope" value="all" checked>
            
            <!-- Modals needed for real openModal calls -->
            <div id="importModal" class="modal-overlay"></div>
            <div id="exportModal" class="modal-overlay"></div>

            <!-- Stats elements needed for renderAll -->
            <span id="statsDisplay"></span>
            <span id="allCount"></span>
            <span id="favCount"></span>
            
            <!-- Lists needed for renderAll -->
            <div id="collectionsList"></div>
            <div id="categoriesList"></div>
            <div id="tagsList"></div>
            
            <!-- Dropdowns needed for updateDropdowns -->
            <select id="promptCollection"></select>
            <select id="promptCategory"></select>
            
            <!-- Grid -->
            <div id="promptGrid"></div>
            
            <!-- Title and Filter Bar -->
            <h1 id="contentTitle"></h1>
            <div id="filterBar"></div>
        `;

        // 2. Reset Mocks
        mockImportFromFileCalledWith = null;
        mockImportFromCsvCalledWith = null;
        mockExportToFileCalledWith = null;
        mockExportToCsvCalledWith = null;

        // 3. Setup Mocks
        importExportService.importFromFile = async (file, mode) => {
            mockImportFromFileCalledWith = { file, mode };
            return { success: true, imported: 1, skipped: 0 };
        };
        importExportService.importFromCsv = async (file, mode) => {
            mockImportFromCsvCalledWith = { file, mode };
            return { success: true };
        };
        importExportService.exportToFile = (prompts, filename) => {
            mockExportToFileCalledWith = { prompts, filename };
        };
        importExportService.exportToCsv = (prompts, filename) => {
            mockExportToCsvCalledWith = { prompts, filename };
        };
        
        stateManager.commit = () => { stateManager.save(); };
        stateManager.save = () => { /* Do nothing, we'll check side effects */ };
        
        // 4. Reset State
        state.prompts = [createPromptModel({ title: 'Initial Prompt', content: 'Content' })];
        state.ui.activeToasts = [];
        state.ui.openModals = new Set();
        // Ensure toast container exists for real showToast
        if (!document.getElementById('toast-container')) {
            const toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            document.body.appendChild(toastContainer);
        }
    }

    it('importPrompts should call importFromFile for JSON files', async () => {
        resetTestEnvironment();
        const fileInput = document.getElementById('importFile');
        // We can use a dummy file now since we mock the service
        const jsonFile = new File(['{}'], 'test.json', { type: 'application/json' });
        
        Object.defineProperty(fileInput, 'files', { value: [jsonFile], writable: false });

        let saveCalled = false;
        stateManager.save = () => { saveCalled = true; };
        await ioController.importPrompts();

        expect(mockImportFromFileCalledWith).toBeTruthy();
        expect(saveCalled).toBe(true);
        teardown();
    });

    it('importPrompts should show error for invalid file type', async () => {
        resetTestEnvironment();
        const fileInput = document.getElementById('importFile');
        const txtFile = new File(['text'], 'test.txt', { type: 'text/plain' });
        Object.defineProperty(fileInput, 'files', { value: [txtFile], writable: false });

        let saveCalled = false;
        stateManager.save = () => { saveCalled = true; };
        await ioController.importPrompts();

        // With an invalid file, the controller should call showToast and return early.
        // It should NOT call stateManager.save().
        expect(saveCalled).toBe(false);
        const toast = document.querySelector('.toast.error');
        expect(toast).toBeTruthy();
        teardown();
    });

    it('exportPrompts should call exportToFile for JSON format', async () => {
        resetTestEnvironment();
        ioController.exportPrompts();
        expect(mockExportToFileCalledWith).toBeTruthy();
        expect(mockExportToFileCalledWith.prompts.length).toBe(1);
        expect(mockExportToFileCalledWith.filename).toContain('.json');
        teardown();
    });

    it('showImportModal should call openModal', async () => {
        resetTestEnvironment();
        ioController.showImportModal();
        expect(state.ui.openModals.has('importModal')).toBe(true);
        teardown();
    });

    it('showExportModal should call openModal', async () => {
        resetTestEnvironment();
        ioController.showExportModal();
        expect(state.ui.openModals.has('exportModal')).toBe(true);
        teardown();
    });

});