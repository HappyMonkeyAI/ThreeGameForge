export type OpenAiCompatibleCompleteOptions = {
  /** e.g. http://127.0.0.1:1234/v1 — host-owned; Forge does not ship LAN defaults in packages. */
  baseUrl: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  /** Optional fetch override for tests. */
  fetchImpl?: typeof fetch;
};

type ChatMessage = {
  content?: string | null;
  reasoning_content?: string | null;
  reasoning?: string | null;
};

type ChatCompletionResponse = {
  choices?: Array<{ message?: ChatMessage }>;
};

/** Prefer final content; fall back to reasoning fields used by some local Gemma builds. */
export function selectCompletionText(message: ChatMessage | undefined): string {
  const content = message?.content?.trim() ?? '';
  if (content) return content;
  const reasoning = (message?.reasoning_content ?? message?.reasoning ?? '').trim();
  if (reasoning) return reasoning;
  return '';
}

/**
 * OpenAI-compatible chat completion for SceneSpec repair hosts (LM Studio, vLLM, etc.).
 * Returns the assistant message content string (or reasoning text when content is empty).
 */
export function createOpenAiCompatibleComplete(
  options: OpenAiCompatibleCompleteOptions,
): (prompt: string) => Promise<string> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl.replace(/\/$/, '');
  const temperature = options.temperature ?? 0.1;
  const maxTokens = options.maxTokens ?? 2048;

  return async (prompt) => {
    const response = await fetchImpl(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: options.model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          {
            role: 'system',
            content:
              'You repair ThreeGameForge SceneSpec JSON. Think if needed, then end with a single JSON object. The final answer must be valid SceneSpec JSON.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`LLM HTTP ${response.status}: ${body.slice(0, 400)}`);
    }

    const payload = (await response.json()) as ChatCompletionResponse;
    const text = selectCompletionText(payload.choices?.[0]?.message);
    if (!text) {
      throw new Error('LLM returned an empty completion (no content or reasoning_content)');
    }
    return text;
  };
}
