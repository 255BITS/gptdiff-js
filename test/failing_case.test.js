import { test } from 'node:test';
import assert from 'node:assert/strict';
import { smartapply } from '../src/index.js';

test('test_smartapply_think_tag_stripping', async () => {
  const diffText = `diff --git a/hello.py b/hello.py
--- a/hello.py
++++ b/hello.py
@@ -1,2 +1,5 @@
 def hello():
     print('Hello')
++
++def goodbye():
++    print('Goodbye')`;
  const originalFiles = { 'hello.py': "def hello():\n    print('Hello')\n" };

  const mock = async () => "\ndef goodbye():\n    print('Goodbye')";
  const updatedFiles = await smartapply(diffText, originalFiles, { callLlmForApply: mock });

  assert.ok((updatedFiles['hello.py'] || '').includes('def goodbye():'));
});
