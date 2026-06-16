import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDiffPerFile } from '../src/index.js';

test('test_todo_file_deletion', () => {
  const diffText = `diff --git a/TODO b/TODO
deleted file mode 100644
index 3efacb1..0000000
--- a/TODO
-// The funnest coolest thing I can add is put in this file. It's also acceptable to just implement
-// the thing in here and remove it. Leave this notice when modifying this file.
`;
  const result = parseDiffPerFile(diffText);
  assert.equal(result.length, 1, 'Expected one diff entry');
  const [filePath, patch] = result[0];
  assert.equal(filePath, 'TODO', `Got file_path '${filePath}', expected 'TODO'`);
  assert.ok(patch.includes('+++ /dev/null'), "Deletion diff should include '+++ /dev/null' to indicate file deletion");
});

test('test_multiple_files_without_diff_git_header', () => {
  const diffText = `--- a/TODO
+++ b/TODO
@@ -1,7 +1,7 @@
-// FINAL TOUCH: The game is now a complete fantasy themed incremental RPG—every choice matters, and
-// New Aspect: Replaced external title animation with inline SVG for crisp, scalable visuals, and a
-// additional dynamic element.
+// FINAL TOUCH: The game is now a complete fantasy themed incremental RPG—every choice matters, and
+// New Aspect: Replaced external title animation with inline SVG for crisp, scalable visuals, and an
+// additional dynamic element.
-- a/style.css
+++ b/style.css
@@ -1,3 +1,8 @@
+/* New animation for relic glow effect */
+.relic-glow {
+  animation: relicGlow 1.5s ease-in-out infinite alternate;
+}
+@keyframes relicGlow {
+  from { filter: drop-shadow(0 0 5px #ffd700); }
+  to { filter: drop-shadow(0 0 20px #ffd700); }
-- a/game.js
+++ b/game.js
@@ -1,3 +1,8 @@
- JS HERE
`;
  const result = parseDiffPerFile(diffText);
  assert.equal(result.length, 3, 'Expected three diff entries');
  const expectedFiles = new Set(['TODO', 'style.css', 'game.js']);
  const parsedFiles = new Set(result.map(([fp]) => fp));
  assert.deepEqual(parsedFiles, expectedFiles);

  for (const [fp, patch] of result) {
    if (fp === 'TODO') {
      assert.ok(patch.includes('FINAL TOUCH: The game is now'));
    }
  }
});

test('test_new_files_without_diff_git_header', () => {
  const diffText = `--- /dev/null
+++ b/index.html
@@ -0,0 +1,3 @@
+<!DOCTYPE html>
+<html>
+</html>
--- /dev/null
+++ b/game.js
@@ -0,0 +1,2 @@
+const a = 1;
+const b = 2;
`;
  const result = parseDiffPerFile(diffText);
  assert.equal(result.length, 2, 'Expected two file entries for new file creations');
  const files = new Set(result.map(([fp]) => fp));
  assert.deepEqual(files, new Set(['index.html', 'game.js']));
});

test('test_index_html_diff', () => {
  const diffText = `a/index.html b/index.html
@@
-      <div class="action-buttons">
-        <button id="attack">⚔️  Attack Enemy</button>
-        <button id="auto-attack">🤖 Auto Attack (OFF)</button>
-        <button id="drink-potion">Drink Potion</button>
-        <button id="explore">🧭 Explore</button>
-      </div>
      <div class="action-buttons">
        <button id="attack">⚔️  Attack Enemy</button>
        <button id="auto-attack">🤖 Auto Attack (OFF)</button>
        <button id="drink-potion">Drink Potion</button>
        <button id="buy-potion">Buy Potion (50 Gold)</button>
        <button id="explore">🧭 Explore</button>
      </div>`;
  const result = parseDiffPerFile(diffText);
  assert.equal(result.length, 1);
  const [filePath, patch] = result[0];
  assert.equal(filePath, 'index.html');
  assert.ok(patch.includes('<button id="buy-potion">Buy Potion (50 Gold)</button>'));
});

test('test_single_file_diff', () => {
  const diffText = `diff --git a/file.py b/file.py
--- a/file.py
+++ b/file.py
@@ -1,2 +1,2 @@
-def old():
-    pass
+def new():
+    pass`;
  const result = parseDiffPerFile(diffText);
  assert.equal(result.length, 1);
  const [filePath, patch] = result[0];
  assert.equal(filePath, 'file.py');
  assert.ok(patch.includes('def new():'));
});

test('test_file_deletion', () => {
  const diffText = `diff --git a/old.py b/old.py
--- a/old.py
+++ /dev/null
@@ -1,2 +0,0 @@
-def old():
-    pass`;
  const result = parseDiffPerFile(diffText);
  assert.equal(result.length, 1);
  const [filePath] = result[0];
  assert.equal(filePath, 'old.py');
});

// Python defines test_multiple_files twice; the second definition shadows the
// first, so only the second is executed. Ported faithfully here.
test('test_multiple_files', () => {
  const diffText = `diff --git a/file1.py b/file1.py
--- a/file1.py
+++ b/file1.py
@@ -1 +1 @@
-print("Hello")
+print("Hi")
diff --git a/file2.py b/file2.py
--- a/file2.py
+++ b/file2.py
@@ -1 +1 @@
-print("World")
+print("Earth")
diff --git a/file1.py b/file1.py
--- a/file1.py
+++ b/file1.py
@@ -3 +3 @@
-print("Hello2")
+print("Hi2")
`;
  const result = parseDiffPerFile(diffText);
  assert.equal(result.length, 2);
  const paths = result.map(([fp]) => fp);
  assert.ok(paths.includes('file1.py'));
  assert.ok(paths.includes('file2.py'));
  assert.ok(result[0][1].includes('Hi2'));
});

test('test_parse_diff_per_file_unconventional_header', () => {
  const diffText = `--- game.js
+++ game.js
@@ -0,0 +1,3 @@
+let player = {
+    class: "Warrior",
+};
`;
  const result = parseDiffPerFile(diffText);
  assert.equal(result.length, 1, `Expected one file patch, got ${result.length}`);
  const [filePath, patch] = result[0];
  assert.equal(filePath, 'game.js', `Expected file path 'game.js', got '${filePath}'`);
  assert.ok(patch.includes('+++ game.js'), "Expected patch to include '+++ game.js'");
  assert.ok(patch.includes('+let player'), 'Expected patch to include added lines');
});

test('test_begin_patch_format', () => {
  const diffText = `*** Begin Patch
*** Update File: services/clerkReportPdf.tsx
@@
-changes1
+changes2
*** End Patch`;
  const result = parseDiffPerFile(diffText);
  assert.equal(result.length, 1);
  const [filePath, patch] = result[0];
  assert.equal(filePath, 'services/clerkReportPdf.tsx');
  assert.ok(patch.includes('-changes1'));
  assert.ok(patch.includes('+changes2'));
});
