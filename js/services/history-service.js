const MAX_HISTORY = 50;

/**
 * History Service - Undo/Redo stack using the Command Pattern
 * Each entry stores a pair of { undo, redo } functions.
 */
export const historyService = {
    _undoStack: [],
    _redoStack: [],

    /**
     * Push a reversible action onto the history stack.
     * Clears the redo stack (new action breaks the redo chain).
     * @param {Function} undoFn - Function to call on undo
     * @param {Function} redoFn - Function to call on redo
     */
    push(undoFn, redoFn) {
        this._undoStack.push({ undo: undoFn, redo: redoFn });
        if (this._undoStack.length > MAX_HISTORY) this._undoStack.shift();
        this._redoStack = [];
    },

    /**
     * Undo the last action.
     */
    undo() {
        const entry = this._undoStack.pop();
        if (!entry) return;
        try {
            entry.undo();
        } catch (e) {
            console.error('[historyService] undo failed:', e);
            return;
        }
        this._redoStack.push(entry);
    },

    /**
     * Redo the last undone action.
     */
    redo() {
        const entry = this._redoStack.pop();
        if (!entry) return;
        try {
            entry.redo();
        } catch (e) {
            console.error('[historyService] redo failed:', e);
            return;
        }
        this._undoStack.push(entry);
    },

    canUndo() { return this._undoStack.length > 0; },
    canRedo() { return this._redoStack.length > 0; }
};
