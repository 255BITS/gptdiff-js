import { test } from 'node:test';
import assert from 'node:assert/strict';
import { colorCodeDiff } from '../src/index.js';

test('test_color_code_diff', () => {
  const diffText = `-this line is removed
+this line is added
 unchanged line
-removed again
+and added again
 some other neutral line`;

  const colorized = colorCodeDiff(diffText);

  // We expect lines beginning with '-' to be in red
  assert.ok(colorized.includes('[31m-this line is removed[0m'));
  assert.ok(colorized.includes('[31m-removed again[0m'));

  // We expect lines beginning with '+' to be in green
  assert.ok(colorized.includes('[32m+this line is added[0m'));
  assert.ok(colorized.includes('[32m+and added again[0m'));

  // Lines unchanged should remain uncolored
  assert.ok(colorized.includes('unchanged line'));
  assert.ok(colorized.includes('some other neutral line'));

  // Ensure no erroneous color codes are added by counting them
  // Four color-coded lines => 4 * 2 = 8 color code inserts
  const colorCodeCount = colorized.split('[').length - 1;
  assert.equal(colorCodeCount, 8);
});
