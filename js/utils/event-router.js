/**
 * EventRouter - A centralized event routing system using delegation pattern
 * Replaces multiple inline event listeners with a single delegated listener
 * Uses Map-based handler registration for O(1) lookup performance
 */
class EventRouter {
    constructor() {
        this.handlers = new Map();
        // Bind the handler once to avoid creating new functions on each call
        this.boundHandler = this.handleEvent.bind(this);
    }

    /**
     * Register an action handler
     * @param {string} action - The action name (matches data-action attribute)
     * @param {Function} handler - Handler function receiving (element, event, data)
     */
    register(action, handler) {
        this.handlers.set(action, handler);
    }

    /**
     * Unregister an action handler
     * @param {string} action - The action name to remove
     */
    unregister(action) {
        this.handlers.delete(action);
    }

    /**
     * Handle click events using delegation
     * @param {Event} e - Click event
     */
    handleEvent(e) {
        // Only process clicks on elements with data-action attribute
        if (!e.target) return;
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;
        const handler = this.handlers.get(action);

        if (handler) {
            // Extract common data from the target element
            const data = {
                id: target.dataset.id,
                view: target.dataset.view,
                section: target.dataset.section,
                tag: target.dataset.tag,
                mode: target.dataset.mode,
                density: target.dataset.density,
                sort: target.dataset.sort,
                formId: target.dataset.formId
            };

            try {
                handler(target, e, data);
            } catch (error) {
                console.error(`Error in event handler for action "${action}":`, error);
            }
        }
    }

    /**
     * Start listening to events on a target element
     * @param {string|Element} target - CSS selector or DOM element
     * @param {string} eventType - Event type (default: 'click')
     */
    listen(target = document.body, eventType = 'click') {
        const element = typeof target === 'string' ? document.querySelector(target) : target;
        if (element) {
            element.addEventListener(eventType, this.boundHandler);
        }
    }

    /**
     * Stop listening to events
     * @param {string|Element} target - CSS selector or DOM element
     * @param {string} eventType - Event type (default: 'click')
     */
    stopListening(target = document.body, eventType = 'click') {
        const element = typeof target === 'string' ? document.querySelector(target) : target;
        if (element) {
            element.removeEventListener(eventType, this.boundHandler);
        }
    }

    /**
     * Get all registered actions
     * @returns {string[]} Array of registered action names
     */
    getRegisteredActions() {
        return Array.from(this.handlers.keys());
    }
}

// Export singleton instance
export const eventRouter = new EventRouter();
export { EventRouter };
