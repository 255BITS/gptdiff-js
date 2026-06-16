import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyDiff } from '../src/index.js';

// Baseline files map equivalent to the Python tmp_project_dir fixture.
function baseFiles() {
  return { 'example.txt': 'line1\nline2\nline3\n' };
}

test('test_empty_diff', () => {
  const diffText = '';
  const result = applyDiff(baseFiles(), diffText);
  assert.equal(result.changed, false, 'Empty diff should return False');
});

test('test_diff_no_changes', () => {
  const diffText =
    'diff --git a/example.txt b/example.txt\n' +
    '--- a/example.txt\n' +
    '+++ a/example.txt\n' +
    '@@ -1,3 +1,3 @@\n' +
    ' line1\n' +
    '-line2\n' +
    '+line2\n' +
    ' line3\n';
  const files = baseFiles();
  const result = applyDiff(files, diffText);
  assert.equal(result.changed, false, 'Diff that makes no changes should return False');
  assert.ok(result.files['example.txt'].includes('line2'), 'Original content should remain unchanged');
});

test('test_new_file_creation', () => {
  const diffText =
    'diff --git a/newfile.txt b/newfile.txt\n' +
    'new file mode 100644\n' +
    'index 0000000..e69de29\n' +
    '--- /dev/null\n' +
    '+++ b/newfile.txt\n' +
    '@@ -0,0 +1,3 @@\n' +
    '+new line1\n' +
    '+new line2\n' +
    '+new line3\n';
  const result = applyDiff(baseFiles(), diffText);
  assert.equal(result.changed, true, 'Diff for new file creation should return True');
  assert.ok(Object.hasOwn(result.files, 'newfile.txt'), 'New file should be created');
  assert.ok(result.files['newfile.txt'].includes('new line1'), 'New file content should be present');
});

test('test_multiple_hunks', () => {
  const files = { 'example.txt': 'a\nb\nc\nd\ne\n' };
  const diffText =
    'diff --git a/example.txt b/example.txt\n' +
    '--- a/example.txt\n' +
    '+++ b/example.txt\n' +
    '@@ -1,3 +1,3 @@\n' +
    '-a\n' +
    '+alpha\n' +
    ' b\n' +
    ' c\n' +
    '@@ -4,2 +4,2 @@\n' +
    '-d\n' +
    '-e\n' +
    '+delta\n' +
    '+epsilon\n';
  const result = applyDiff(files, diffText);
  assert.equal(result.changed, true, 'Diff with multiple hunks should return True');
  const content = result.files['example.txt'];
  assert.ok(content.includes('alpha'));
  assert.ok(content.includes('delta') && content.includes('epsilon'));
});

test('test_diff_with_incorrect_context', () => {
  const files = { 'example.txt': 'different content\n' };
  const diffText =
    'diff --git a/example.txt b/example.txt\n' +
    '--- a/example.txt\n' +
    '+++ a/example.txt\n' +
    '@@ -1,1 +1,1 @@\n' +
    '-line that does not exist\n' +
    '+modified content\n';
  const result = applyDiff(files, diffText);
  assert.equal(result.changed, false, 'Diff with incorrect context should return False');
  assert.ok(result.files['example.txt'].includes('different content'), 'Original content should remain unchanged');
});

test('test_diff_with_whitespace_changes', () => {
  const files = { 'example.txt': 'line1\nline2\nline3\n' };
  const diffText =
    'diff --git a/example.txt b/example.txt\n' +
    '--- a/example.txt\n' +
    '+++ a/example.txt\n' +
    '@@ -1,3 +1,3 @@\n' +
    ' line1\n' +
    '-line2\n' +
    '+line2  \n' +
    ' line3\n';
  const result = applyDiff(files, diffText);
  assert.equal(result.changed, true, 'Diff with whitespace changes should return True if applied');
  assert.ok(result.files['example.txt'].includes('line2  '), 'Whitespace change should be reflected in the file');
});

test('test_diff_without_context_prefixes', () => {
  const files = { 'example.txt': 'line1\nline2\nline3\n' };
  const diffText =
    'diff --git a/example.txt b/example.txt\n' +
    '--- a/example.txt\n' +
    '+++ a/example.txt\n' +
    '@@ -1,3 +1,3 @@\n' +
    'line1\n' +
    '-line2\n' +
    '+line2 updated\n' +
    'line3\n';
  const result = applyDiff(files, diffText);
  assert.equal(result.changed, true, 'Diff without context prefixes should still apply');
  assert.equal(result.files['example.txt'], 'line1\nline2 updated\nline3\n');
});

test('test_diff_file_deletion_edge', () => {
  const files = { 'example.txt': 'line1\nline2\nline3\n', 'small.txt': 'only line\n' };
  const diffText =
    'diff --git a/small.txt b/small.txt\n' +
    'deleted file mode 100644\n' +
    'index e69de29..0000000\n' +
    '--- a/small.txt\n' +
    '+++ /dev/null\n' +
    '@@ -1,1 +0,0 @@\n' +
    '-only line\n';
  const result = applyDiff(files, diffText);
  assert.equal(result.changed, true, 'Deletion diff on a minimal file should return True');
  assert.ok(!Object.hasOwn(result.files, 'small.txt'), 'File should be deleted');
});
