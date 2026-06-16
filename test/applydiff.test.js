import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyDiff } from '../src/index.js';

test('test_apply_diff_success', () => {
  const files = { 'example.txt': 'original content\n' };
  const diffText =
    'diff --git a/example.txt b/example.txt\n' +
    '--- a/example.txt\n' +
    '+++ a/example.txt\n' +
    '@@ -1 +1 @@\n' +
    '-original content\n' +
    '+modified content\n';
  const result = applyDiff(files, diffText);
  assert.equal(result.changed, true, 'apply_diff should return True for a successful patch');
  assert.ok(result.files['example.txt'].includes('modified content'),
    "File content should be updated to 'modified content'");
});

test('test_apply_diff_failure', () => {
  const files = { 'example.txt': 'original content\n' };
  const diffText =
    'diff --git a/example.txt b/example.txt\n' +
    '--- a/example.txt\n' +
    '+++ a/example.txt\n' +
    '@@ -2,1 +2,1 @@\n' +
    '-original content\n' +
    '+modified content\n';
  const result = applyDiff(files, diffText);
  assert.equal(result.changed, false, 'apply_diff should return False when the diff fails to apply');
  assert.ok(result.files['example.txt'].includes('original content'),
    'File content should remain unchanged on failure');
});

test('test_apply_diff_file_deletion', () => {
  const files = { 'example.txt': 'original content\n' };
  const diffText =
    'diff --git a/example.txt b/example.txt\n' +
    'deleted file mode 100644\n' +
    '--- a/example.txt\n' +
    '+++ /dev/null\n' +
    '@@ -1,1 +0,0 @@\n' +
    '-original content\n';
  const result = applyDiff(files, diffText);
  assert.equal(result.changed, true, 'apply_diff should return True for a successful file deletion');
  assert.ok(!Object.hasOwn(result.files, 'example.txt'), 'File should be deleted after applying the diff');
});

test('test_minimal_new_file_diff', () => {
  const files = {};
  const diffText =
    'diff --git a/new.txt b/new.txt\n' +
    'new file mode 100644\n' +
    '--- /dev/null\n' +
    '+++ b/new.txt\n' +
    '@@\n' +
    '+hello world\n';
  const result = applyDiff(files, diffText);
  assert.equal(result.changed, true);
  assert.ok(Object.hasOwn(result.files, 'new.txt'));
  assert.equal(result.files['new.txt'], 'hello world\n');
});

test('test_new_file_creation_minimal_header_failure', () => {
  const files = {};
  const diffText =
    '--- /dev/null\n' +
    '+++ b/test_feature_1739491796.py\n' +
    '@@\n' +
    '+import pytest\n' +
    '+\n';
  const result = applyDiff(files, diffText);
  assert.equal(result.changed, true, 'apply_diff should return True for a successful new file creation');
  assert.ok(Object.hasOwn(result.files, 'test_feature_1739491796.py'), 'New file should be created');
  const expectedContent = 'import pytest\n';
  const content = result.files['test_feature_1739491796.py'];
  assert.equal(content.trim(), expectedContent.trim());
});

test('test_apply_bad_diff_fails', () => {
  // Faithful to the Python fixture: the file lives at 'gptdiff.py', but the
  // diff targets 'gptdiff/gptdiff.py' (a path that does not exist), so the
  // patch cannot apply and apply_diff returns False / changed: false.
  const files = {
    'gptdiff.py': '#!/usr/bin/env python3\nfrom pathlib import Path\n# Line 3\n# Line 4\n',
  };
  const diffText = `diff --git a/gptdiff/gptdiff.py b/gptdiff/gptdiff.py
index 1234567..89abcde 100644
--- a/gptdiff/gptdiff.py
+++ b/gptdiff/gptdiff.py
@@ -1,4 +1,5 @@
 #!/usr/bin/env python3
+from threading import Lock
 from pathlib import Path`;
  const result = applyDiff(files, diffText);
  assert.equal(result.changed, false, 'apply_diff should fail, needs smartapply');
});
