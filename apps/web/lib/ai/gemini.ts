// Adapted from Hanh 5dd09df: generateContent + hedged model fallback.
// Server imports only. Never log provider bodies/headers or expose the API key.
export class GeminiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

export function getModelChain(): string[] {
  const primary = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const fallbacks = process.env.GEMINI_FALLBACK_MODELS ?? 'gemini-3.6-flash,gemini-3.8-flash';
  return [...new Set([primary, ...fallbacks.split(',')].map(m => m.trim()))]
    .filter(m => /^gemini-[a-zA-Z0-9._-]+$/.test(m)).slice(0, 3);
}

export function generateStructured<T>(options: {
  system: string;
  query: string;
  schema: Record<string, unknown>;
  validate: (data: unknown) => T;
  signal?: AbortSignal;
  budgetMs?: number;
  hedgeMs?: number;
}): Promise<{ data: T; model: string }> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return Promise.reject(new GeminiError(503, 'Máy chủ AI chưa được cấu hình.'));
  const models = getModelChain();
  if (!models.length) return Promise.reject(new GeminiError(503, 'Cấu hình model AI không hợp lệ.'));
  const controllers: AbortController[] = [];
  return new Promise((resolve, reject) => {
    let settled = false;
    let next = 0;
    let pending = 0;
    let hedge: ReturnType<typeof setTimeout> | undefined;
    const finish = (result?: { data: T; model: string }, error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(hedge);
      clearTimeout(deadline);
      options.signal?.removeEventListener('abort', onAbort);
      controllers.forEach(c => c.abort());
      if (result) resolve(result);
      else reject(error ?? new GeminiError(502, 'AI đang bận, vui lòng thử lại hoặc dùng bộ lọc cục bộ.'));
    };
    const onAbort = () => finish(undefined, new GeminiError(499, 'Yêu cầu đã bị hủy.'));
    const deadline = setTimeout(() => finish(undefined, new GeminiError(504, 'AI phản hồi quá lâu, vui lòng thử lại.')), options.budgetMs ?? 25_000);
    if (options.signal?.aborted) { onAbort(); return; }
    options.signal?.addEventListener('abort', onAbort, { once: true });

    const launch = () => {
      if (settled || next >= models.length) return;
      const model = models[next++];
      const controller = new AbortController();
      controllers.push(controller);
      pending++;
      clearTimeout(hedge);
      hedge = setTimeout(launch, options.hedgeMs ?? 5_000);
      void (async () => {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
            method: 'POST', signal: controller.signal,
            headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: options.system }] },
              contents: [{ role: 'user', parts: [{ text: JSON.stringify({ query: options.query }) }] }],
              generationConfig: { responseMimeType: 'application/json', responseSchema: options.schema, temperature: 0, maxOutputTokens: 2048 },
            }),
          });
          if (response.status === 401 || response.status === 403) {
            finish(undefined, new GeminiError(502, 'Dịch vụ AI chưa sẵn sàng. Vui lòng liên hệ quản trị viên.'));
            return;
          }
          if (!response.ok) throw new Error('provider response failed');
          const payload = await response.json();
          const parts: { text?: string; thought?: boolean }[] = payload?.candidates?.[0]?.content?.parts ?? [];
          const content = parts.filter(p => !p.thought).map(p => p.text ?? '').join('').trim();
          const data = options.validate(JSON.parse(content));
          finish({ data, model });
        } catch {
          // Malformed/unsafe output also tries the next configured model.
        } finally {
          pending--;
          if (!settled) {
            launch();
            if (pending === 0 && next >= models.length) finish();
          }
        }
      })();
    };
    launch();
  });
}
