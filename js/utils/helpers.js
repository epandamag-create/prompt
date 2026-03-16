/**
 * Validates a field value against provided validation rules.
 * @param {any} value - The value to validate
 * @param {object} rules - Validation rules (minLength, maxLength, pattern, maxItems, maxItemLength)
 * @param {string} fieldName - Name of the field for error messages
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateField(value, rules, fieldName = 'Field') {
    // Handle string validation
    if (typeof value === 'string') {
        if (rules.minLength && value.length < rules.minLength) {
            return { 
                valid: false, 
                error: `${fieldName} must be at least ${rules.minLength} character${rules.minLength > 1 ? 's' : ''}.` 
            };
        }
        if (rules.maxLength && value.length > rules.maxLength) {
            return { 
                valid: false, 
                error: `${fieldName} must be at most ${rules.maxLength} characters.` 
            };
        }
        if (rules.pattern && !rules.pattern.test(value)) {
            return { 
                valid: false, 
                error: rules.message || `${fieldName} has invalid format.` 
            };
        }
    }
    
    // Handle array validation (for tags)
    if (Array.isArray(value)) {
        if (rules.maxItems && value.length > rules.maxItems) {
            return { 
                valid: false, 
                error: `${fieldName} can have at most ${rules.maxItems} items.` 
            };
        }
        if (rules.maxItemLength) {
            for (let i = 0; i < value.length; i++) {
                if (typeof value[i] === 'string' && value[i].length > rules.maxItemLength) {
                    return { 
                        valid: false, 
                        error: `${fieldName} item #${i + 1} exceeds maximum length of ${rules.maxItemLength} characters.` 
                    };
                }
            }
        }
    }
    
    return { valid: true };
}

/**
 * Validates that an ID string matches the expected pattern.
 * @param {string} id - The ID to validate
 * @returns {boolean} - True if valid ID format
 */
export function isValidId(id) {
    if (typeof id !== 'string') return false;
    return /^[a-zA-Z0-9_-]+$/.test(id);
}

export function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export function sanitizeId(id) {
    if (typeof id !== 'string') return '';
    return id.replace(/[^a-zA-Z0-9_\-]/g, '');
}

export function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function highlightMarkdown(text) {
    if (typeof text !== 'string' || !text) return '';

    const html = escapeHtml(text);

    // Combined patterns for better performance - fewer regex passes
    return html
        // 1. Inline Code + Variables (combined)
        .replace(/`([^`]+)`|\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (match, code, variable) => {
            if (code !== undefined) return `<span class="md-code">${code}</span>`;
            if (variable !== undefined) return `<span class="md-variable">{${variable}}</span>`;
            return match;
        })
        // 2. Bold + Italic (combined)
        .replace(/\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_/g, (match, bold, bold2, italic, italic2) => {
            if (bold !== undefined) return `<span class="md-bold">${bold}</span>`;
            if (bold2 !== undefined) return `<span class="md-bold">${bold2}</span>`;
            if (italic !== undefined) return `<span class="md-italic">${italic}</span>`;
            if (italic2 !== undefined) return `<span class="md-italic">${italic2}</span>`;
            return match;
        })
        // 3. Headings + List items (combined)
        .replace(/^(# .*$)|^(\* |\-| \d+\. )/gm, (match, heading, list) => {
            if (heading !== undefined) return `<span class="md-heading">${heading}</span>`;
            if (list !== undefined) return `<span class="md-list">${match}</span>`;
            return match;
        });
}

export function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
    }
    return Promise.reject(new Error('Clipboard API not available.'));
}

export function debounce(fn, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
}

export function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 0) return 'Just now';
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
}

export function extractVariables(content) {
    const regex = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
    const variables = new Set();
    let match;
    while ((match = regex.exec(content)) !== null) {
        variables.add(match[1]);
    }
    return Array.from(variables);
}

export function generatePlaceholder(variable) {
    const lower = variable.toLowerCase();
    if (lower.includes('name')) return 'Enter name...';
    if (lower.includes('topic') || lower.includes('subject')) return 'Enter topic...';
    if (lower.includes('language')) return 'e.g., Python, JavaScript';
    if (lower.includes('code')) return 'Paste your code here...';
    if (lower.includes('text') || lower.includes('content')) return 'Enter text...';
    if (lower.includes('url') || lower.includes('link')) return 'https://...';
    if (lower.includes('date')) return 'YYYY-MM-DD';
    if (lower.includes('email')) return 'email@example.com';
    if (lower.includes('number') || lower.includes('count')) return '0';
    if (lower.includes('description')) return 'Describe...';
    return `Enter ${variable}...`;
}

/**
 * Safely parses a JSON string with size and validity checks.
 * @param {string} jsonString - The JSON string to parse
 * @param {number} maxSize - Maximum allowed size in bytes (default: 5MB)
 * @returns {object} - The parsed JSON object
 * @throws {Error} - If file is too large or JSON is invalid
 */
export function safeJsonParse(jsonString, maxSize = 5 * 1024 * 1024) {
    if (typeof jsonString !== 'string') {
        throw new Error('Input must be a string');
    }
    if (jsonString.length > maxSize) {
        throw new Error('File too large. Maximum size is ' + (maxSize / 1024 / 1024) + 'MB');
    }
    try {
        return JSON.parse(jsonString);
    } catch (err) {
        throw new Error(`Invalid JSON: ${err.message}`);
    }
}
