// Server-only Responses API adapter. Never log keys or provider error bodies.
export class OpenAIError extends Error {
  readonly status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

export function getOpenAIModelChain(): string[] {
  return [...new Set([process.env.OPENAI_MODEL || 'gpt-6-luna',
    ...(process.env.OPENAI_FALLBACK_MODELS ?? 'gpt-5.4-mini').split(',')].map(m => m.trim()))]
    .filter(m => /^gpt-[a-zA-Z0-9._-]+$/.test(m)).slice(0, 3);
}

export function generateOpenAIStructured<T>(options: {
  system: string; query: string; schema: Record<string, unknown>; validate: (data: unknown) => T;
  imageDataUrls?: string[]; signal?: AbortSignal; budgetMs?: number; hedgeMs?: number;
}): Promise<{ data: T; model: string }> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return Promise.reject(new OpenAIError(503, 'Máy chủ OpenAI chưa được cấu hình.'));
  const models = getOpenAIModelChain();
  if (!models.length) return Promise.reject(new OpenAIError(503, 'Cấu hình model OpenAI không hợp lệ.'));
  const images = options.imageDataUrls ?? [];
  if (images.length > 2 || images.some(image => image.length > 1_400_000 ||
    !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(image))) {
    return Promise.reject(new OpenAIError(400, 'Ảnh không hợp lệ hoặc vượt giới hạn.'));
  }
  const controllers: AbortController[] = [];
  return new Promise((resolve, reject) => {
    let settled = false, next = 0, pending = 0;
    let hedge: ReturnType<typeof setTimeout> | undefined;
    const finish = (result?: { data: T; model: string }, error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(hedge); clearTimeout(deadline);
      options.signal?.removeEventListener('abort', onAbort);
      controllers.forEach(c => c.abort());
      if (result) resolve(result);
      else reject(error ?? new OpenAIError(502, 'OpenAI đang bận, vui lòng thử lại hoặc dùng bộ lọc cục bộ.'));
    };
    const onAbort = () => finish(undefined, new OpenAIError(499, 'Yêu cầu đã bị hủy.'));
    const deadline = setTimeout(() => finish(undefined, new OpenAIError(504, 'AI phản hồi quá lâu, vui lòng thử lại.')), options.budgetMs ?? 25_000);
    if (options.signal?.aborted) { onAbort(); return; }
    options.signal?.addEventListener('abort', onAbort, { once: true });
    const launch = () => {
      if (settled || next >= models.length) return;
      const model = models[next++];
      const controller = new AbortController(); controllers.push(controller); pending++;
      clearTimeout(hedge); hedge = setTimeout(launch, options.hedgeMs ?? 5_000);
      void (async () => {
        try {
          const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST', signal: controller.signal,
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, store: false, instructions: options.system,
              input: [{ role: 'user', content: [{ type: 'input_text', text: JSON.stringify({ query: options.query }) },
                ...images.map(image_url => ({ type: 'input_image', image_url, detail: 'high' }))] }],
              ...((model.startsWith('gpt-5') || model === 'gpt-6-luna') ? { reasoning: { effort: 'none' } } : {}),
              max_output_tokens: 2048,
              text: { format: { type: 'json_schema', name: 'gsf_result', strict: true, schema: options.schema } },
            }),
          });
          if (response.status === 401 || response.status === 403) {
            finish(undefined, new OpenAIError(502, 'OpenAI chưa sẵn sàng. Vui lòng kiểm tra quyền API key.')); return;
          }
          if (!response.ok) throw new Error('provider response failed');
          const payload = await response.json();
          if (payload.status !== 'completed') throw new Error('incomplete output');
          const output = payload.output as { type: string; content?: { type: string; text?: string }[] }[];
          const content = output.filter(o => o.type === 'message').flatMap(o => o.content ?? []);
          if (content.some(c => c.type === 'refusal')) {
            finish(undefined, new OpenAIError(422, 'AI không thể xử lý yêu cầu này. Vui lòng mô tả lại nhu cầu.')); return;
          }
          const text = content.filter(c => c.type === 'output_text').map(c => c.text ?? '').join('');
          const data = options.validate(JSON.parse(text));
          const actualModel = typeof payload.model === 'string' && /^gpt-[a-zA-Z0-9._-]{1,80}$/.test(payload.model) ? payload.model : model;
          finish({ data, model: actualModel });
        } catch {
          // Retry another configured OpenAI model; never silently switch provider.
        } finally {
          pending--;
          if (!settled) { launch(); if (pending === 0 && next >= models.length) finish(); }
        }
      })();
    };
    launch();
  });
}
