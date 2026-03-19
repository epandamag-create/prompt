import { describe, it, expect } from '../test-framework.js';
import { validateField, escapeHtml, extractVariables, generateId, sanitizeId, highlightMarkdown, formatDate } from '../../js/utils/helpers.js';

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

    // S4: ordered-list regex fix — "1. item" must match at column 0
    it('highlightMarkdown should highlight ordered list items at start of line', () => {
        const result = highlightMarkdown('1. ordered item');
        expect(result).toContain('<span class="md-list">1. </span>');
    });

    it('highlightMarkdown should highlight unordered list items', () => {
        const result = highlightMarkdown('* unordered item');
        expect(result).toContain('<span class="md-list">* </span>');
    });

    it('highlightMarkdown should NOT wrap an ordered item that starts with a space', () => {
        // " 1. item" is not a standard Markdown ordered list — should not match as md-list
        const result = highlightMarkdown(' 1. indented');
        expect(result).not.toContain('<span class="md-list">');
    });

    // S5: formatDate — single consolidated guard for recent/future timestamps
    it('formatDate should return "Just now" for timestamps less than 1 minute ago', () => {
        const recent = Date.now() - 30000; // 30 seconds ago
        expect(formatDate(recent)).toBe('Just now');
    });

    it('formatDate should return "Just now" for future timestamps', () => {
        const future = Date.now() + 5000;
        expect(formatDate(future)).toBe('Just now');
    });

    it('formatDate should return minutes for timestamps 1–59 minutes ago', () => {
        const twoMinutesAgo = Date.now() - 2 * 60000;
        expect(formatDate(twoMinutesAgo)).toBe('2m ago');
    });
});