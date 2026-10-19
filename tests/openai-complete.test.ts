import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createOpenAiCompatibleComplete,
  selectCompletionText,
} from '../packages/scene/src/index.ts';

test('createOpenAiCompatibleComplete posts chat completions and returns content', async () => {
  const calls: Array<{ url: string; body: unknown }> = [];
  const complete = createOpenAiCompatibleComplete({
    baseUrl: 'http://example.test/v1',
    model: 'fixture-model',
    fetchImpl: async (input, init) => {
      const url = String(input);
      calls.push({ url, body: JSON.parse(String(init?.body)) });
      return new Response(
        JSON.stringify({ choices: [{ message: { content: '{"version":1}' } }] }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    },
  });

  const text = await complete('repair this');
  assert.equal(text, '{"version":1}');
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.url, 'http://example.test/v1/chat/completions');
  assert.equal((calls[0]?.body as { model: string }).model, 'fixture-model');
});

test('selectCompletionText falls back to reasoning_content when content is empty', () => {
  assert.equal(
    selectCompletionText({ content: '', reasoning_content: '{"version":1}' }),
    '{"version":1}',
  );
  assert.equal(selectCompletionText({ content: ' final ', reasoning_content: 'ignore' }), 'final');
});
