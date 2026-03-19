import { describe, it, expect } from '../test-framework.js';
import { historyService } from '../../js/services/history-service.js';

describe('Service: HistoryService', () => {

    function resetHistory() {
        historyService._undoStack = [];
        historyService._redoStack = [];
    }

    // ── Normal flow ──────────────────────────────────────────────────────────

    it('undo() moves entry from _undoStack to _redoStack on success', () => {
        resetHistory();
        historyService.push(() => {}, () => {});
        historyService.undo();
        expect(historyService._undoStack.length).toBe(0);
        expect(historyService._redoStack.length).toBe(1);
    });

    it('redo() moves entry from _redoStack to _undoStack on success', () => {
        resetHistory();
        historyService.push(() => {}, () => {});
        historyService.undo();
        historyService.redo();
        expect(historyService._undoStack.length).toBe(1);
        expect(historyService._redoStack.length).toBe(0);
    });

    it('undo() calls the registered undo function', () => {
        resetHistory();
        let called = false;
        historyService.push(() => { called = true; }, () => {});
        historyService.undo();
        expect(called).toBe(true);
    });

    it('redo() calls the registered redo function', () => {
        resetHistory();
        let called = false;
        historyService.push(() => {}, () => { called = true; });
        historyService.undo();
        historyService.redo();
        expect(called).toBe(true);
    });

    it('push() clears _redoStack so a new action breaks the redo chain', () => {
        resetHistory();
        historyService.push(() => {}, () => {});
        historyService.undo();
        expect(historyService._redoStack.length).toBe(1);
        historyService.push(() => {}, () => {}); // new action
        expect(historyService._redoStack.length).toBe(0);
    });

    it('canUndo() returns false on empty _undoStack', () => {
        resetHistory();
        expect(historyService.canUndo()).toBe(false);
    });

    it('canRedo() returns false on empty _redoStack', () => {
        resetHistory();
        expect(historyService.canRedo()).toBe(false);
    });

    it('canUndo() returns true after push', () => {
        resetHistory();
        historyService.push(() => {}, () => {});
        expect(historyService.canUndo()).toBe(true);
    });

    // ── BLOCKER-6: entry must not be silently lost on exception ──────────────

    it('undo() keeps entry in _undoStack when undo fn throws (no silent loss)', () => {
        resetHistory();
        historyService.push(
            () => { throw new Error('undo boom'); },
            () => {}
        );
        historyService.undo(); // must not propagate the error
        expect(historyService._undoStack.length).toBe(1); // entry restored
        expect(historyService._redoStack.length).toBe(0); // NOT moved to redo
    });

    it('redo() keeps entry in _redoStack when redo fn throws (no silent loss)', () => {
        resetHistory();
        historyService.push(
            () => {},
            () => { throw new Error('redo boom'); }
        );
        historyService.undo(); // move to _redoStack
        historyService.redo(); // redo fn throws
        expect(historyService._redoStack.length).toBe(1); // entry restored
        expect(historyService._undoStack.length).toBe(0); // NOT moved back to undo
    });

    it('undo() after failure is retryable — entry stays available', () => {
        resetHistory();
        let shouldFail = true;
        let undoCalled = 0;
        historyService.push(
            () => { undoCalled++; if (shouldFail) throw new Error('fail'); },
            () => {}
        );
        historyService.undo(); // fails — entry stays
        expect(undoCalled).toBe(1);
        shouldFail = false;
        historyService.undo(); // succeeds on retry
        expect(undoCalled).toBe(2);
        expect(historyService._undoStack.length).toBe(0);
        expect(historyService._redoStack.length).toBe(1);
    });
});
