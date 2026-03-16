import { state, stateManager } from '../state.js';
import { storageService } from './storage-service.js';
import { createPromptModel } from '../models/prompt.js';
import { createCollectionModel } from '../models/collection.js';
import { createCategoryModel } from '../models/category.js';
import { validateAndSanitizeData } from './validation.js';
import { showToast } from '../view/ui.js';
import { renderAll, updateCollectionDropdown, updateCategoryDropdown } from '../view/render.js';
import { clearPromptCache } from './prompt-service.js';
import { safeJsonParse } from '../utils/helpers.js';
import { IMPORT_EXPORT_LIMITS } from '../config/constants.js';

/**
 * Create a download from a Blob
 * @param {Blob} blob
 * @param {string} filename
 */
function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export const importExportService = {
    /**
     * Export prompts to JSON file
     * @param {Array} prompts - Prompts to export (filtered or all)
     * @param {string} filename - Output filename
     */
    exportToFile(prompts, filename = 'prompts-export.json') {
        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            prompts: prompts.map(p => ({
                title: p.title,
                description: p.description,
                content: p.content,
                tags: p.tags || [],
                collectionId: p.collectionId,
                categoryId: p.categoryId,
                favorite: p.favorite || false
            }))
        };

        triggerDownload(new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' }), filename);
        showToast(`Exported ${prompts.length} prompts`, 'success');
    },

    /**
     * Import prompts from file
     * @param {File} file - JSON file to import
     * @param {string} mode - 'merge' or 'replace'
     * @returns {Promise<Object>} Import result
     */
    async importFromFile(file, mode = 'merge') {
        try {
            const text = await file.text();
            const data = safeJsonParse(text);
            
            // Use the comprehensive validation and sanitization from validation.js
            const { validatedData, stats, errors } = validateAndSanitizeData(data);

            if (errors.length > 0) {
                showToast(`Import completed with ${errors.length} errors. Check console for details.`, 'warning');
                console.warn('Import validation errors:', errors);
            }
            
            let importedCount = 0;
            let skippedCount = 0;
            const skippedTitles = [];

            // Upsert collections and build old-id → new-id map in one pass
            const collectionIdMap = new Map();
            (validatedData.collections || []).forEach(col => {
                let item = state.collections.find(c => c.name === col.name);
                if (!item) {
                    item = createCollectionModel({ name: col.name, color: col.color });
                    state.collections.push(item);
                }
                collectionIdMap.set(col.id, item.id);
            });

            // Upsert categories and build old-id → new-id map in one pass
            const categoryIdMap = new Map();
            (validatedData.categories || []).forEach(cat => {
                let item = state.categories.find(c => c.name === cat.name);
                if (!item) {
                    item = createCategoryModel({ name: cat.name, color: cat.color });
                    state.categories.push(item);
                }
                categoryIdMap.set(cat.id, item.id);
            });

            // Handle prompts
            if (validatedData.prompts && validatedData.prompts.length > 0) {
                // Validate import size limit
                if (validatedData.prompts.length > IMPORT_EXPORT_LIMITS.MAX_PROMPTS_PER_IMPORT) {
                    return { success: false, error: `Import exceeds limit of ${IMPORT_EXPORT_LIMITS.MAX_PROMPTS_PER_IMPORT} prompts. Please split your file.` };
                }
                validatedData.prompts.forEach(p => {
                    if (mode === 'merge') {
                        // Check for duplicates by title
                        const exists = state.prompts.find(
                            existing => existing.title === p.title && existing.content === p.content
                        );
                        
                        if (exists) {
                            skippedCount++;
                            skippedTitles.push(p.title);
                            return;
                        }
                    }

                    const newPrompt = createPromptModel({
                        title: p.title, // Already sanitized by validateAndSanitizeData
                        description: p.description,
                        content: p.content,
                        tags: p.tags,
                        collectionId: p.collectionId ? (collectionIdMap.get(p.collectionId) ?? null) : null,
                        categoryId: p.categoryId ? (categoryIdMap.get(p.categoryId) ?? null) : null
                    });
                    
                    if (p.favorite) {
                        newPrompt.favorite = true;
                    }
                    
                    state.prompts.unshift(newPrompt);
                    importedCount++;
                });
            }

            clearPromptCache();
            stateManager.save();
            renderAll();
            updateCollectionDropdown();
            updateCategoryDropdown();

            const message = mode === 'merge'
                ? `Imported ${importedCount} prompts, ${skippedCount} skipped`
                : `Replaced with ${importedCount} prompts`;

            showToast(message, 'success');
            if (skippedTitles.length > 0) {
                console.info(`Skipped ${skippedTitles.length} duplicate prompt(s):`, skippedTitles);
            }

            return {
                success: true,
                imported: importedCount,
                skipped: skippedCount,
                skippedTitles
            };

        } catch (error) {
            console.error('Import error:', error);
            showToast('Failed to import: ' + error.message, 'error');
            return { success: false, error: error.message };
        }
    },

    /**
     * Import prompts from CSV file
     * @param {File} file - CSV file to import
     * @param {string} mode - 'merge' or 'replace'
     * @returns {Promise<Object>} Import result
     */
    async importFromCsv(file, mode = 'merge') {
        try {
            const text = await file.text();
            const promptsData = this._parseCSV(text);

            if (!promptsData || promptsData.length === 0) {
                return { success: false, error: 'CSV file is empty or invalid.' };
            }

            // Validate import size limit
            if (promptsData.length > IMPORT_EXPORT_LIMITS.MAX_PROMPTS_PER_IMPORT) {
                return { success: false, error: `Import exceeds limit of ${IMPORT_EXPORT_LIMITS.MAX_PROMPTS_PER_IMPORT} prompts. Please split your file.` };
            }

            const requiredHeaders = ['Title', 'Content'];
            const header = Object.keys(promptsData[0]);
            for(const requiredHeader of requiredHeaders) {
                if(!header.includes(requiredHeader)) {
                    return { success: false, error: `CSV missing required header: ${requiredHeader}` };
                }
            }
            
            if (mode === 'replace') {
                state.prompts = [];
                state.collections = [];
                state.categories = [];
            }

            let importedCount = 0;
            let skippedCount = 0;
            const skippedTitlesCsv = [];

            const getOrCreateId = (name, type, items, createModel) => {
                if (!name) return null;
                let item = items.find(i => i.name.toLowerCase() === name.toLowerCase());
                if (!item) {
                    item = createModel({ name });
                    items.push(item);
                }
                return item.id;
            };

            promptsData.forEach(p => {
                if (mode === 'merge') {
                    const exists = state.prompts.find(
                        existing => existing.title === p.Title && existing.content === p.Content
                    );
                    if (exists) {
                        skippedCount++;
                        skippedTitlesCsv.push(p.Title);
                        return;
                    }
                }

                const collectionId = getOrCreateId(p.Collection, 'collection', state.collections, createCollectionModel);
                const categoryId = getOrCreateId(p.Category, 'category', state.categories, createCategoryModel);

                const newPrompt = createPromptModel({
                    title: p.Title,
                    description: p.Description || '',
                    content: p.Content,
                    tags: p.Tags ? p.Tags.split(',').map(t => t.trim()) : [],
                    collectionId,
                    categoryId,
                    favorite: (p.Favorite || 'false').toLowerCase() === 'true'
                });
                
                state.prompts.unshift(newPrompt);
                importedCount++;
            });
            
            clearPromptCache();
            stateManager.save();
            renderAll();
            updateCollectionDropdown();
            updateCategoryDropdown();
            
            const message = mode === 'merge' 
                ? `Imported ${importedCount} prompts, ${skippedCount} skipped from CSV`
                : `Replaced with ${importedCount} prompts from CSV`;
            
            showToast(message, 'success');
            if (skippedTitlesCsv.length > 0) {
                console.info(`Skipped ${skippedTitlesCsv.length} duplicate prompt(s) from CSV:`, skippedTitlesCsv);
            }

            return { success: true, imported: importedCount, skipped: skippedCount, skippedTitles: skippedTitlesCsv };
        } catch (error) {
            console.error('CSV Import error:', error);
            showToast('Failed to import from CSV: ' + error.message, 'error');
            return { success: false, error: error.message };
        }
    },

    _parseCSV(text) {
        const result = [];
        const lines = text.split(/\r\n|\n/);
        if (lines.length === 0) return result;
        
        const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            const obj = {};
            const regex = /(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^",]*))/g;
            let match;
            let j = 0;
            while ((match = regex.exec(lines[i])) && j < header.length) {
                let value = match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2];
                obj[header[j]] = value;
                j++;
            }
            result.push(obj);
        }
        return result;
    },
    
    /**
     * Converts an array of prompt objects to a CSV string.
     * @param {Array} prompts - The prompts to convert.
     * @returns {string} The CSV formatted string.
     * @private
     */
    _convertToCSV(prompts) {
        const header = ["Title", "Description", "Content", "Tags", "Collection", "Category", "Favorite"];
        
        const categoryNameMap = new Map(state.categories.map(c => [c.id, c.name]));
        const collectionNameMap = new Map(state.collections.map(c => [c.id, c.name]));

        const csvRows = prompts.map(p => {
            const row = [
                p.title,
                p.description,
                p.content,
                (p.tags || []).join(','),
                collectionNameMap.get(p.collectionId) || '',
                categoryNameMap.get(p.categoryId) || '',
                p.favorite ? 'true' : 'false'
            ];
            return row.map(value => {
                const strValue = String(value || '');
                if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
                    return `"${strValue.replace(/"/g, '""')}"`;
                }
                return strValue;
            }).join(',');
        });

        return [header.join(','), ...csvRows].join('\r\n');
    },

    /**
     * Export prompts to CSV file
     * @param {Array} prompts - Prompts to export (filtered or all)
     * @param {string} filename - Output filename
     */
    exportToCsv(prompts, filename = 'prompts-export.csv') {
        const csvContent = this._convertToCSV(prompts);
        triggerDownload(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }), filename);
        showToast(`Exported ${prompts.length} prompts to CSV`, 'success');
    },

    /**
     * Export all data for backup
     */
    exportAll() {
        const backup = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            prompts: state.prompts,
            collections: state.collections,
            categories: state.categories,
            preferences: state.preferences,
            sidebarSections: state.sidebarSections
        };

        triggerDownload(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }), `prompts-backup-${new Date().toISOString().split('T')[0]}.json`);
        showToast('Backup created', 'success');
    }
};
