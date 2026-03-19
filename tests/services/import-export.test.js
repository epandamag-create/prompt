import { describe, it, expect } from '../test-framework.js';
import { importExportService } from '../../js/services/import-export-service.js';
import { state, stateManager } from '../../js/state.js';
import { IMPORT_EXPORT_LIMITS } from '../../js/config/constants.js';

describe('Service: ImportExportService', () => {

    // Full DOM fixture — renderAll (called by real stateManager.commit) needs these
    const container = document.createElement('div');
    document.body.appendChild(container);

    let bumpVersionCalled = false;
    let saveCalled = false;

    const originalBumpVersion = stateManager.bumpVersion;
    const originalSave = stateManager.save;

    function resetTestEnvironment() {
        bumpVersionCalled = false;
        saveCalled = false;

        // Wrap bumpVersion: track the call AND still run the real logic so
        // stateVersion increments (needed by renderAll's cache key).
        stateManager.bumpVersion = () => {
            bumpVersionCalled = true;
            originalBumpVersion.call(stateManager);
        };

        // Wrap save: track the call AND suppress the real IndexedDB write.
        // stateManager.commit (NOT mocked here) calls clearPromptCache + save + renderAll.
        // Keeping commit as-is means io-controller tests can set their own commit mock
        // without us clobbering it — this was the root cause of the previous test failure.
        stateManager.save = () => { saveCalled = true; };

        state.prompts = [];
        state.collections = [];
        state.categories = [];

        // Full DOM for renderAll (renderPrompts, renderCollections, renderCategories,
        // renderTags, renderFilterBar, updateStats, updateContentTitle)
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
    }

    function teardown() {
        stateManager.bumpVersion = originalBumpVersion;
        stateManager.save = originalSave;
    }

    // ── BLOCKER-4a: size check must occur BEFORE any state mutation ───────────

    it('importFromFile() returns error AND leaves state.collections empty when prompt limit exceeded', async () => {
        resetTestEnvironment();

        const oversizedData = {
            // One collection that WOULD be upserted if the check ran after the upsert
            collections: [{ id: 'c1', name: 'Should Not Appear', color: '#3b82f6' }],
            categories: [],
            prompts: Array.from(
                { length: IMPORT_EXPORT_LIMITS.MAX_PROMPTS_PER_IMPORT + 1 },
                (_, i) => ({ title: `Prompt ${i}`, content: 'x' })
            )
        };

        const file = new File([JSON.stringify(oversizedData)], 'big.json', { type: 'application/json' });
        const result = await importExportService.importFromFile(file, 'merge');

        expect(result.success).toBe(false);
        expect(state.collections.length).toBe(0); // state NOT mutated before the check
        teardown();
    });

    // ── BLOCKER-4b: stateManager.bumpVersion must be called after import ──────
    // We verify bumpVersion directly (its call increments stateVersion).
    // We verify commit indirectly via saveCalled (commit → save).

    it('importFromFile() calls bumpVersion and save after a successful JSON import', async () => {
        resetTestEnvironment();

        const data = { prompts: [{ title: 'Hello', content: 'World' }] };
        const file = new File([JSON.stringify(data)], 'ok.json', { type: 'application/json' });
        await importExportService.importFromFile(file, 'merge');

        expect(bumpVersionCalled).toBe(true);
        expect(saveCalled).toBe(true);
        teardown();
    });

    it('importFromFile() adds prompts to state on successful merge', async () => {
        resetTestEnvironment();

        const data = {
            prompts: [
                { title: 'First',  content: 'Content A' },
                { title: 'Second', content: 'Content B' }
            ]
        };
        const file = new File([JSON.stringify(data)], 'two.json', { type: 'application/json' });
        const result = await importExportService.importFromFile(file, 'merge');

        expect(result.success).toBe(true);
        expect(result.imported).toBe(2);
        expect(state.prompts.length).toBe(2);
        teardown();
    });

    it('importFromFile() skips exact duplicates in merge mode', async () => {
        resetTestEnvironment();
        state.prompts = [{ id: 'e1', title: 'Dupe', content: 'Same' }];

        const data = { prompts: [{ title: 'Dupe', content: 'Same' }] };
        const file = new File([JSON.stringify(data)], 'dupe.json', { type: 'application/json' });
        const result = await importExportService.importFromFile(file, 'merge');

        expect(result.success).toBe(true);
        expect(result.imported).toBe(0);
        expect(result.skipped).toBe(1);
        teardown();
    });

    // ── BLOCKER-4b (CSV): bumpVersion + save ─────────────────────────────────

    it('importFromCsv() calls bumpVersion and save after a successful CSV import', async () => {
        resetTestEnvironment();

        const csv = 'Title,Content\nMy Prompt,Hello world';
        const file = new File([csv], 'ok.csv', { type: 'text/csv' });
        await importExportService.importFromCsv(file, 'merge');

        expect(bumpVersionCalled).toBe(true);
        expect(saveCalled).toBe(true);
        teardown();
    });

    // ── BLOCKER-4c: CSV replace mode must be atomic ───────────────────────────

    it('importFromCsv() replace mode swaps state atomically — old data gone, new data present', async () => {
        resetTestEnvironment();
        state.prompts = [{ id: 'old', title: 'Old Prompt', content: 'Old' }];

        const csv = 'Title,Content\nNew Prompt,New content';
        const file = new File([csv], 'replace.csv', { type: 'text/csv' });
        await importExportService.importFromCsv(file, 'replace');

        expect(state.prompts.length).toBe(1);
        expect(state.prompts[0].title).toBe('New Prompt');
        teardown();
    });

    it('importFromCsv() replace mode creates collections from CSV data', async () => {
        resetTestEnvironment();

        const csv = 'Title,Content,Collection\nPrompt A,Content A,My Collection';
        const file = new File([csv], 'col.csv', { type: 'text/csv' });
        await importExportService.importFromCsv(file, 'replace');

        expect(state.collections.length).toBe(1);
        expect(state.collections[0].name).toBe('My Collection');
        teardown();
    });

    it('importFromCsv() merge mode skips exact duplicates', async () => {
        resetTestEnvironment();
        state.prompts = [{ id: 'e1', title: 'Existing', content: 'Same content' }];

        const csv = 'Title,Content\nExisting,Same content\nNew One,Different';
        const file = new File([csv], 'merge.csv', { type: 'text/csv' });
        const result = await importExportService.importFromCsv(file, 'merge');

        expect(result.success).toBe(true);
        expect(result.imported).toBe(1);
        expect(result.skipped).toBe(1);
        teardown();
    });

    it('importFromCsv() returns error for CSV missing required Title header', async () => {
        resetTestEnvironment();

        const csv = 'Name,Content\nMy Prompt,Hello';
        const file = new File([csv], 'bad.csv', { type: 'text/csv' });
        const result = await importExportService.importFromCsv(file, 'merge');

        expect(result.success).toBe(false);
        teardown();
    });
});
