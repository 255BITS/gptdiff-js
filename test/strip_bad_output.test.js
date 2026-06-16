import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stripBadOutput } from '../src/index.js';

test('test_strip_bad_output_removes_wrapping', () => {
  const original = "def hello():\n    print('Hello')\n";
  const updated =
    "This is the file you requested:\n" +
    "```diff\n" +
    "def hello():\n" +
    "    print('Goodbye')\n" +
    "```\n" +
    "Thank you!";
  const expected = "def hello():\n    print('Goodbye')\n";
  const result = stripBadOutput(updated, original);
  assert.equal(result, expected);
});

test('test_strip_bad_output_no_change_when_original_has_code_block', () => {
  const original = "```diff\ndef hello():\n    print('Hello')\n```";
  const updated = "```diff\ndef hello():\n    print('Modified')\n```";
  const result = stripBadOutput(updated, original);
  assert.equal(result, updated);
});

test('test_strip_bad_output_no_wrapping_detected', () => {
  const original = "def hello():\n    print('Hello')\n";
  const updated = "def hello():\n    print('Modified')\n";
  const result = stripBadOutput(updated, original);
  assert.equal(result, updated);
});

test('test_strip_bad_output_prod_case', () => {
  const original = "def foo():\n    pass\n";
  const updated =
    "Here's the entire file after applying the diff:\n\n" +
    "```typescript\n" +
    "def foo():\n" +
    "    print('Modified')\n" +
    "```\n" +
    "Some trailing text that should be ignored.";
  const expected = "def foo():\n    print('Modified')\n";
  const result = stripBadOutput(updated, original);
  assert.equal(result, expected);
});

test('test_strip_bad_output_preserves_inner_code_fences', () => {
  const original =
    "# README\n" +
    "\n" +
    "Some code:\n" +
    "\n" +
    "```python\n" +
    'print("hi")\n' +
    "```\n" +
    "\n" +
    "More text at end.\n";
  const updated = "```markdown\n" + original + "```";
  const result = stripBadOutput(updated, original);
  assert.equal(result, original);
});

test('test_strip_bad_output_preserves_trailing_newline_plain', () => {
  const original = "def hello():\n    print('hi')\n";
  const updated = "def hello():\n    print('bye')\n";
  const result = stripBadOutput(updated, original);
  assert.equal(result.endsWith("\n"), true);
  assert.equal(result, updated);
});

test('test_strip_bad_output_drops_stray_language_after_bare_fence', () => {
  const original = "def hello():\n    pass\n";
  const updated = "```\npython\ndef hello():\n    print('hi')\n```\n";
  const expected = "def hello():\n    print('hi')\n";
  const result = stripBadOutput(updated, original);
  assert.equal(result, expected);
});

test('test_strip_bad_output_unclosed_fence_returns_input', () => {
  const original = "def hello():\n    pass\n";
  const updated = "```python\ndef hello():\n    print('hi')\n";
  const result = stripBadOutput(updated, original);
  assert.equal(result, updated);
});
