export type ComfyHostStatus = {
  configured: boolean;
  baseUrl: string | null;
  ok: boolean;
  statusCode?: number;
  system?: unknown;
  error?: string;
};

/** Read-only ComfyUI /system_stats probe. Never mutates the queue. */
export async function getComfyHostStatus(
  baseUrl: string | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<ComfyHostStatus> {
  const trimmed = baseUrl?.trim() ?? '';
  if (!trimmed) {
    return {
      configured: false,
      baseUrl: null,
      ok: false,
      error: 'TGF_COMFYUI_BASE_URL is not set',
    };
  }

  const root = trimmed.replace(/\/$/, '');
  try {
    const response = await fetchImpl(`${root}/system_stats`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      return {
        configured: true,
        baseUrl: root,
        ok: false,
        statusCode: response.status,
        error: `HTTP ${response.status}`,
      };
    }
    const system = (await response.json()) as unknown;
    return { configured: true, baseUrl: root, ok: true, statusCode: response.status, system };
  } catch (error) {
    return {
      configured: true,
      baseUrl: root,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
