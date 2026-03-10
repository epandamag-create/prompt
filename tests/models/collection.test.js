import { describe, it, expect } from '../test-framework.js';
import { createCollectionModel } from '../../js/models/collection.js';

describe('Model: Collection', () => {
    it('createCollectionModel should create collection with defaults', () => {
        const data = { name: 'My Collection' };
        const collection = createCollectionModel(data);

        expect(collection.name).toBe('My Collection');
        expect(typeof collection.id).toBe('string');
        expect(typeof collection.color).toBe('string'); // Should have default color
        expect(collection.createdAt).toBeGreaterThan(0);
    });

    it('createCollectionModel should accept custom color', () => {
        const data = { name: 'Red', color: '#ff0000' };
        const collection = createCollectionModel(data);

        expect(collection.color).toBe('#ff0000');
    });
});