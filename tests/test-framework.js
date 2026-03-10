export function expect(actual) {
    const matchers = (isNot = false) => ({
        toBe(expected) {
            if (isNot) {
                if (actual === expected) throw new Error(`Expected not "${expected}"`);
            } else {
                if (actual !== expected) throw new Error(`Expected "${expected}" but got "${actual}"`);
            }
        },
        toEqual(expected) {
            const a = JSON.stringify(actual);
            const b = JSON.stringify(expected);
            if (isNot) {
                if (a === b) throw new Error(`Expected not ${b}`);
            } else {
                if (a !== b) throw new Error(`Expected ${b} but got ${a}`);
            }
        },
        toBeTruthy() {
            if (isNot) {
                if (actual) throw new Error(`Expected value to be falsy, but got ${actual}`);
            } else {
                if (!actual) throw new Error(`Expected value to be truthy, but got ${actual}`);
            }
        },
        toBeFalsy() {
            if (isNot) {
                if (!actual) throw new Error(`Expected value to be truthy, but got ${actual}`);
            } else {
                if (actual) throw new Error(`Expected value to be falsy, but got ${actual}`);
            }
        },
        toBeGreaterThan(expected) {
            if (isNot) {
                if (actual > expected) throw new Error(`Expected ${actual} not to be greater than ${expected}`);
            } else {
                if (!(actual > expected)) throw new Error(`Expected ${actual} to be greater than ${expected}`);
            }
        },
        toContain(item) {
            let contains = false;
            if (Array.isArray(actual)) {
                contains = actual.includes(item);
            } else if (typeof actual === 'string') {
                contains = actual.includes(item);
            } else {
                throw new Error(`Value is not an array or string`);
            }

            if (isNot) {
                if (contains) throw new Error(`Expected not to contain "${item}"`);
            } else {
                if (!contains) throw new Error(`Expected to contain "${item}"`);
            }
        }
    });

    const base = matchers(false);
    base.not = matchers(true);
    return base;
}

export function describe(name, fn) {
    const container = document.getElementById('test-results');
    const header = document.createElement('h3');
    header.textContent = name;
    container.appendChild(header);
    try {
        fn();
    } catch (e) {
        console.error(e);
        const err = document.createElement('div');
        err.className = 'test-fail';
        err.textContent = `Error in describe block: ${e.message}`;
        container.appendChild(err);
    }
}

export async function it(name, fn) {
    const container = document.getElementById('test-results');
    const el = document.createElement('div');
    el.textContent = `⏳ ${name}`;
    el.className = 'test-pending';
    container.appendChild(el);
    
    try {
        await fn();
        el.textContent = `✓ ${name}`;
        el.className = 'test-pass';
    } catch (e) {
        el.textContent = `✗ ${name}: ${e.message}`;
        el.className = 'test-fail';
        console.error(e);
    }
}