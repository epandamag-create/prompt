import { describe, it, expect } from '../test-framework.js';
import { validateAndSanitizeData } from '../../js/services/validation.js';
import { VALIDATION_RULES } from '../../js/config/constants.js';

describe('Service: Validation', () => {
    
    it('validateAndSanitizeData should validate valid data correctly', () => {
        const inputData = {
            collections: [
                { id: 'col1', name: 'My Collection', color: '#ff0000' }
            ],
            categories: [
                { id: 'cat1', name: 'My Category', color: '#00ff00' }
            ],
            prompts: [
                { 
                    id: 'p1', 
                    title: 'My Prompt', 
                    content: 'Content', 
                    collectionId: 'col1', 
                    categoryId: 'cat1',
                    tags: ['tag1']
                }
            ]
        };

        const result = validateAndSanitizeData(inputData);

        expect(result.errors.length).toBe(0);
        expect(result.stats.collections).toBe(1);
        expect(result.stats.categories).toBe(1);
        expect(result.stats.prompts).toBe(1);
        
        const prompt = result.validatedData.prompts[0];
        expect(prompt.title).toBe('My Prompt');
        expect(prompt.collectionId).toBe('col1');
        expect(prompt.categoryId).toBe('cat1');
    });

    it('validateAndSanitizeData should sanitize invalid IDs', () => {
        const inputData = {
            collections: [
                { id: 'Invalid ID!', name: 'Collection' }
            ],
            prompts: [
                { id: 'p1', title: 'Prompt', content: 'Content', collectionId: 'Invalid ID!' }
            ]
        };

        const result = validateAndSanitizeData(inputData);

        expect(result.errors.length).toBeGreaterThan(0); // Should warn about invalid ID format
        
        const collection = result.validatedData.collections[0];
        const prompt = result.validatedData.prompts[0];
        
        // ID should be sanitized (spaces and special chars removed)
        expect(collection.id).toBe('InvalidID');
        // Foreign key in prompt should be updated to match sanitized ID
        expect(prompt.collectionId).toBe('InvalidID');
    });

    it('validateAndSanitizeData should reject invalid items', () => {
        const inputData = {
            prompts: [
                { title: 'Valid', content: 'Content' }, // Valid
                { title: '', content: 'Content' },      // Invalid: empty title
                { title: 'No Content' },                // Invalid: missing content
                null                                    // Invalid: null
            ]
        };

        const result = validateAndSanitizeData(inputData);

        expect(result.stats.prompts).toBe(1);
        expect(result.validatedData.prompts[0].title).toBe('Valid');
        expect(result.errors.length).toBeGreaterThan(0);
    });

    it('validateAndSanitizeData should truncate long fields', () => {
        const longTitle = 'a'.repeat(VALIDATION_RULES.prompt.title.maxLength + 10);
        const inputData = {
            prompts: [
                { title: longTitle, content: 'Content' }
            ]
        };

        const result = validateAndSanitizeData(inputData);

        expect(result.validatedData.prompts[0].title.length).toBe(VALIDATION_RULES.prompt.title.maxLength);
    });

    it('validateAndSanitizeData should use default colors for invalid hex codes', () => {
        const inputData = {
            collections: [
                { name: 'Bad Color', color: 'red' } // Invalid hex
            ]
        };

        const result = validateAndSanitizeData(inputData);

        expect(result.validatedData.collections[0].color).not.toBe('red');
        expect(result.validatedData.collections[0].color.startsWith('#')).toBe(true);
    });
});