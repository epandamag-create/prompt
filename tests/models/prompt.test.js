import { describe, it, expect } from '../test-framework.js';
import { createPromptModel, duplicatePromptModel, buildSearchIndex } from '../../js/models/prompt.js';

describe('Model: Prompt', () => {
    it('createPromptModel should create a prompt with defaults', () => {
        const data = { 
            title: 'Test Prompt', 
            content: 'Some content with {variable}' 
        };
        const prompt = createPromptModel(data);
        
        expect(prompt.title).toBe('Test Prompt');
        expect(prompt.content).toBe('Some content with {variable}');
        expect(prompt.favorite).toBe(false);
        expect(Array.isArray(prompt.tags)).toBe(true);
        expect(prompt.variables).toEqual(['variable']);
        expect(typeof prompt.id).toBe('string');
    });

    it('duplicatePromptModel should create a copy with new ID', () => {
        const original = createPromptModel({ title: 'Original', content: 'Content' });
        const copy = duplicatePromptModel(original);

        expect(copy.id === original.id).toBe(false);
        expect(copy.title).toBe('Original [Copy]');
        expect(copy.content).toBe('Content');
    });

    it('buildSearchIndex should combine fields', () => {
        const prompt = {
            title: 'Title',
            description: 'Desc',
            content: 'Content',
            tags: ['tag1', 'tag2']
        };
        const index = buildSearchIndex(prompt);
        expect(index).toContain('title');
        expect(index).toContain('desc');
        expect(index).toContain('tag1');
    });
});