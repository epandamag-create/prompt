import { state, stateManager } from '../state.js';
import { importExportService } from '../services/import-export-service.js';
import { getFilteredPrompts } from '../services/prompt-service.js';
import { openModal, closeModal } from '../view/modal.js';
import { showToast } from '../view/ui.js';
import { renderAll, updateCollectionDropdown, updateCategoryDropdown } from '../view/render.js';

export const ioController = {
    async importPrompts() {
        const fileInput = document.getElementById('importFile');
        const file = fileInput?.files[0];
        const importMode = document.querySelector('input[name="importMode"]:checked')?.value ?? 'merge';

        if (!file) {
            return showToast('Please select a file', 'error');
        }

        const fileName = file.name.toLowerCase();
        const isJson = fileName.endsWith('.json');
        const isCsv = fileName.endsWith('.csv');

        if (!isJson && !isCsv) {
            return showToast('Invalid file type. Please select a JSON or CSV file.', 'error');
        }

        // Fix #12: Show loading state
        const importBtn = document.getElementById('importConfirmBtn');
        const originalText = importBtn?.textContent;
        if (importBtn) {
            importBtn.disabled = true;
            importBtn.textContent = 'Importing…';
        }

        try {
            let importResult;
            if (isJson) {
                importResult = await importExportService.importFromFile(file, importMode);
            } else {
                importResult = await importExportService.importFromCsv(file, importMode);
            }

            if (!importResult.success) {
                showToast('Import failed: ' + importResult.error, 'error');
                return;
            }

            stateManager.commit();
            renderAll();
            updateCollectionDropdown();
            updateCategoryDropdown();
            closeModal('importModal');

        } catch (error) {
            showToast('Error importing file: ' + error.message, 'error');
            console.error('Import error:', error);
        } finally {
            if (importBtn) {
                importBtn.disabled = false;
                importBtn.textContent = originalText;
            }
        }
    },

    exportPrompts(format = 'json') {
        if (!state.prompts || state.prompts.length === 0) {
            showToast('There are no prompts to export.', 'error');
            return;
        }

        let promptsToExport;
        let exportLabel;
        
        // Get values from modal form if available, otherwise use defaults
        const formatRadio = document.querySelector('input[name="exportFormat"]:checked');
        const scopeRadio = document.querySelector('input[name="exportScope"]:checked');
        
        const selectedFormat = formatRadio ? formatRadio.value : format;
        const selectedScope = scopeRadio ? scopeRadio.value : 'all';
        
        if (selectedScope === 'filtered') {
            promptsToExport = getFilteredPrompts();
            exportLabel = 'filtered';
            
            if (promptsToExport.length === 0) {
                promptsToExport = state.prompts;
                exportLabel = 'all';
            }
        } else {
            promptsToExport = state.prompts;
            exportLabel = 'all';
        }

        const filename = 'prompts-' + exportLabel + '-' + new Date().toISOString().split('T')[0] + '.' + selectedFormat;

        if (selectedFormat === 'csv') {
            importExportService.exportToCsv(promptsToExport, filename);
        } else {
            importExportService.exportToFile(promptsToExport, filename);
        }
        
        closeModal('exportModal');
    },

    showExportModal(scope = 'all') {
        const formatJson = document.querySelector('input[name="exportFormat"][value="json"]');
        const scopeRadio = document.querySelector(`input[name="exportScope"][value="${scope}"]`);
        if (formatJson) formatJson.checked = true;
        if (scopeRadio) scopeRadio.checked = true;

        this._updateExportCount();
        document.querySelectorAll('input[name="exportScope"]').forEach(radio => {
            radio.onchange = () => this._updateExportCount();
        });

        openModal('exportModal');
    },

    _updateExportCount() {
        const scopeRadio = document.querySelector('input[name="exportScope"]:checked');
        const scope = scopeRadio ? scopeRadio.value : 'all';
        const count = scope === 'filtered' ? getFilteredPrompts().length : state.prompts.length;
        const countEl = document.getElementById('exportScopeCount');
        if (countEl) countEl.textContent = `${count} prompt${count !== 1 ? 's' : ''} will be exported`;
    },

    hideExportModal() {
        closeModal('exportModal');
    },

    showImportModal() {
        openModal('importModal');
    }
};