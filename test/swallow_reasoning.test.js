import { test } from 'node:test';
import assert from 'node:assert/strict';
import { swallowReasoning } from '../src/index.js';

test('test_swallow_reasoning_extraction_simple', () => {
  const llmResponse =
    '+> Reasoning\n' +
    '+None\n' +
    '+Reasoned about summary drawer button 변경 for 15 seconds\n' +
    '+def new():\n' +
    '```';
  const [finalContent, reasoning] = swallowReasoning(llmResponse);
  const expectedReasoning =
    '> Reasoning\n' +
    'None\n' +
    'Reasoned about summary drawer button 변경 for 15 seconds';
  assert.equal(reasoning, expectedReasoning);
  // The final content should no longer contain the reasoning block.
  assert.ok(!finalContent.includes(expectedReasoning));
});

test('test_swallow_reasoning_extraction_multiline', () => {
  const llmResponse =
    'line 1> Reasoning\n' +
    '+None\n' +
    '+Reasoned about summary drawer button 변경 for 1 seconds\n' +
    'line 2\n' +
    '  > Reasoning\n' +
    '+None\n' +
    '+Reasoned about summary drawer button 변경 for 2 seconds\n' +
    'line 3:';
  const [finalContent, reasoning] = swallowReasoning(llmResponse);
  const expectedReasoning =
    '> Reasoning\n' +
    'None\n' +
    'Reasoned about summary drawer button 변경 for 1 seconds\n' +
    '> Reasoning\n' +
    'None\n' +
    'Reasoned about summary drawer button 변경 for 2 seconds';
  assert.equal(reasoning, expectedReasoning);
  assert.equal('line 1\nline 2\n  \nline 3:', finalContent);
  // The final content should no longer contain the reasoning block.
  assert.ok(!finalContent.includes(expectedReasoning));
});

test('test_swallow_reasoning_with_untested_response', () => {
  const llmResponse =
    '> Reasoning\n' +
    '**Considering the request**\n' +
    'I’m noting that the user wants me to apply a diff to a file and return the result in a block, ensuring the entire file is included.\n' +
    '**Ensuring comprehensive inclusion**\n' +
    "I'm making sure the entire file is included when presenting the result in a block, following the user's request carefully.\n" +
    '**Ensuring clarity**\n' +
    'I’m integrating the diff into the file and ensuring the entire file is returned as requested. This approach maintains precision and clarity in the response.\n' +
    '**Refining the response**\n' +
    'I’m focusing on how to structure the response by carefully integrating the diff and ensuring the entire file is included in a clear block format.\n' +
    '**Connecting the pieces**\n' +
    "I'm mapping out how to apply the diff to the file carefully and ensure the entire file is incorporated into the final block.\n" +
    'Reasoned for a few seconds\n' +
    '\n' +
    '```diff\n' +
    '--- a/file.py\n' +
    '+++ b/file.py\n' +
    '@@ -1,2 +1,2 @@\n' +
    '-def old():\n' +
    '+def new():\n' +
    '```';
  const [finalContent, reasoning] = swallowReasoning(llmResponse);

  const expectedReasoning =
    '> Reasoning\n' +
    '**Considering the request**\n' +
    'I’m noting that the user wants me to apply a diff to a file and return the result in a block, ensuring the entire file is included.\n' +
    '**Ensuring comprehensive inclusion**\n' +
    "I'm making sure the entire file is included when presenting the result in a block, following the user's request carefully.\n" +
    '**Ensuring clarity**\n' +
    'I’m integrating the diff into the file and ensuring the entire file is returned as requested. This approach maintains precision and clarity in the response.\n' +
    '**Refining the response**\n' +
    'I’m focusing on how to structure the response by carefully integrating the diff and ensuring the entire file is included in a clear block format.\n' +
    '**Connecting the pieces**\n' +
    "I'm mapping out how to apply the diff to the file carefully and ensure the entire file is incorporated into the final block.\n" +
    'Reasoned for a few seconds';

  assert.equal(reasoning, expectedReasoning);
  // The final content should no longer contain the reasoning block.
  assert.ok(!finalContent.includes(expectedReasoning));
  // And it should contain the diff block.
  assert.ok(finalContent.includes('```diff'));
});

test('test_swallow_reasoning_extraction', () => {
  const llmResponse =
    '> Reasoning\n' +
    '**Applying the diff**\n' +
    "I'm piecing together how to efficiently apply a diff to a file...\n" +
    '**Returning the result**\n' +
    "I'm finalizing the method to apply the diff updates...\n" +
    'Reasoned for 6 seconds\n' +
    '\n' +
    '```diff\n' +
    '--- a/file.py\n' +
    '+++ b/file.py\n' +
    '@@ -1,2 +1,2 @@\n' +
    '-def old():\n' +
    '+def new():\n' +
    '```';
  const [finalContent, reasoning] = swallowReasoning(llmResponse);
  const expectedReasoning =
    '> Reasoning\n' +
    '**Applying the diff**\n' +
    "I'm piecing together how to efficiently apply a diff to a file...\n" +
    '**Returning the result**\n' +
    "I'm finalizing the method to apply the diff updates...\n" +
    'Reasoned for 6 seconds';
  assert.equal(reasoning, expectedReasoning);
  // The final content should no longer contain the reasoning block.
  assert.ok(!finalContent.includes(expectedReasoning));
  // And it should contain the diff block.
  assert.ok(finalContent.includes('```diff'));
});

test('test_swallow_reasoning_no_reasoning', () => {
  const llmResponse =
    '```diff\n' +
    '--- a/file.py\n' +
    '+++ b/file.py\n' +
    '@@ -1,2 +1,2 @@\n' +
    '-def old():\n' +
    '+def new():\n' +
    '```';
  const [finalContent, reasoning] = swallowReasoning(llmResponse);
  assert.equal(reasoning, '');
  assert.equal(finalContent, llmResponse.trim());
});

test('test_swallow_reasoning_inline_newlines', () => {
  const llmResponse =
    'Prefix text before reasoning and some inline content ' +
    '> Reasoning\n' +
    'Inline line 1\n' +
    'Inline line 2\n' +
    'Reasoned for 2 seconds ' +
    'and then suffix text.\n' +
    '```diff\n' +
    '--- a/inline.py\n' +
    '+++ b/inline.py\n' +
    '@@ -1,2 +1,2 @@\n' +
    "-print('Old')\n" +
    "+print('New')\n" +
    '```';
  const [finalContent, reasoning] = swallowReasoning(llmResponse);
  const expectedReasoning =
    '> Reasoning\n' +
    'Inline line 1\n' +
    'Inline line 2\n' +
    'Reasoned for 2 seconds';
  // Count the newlines in the extracted reasoning block.
  const newlineCount = (reasoning.match(/\n/g) || []).length;
  // There should be 3 newline characters.
  assert.equal(newlineCount, 3, `Expected 3 newlines, got ${newlineCount}`);
  assert.equal(reasoning, expectedReasoning);
  // Ensure the reasoning block is removed from the final content.
  assert.ok(!finalContent.includes(expectedReasoning));
  // Verify that surrounding content remains.
  assert.ok(finalContent.includes('Prefix text before reasoning'));
  assert.ok(finalContent.includes('and then suffix text.'));
  // Verify that the diff block is still present.
  assert.ok(finalContent.includes('```diff'));
});
