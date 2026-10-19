import { createHash, randomUUID } from 'node:crypto';

export type ComfyQueueSnapshot = {
  running: number;
  pending: number;
  busy: boolean;
};

export type ComfySubmitResult = {
  promptId: string;
  clientId: string;
  workflowSha256: string;
  baseUrl: string;
};

export type ComfyPollResult =
  | {
      status: 'pending';
      promptId: string;
      runningIds: string[];
      queuedIds: string[];
    }
  | {
      status: 'completed';
      promptId: string;
      historyStatus: unknown;
      outputs: unknown;
    };

function normalizeBase(baseUrl: string): string {
  return baseUrl.trim().replace(/\/$/, '');
}

async function comfyJson(
  baseUrl: string,
  route: string,
  init: RequestInit | undefined,
  fetchImpl: typeof fetch,
): Promise<unknown> {
  const response = await fetchImpl(`${normalizeBase(baseUrl)}${route}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`ComfyUI ${route} failed: HTTP ${response.status}${body ? ` — ${body.slice(0, 400)}` : ''}`);
  }
  return response.json();
}

export async function getComfyQueue(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ComfyQueueSnapshot> {
  const queue = (await comfyJson(baseUrl, '/queue', { method: 'GET' }, fetchImpl)) as {
    queue_running?: unknown[];
    queue_pending?: unknown[];
  };
  const running = Array.isArray(queue.queue_running) ? queue.queue_running.length : 0;
  const pending = Array.isArray(queue.queue_pending) ? queue.queue_pending.length : 0;
  return { running, pending, busy: running + pending > 0 };
}

/** Refuse submit when anything is already running or queued. Never clears the queue. */
export async function assertComfyQueueIdle(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ComfyQueueSnapshot> {
  const snapshot = await getComfyQueue(baseUrl, fetchImpl);
  if (snapshot.busy) {
    throw new Error(
      `ComfyUI queue busy (running=${snapshot.running}, pending=${snapshot.pending}); no job was submitted.`,
    );
  }
  return snapshot;
}

export async function submitComfyPrompt(
  baseUrl: string,
  graph: Record<string, unknown>,
  fetchImpl: typeof fetch = fetch,
): Promise<ComfySubmitResult> {
  await assertComfyQueueIdle(baseUrl, fetchImpl);
  const clientId = randomUUID();
  const workflowBytes = new TextEncoder().encode(JSON.stringify(graph));
  const workflowSha256 = createHash('sha256').update(workflowBytes).digest('hex');
  const result = (await comfyJson(
    baseUrl,
    '/prompt',
    { method: 'POST', body: JSON.stringify({ prompt: graph, client_id: clientId }) },
    fetchImpl,
  )) as { prompt_id?: string; node_errors?: unknown };

  if (result.node_errors && Object.keys(result.node_errors as object).length > 0) {
    throw new Error(`ComfyUI node_errors: ${JSON.stringify(result.node_errors)}`);
  }
  if (typeof result.prompt_id !== 'string' || result.prompt_id.length === 0) {
    throw new Error('ComfyUI /prompt did not return prompt_id');
  }

  return {
    promptId: result.prompt_id,
    clientId,
    workflowSha256,
    baseUrl: normalizeBase(baseUrl),
  };
}

function entryPromptId(entry: unknown): string | undefined {
  if (!Array.isArray(entry) || entry.length < 2) return undefined;
  const id = entry[1];
  return typeof id === 'string' ? id : undefined;
}

export async function pollComfyPrompt(
  baseUrl: string,
  promptId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ComfyPollResult> {
  const history = (await comfyJson(baseUrl, `/history/${encodeURIComponent(promptId)}`, { method: 'GET' }, fetchImpl)) as Record<
    string,
    { status?: unknown; outputs?: unknown }
  >;
  const item = history[promptId];
  if (item) {
    return {
      status: 'completed',
      promptId,
      historyStatus: item.status,
      outputs: item.outputs,
    };
  }

  const queue = (await comfyJson(baseUrl, '/queue', { method: 'GET' }, fetchImpl)) as {
    queue_running?: unknown[];
    queue_pending?: unknown[];
  };
  return {
    status: 'pending',
    promptId,
    runningIds: (queue.queue_running ?? []).map(entryPromptId).filter((id): id is string => Boolean(id)),
    queuedIds: (queue.queue_pending ?? []).map(entryPromptId).filter((id): id is string => Boolean(id)),
  };
}
