const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Extract escapeHtml() straight out of scripts.html so the test exercises the
// actual shipped implementation instead of a re-implementation that could
// drift out of sync with the real fix.
function loadEscapeHtml() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'scripts.html'), 'utf8');
  const match = /function escapeHtml\(text\) \{[\s\S]*?\n {2}\}/.exec(html);
  assert.ok(match, 'escapeHtml() function not found in scripts.html');
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`${match[0]}\nthis.escapeHtml = escapeHtml;`, sandbox);
  return sandbox.escapeHtml;
}

test('escapeHtml escapes HTML-sensitive characters', () => {
  const escapeHtml = loadEscapeHtml();
  assert.equal(escapeHtml('<script>&"\''), '&lt;script&gt;&amp;&quot;&#039;');
});

test('escapeHtml returns empty string for undefined input (regression for issue #1)', () => {
  const escapeHtml = loadEscapeHtml();
  assert.equal(escapeHtml(undefined), '');
});

test('escapeHtml returns empty string for null input', () => {
  const escapeHtml = loadEscapeHtml();
  assert.equal(escapeHtml(null), '');
});

test('escapeHtml coerces non-string input to a string before escaping', () => {
  const escapeHtml = loadEscapeHtml();
  assert.equal(escapeHtml(42), '42');
});

test('escapeHtml passes through an already-safe string unchanged', () => {
  const escapeHtml = loadEscapeHtml();
  assert.equal(escapeHtml('hello world'), 'hello world');
});
