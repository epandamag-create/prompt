import { describe, it, expect } from '../test-framework.js';
import { validateField, escapeHtml, extractVariables, generateId, sanitizeId } from '../../js/utils/helpers.js';

describe('Utils: Helpers', () => {
    it('escapeHtml should escape special characters', () => {
        const input = '<script>alert("xss")</script>';
        const expected = '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;';
        expect(escapeHtml(input)).toBe(expected);
    });

    it('extractVariables should find variables in braces', () => {
        const content = 'Hello {name}, welcome to {place}!';
        const vars = extractVariables(content);
        expect(vars).toEqual(['name', 'place']);
    });

    it('extractVariables should handle duplicates', () => {
        const content = '{test} and {test} again';
        const vars = extractVariables(content);
        expect(vars).toEqual(['test']);
    });

    it('validateField should validate string length', () => {
        const rules = { minLength: 5 };
        expect(validateField('abc', rules).valid).toBe(false);
        expect(validateField('abcdef', rules).valid).toBe(true);
    });

    it('generateId should return a string', () => {
        const id = generateId();
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(5);
    });

    it('sanitizeId should remove invalid characters', () => {
        expect(sanitizeId('Valid-ID_123')).toBe('Valid-ID_123');
        expect(sanitizeId('Invalid@ID!')).toBe('InvalidID');
    });
});