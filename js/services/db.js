import Dexie from '../vendor/dexie.mjs';

/**
 * Dexie (IndexedDB) database instance for the app.
 * Uses a simple key-value store to mirror the previous localStorage API.
 * IndexedDB limit: hundreds of MB vs localStorage's ~5 MB.
 */
export const db = new Dexie('PromptOrganizer');

db.version(1).stores({
    keyval: 'key'
});
