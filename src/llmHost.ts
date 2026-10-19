/**
 * Playground LLM host config. Defaults go through the Vite `/llm` proxy so the
 * browser never talks cross-origin to the LAN OpenAI-compatible server.
 * Override with ?llmBase= / ?llmModel= or VITE_LLM_BASE_URL / VITE_LLM_MODEL.
 */
export function resolveLlmHost(search = window.location.search): {
  baseUrl: string;
  model: string;
} {
  const params = new URLSearchParams(search);
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const baseUrl = params.get('llmBase')
    ?? env?.VITE_LLM_BASE_URL
    ?? `${window.location.origin}/llm/v1`;
  const model = params.get('llmModel')
    ?? env?.VITE_LLM_MODEL
    ?? 'google/gemma-4-e2b';
  return { baseUrl, model };
}
