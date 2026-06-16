import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateDiff } from '../src/index.js';

test('test_fail_diff_through_call_llm', async () => {
  const diffStr = `\`\`\`diff
DIFF 1
\`\`\`

Some text here
\`\`\`diff
DIFF 2
\`\`\``;

  const expected = `
DIFF 1

DIFF 2`;

  const dummyCallLlm = async () => ({
    choices: [{ message: { content: diffStr } }],
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
  });

  const result = await generateDiff('dummy environment', 'dummy goal', {
    model: 'test-model',
    callLlm: dummyCallLlm,
  });

  assert.equal(result.trim(), expected.trim());
});
