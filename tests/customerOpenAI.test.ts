import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateOpenAIStructured, getOpenAIModelChain } from '../apps/web/lib/ai/openai';
import { CUSTOMER_SEARCH_OPENAI_SCHEMA, validateCustomerConstraints } from '../apps/web/lib/ai/customerSearch';
import { validateServerConstraints } from '../apps/customer/src/services/customer-finder.service';
const data = { maxBudget: 100000, people: 2, category: 'vegetarian', area: null, pickupBefore: '20:00', preferences: [] };
const ok = (changes = {}) => Response.json({ status: 'completed', model: 'gpt-primary-snapshot', output: [
  { type: 'message', content: [{ type: 'output_text', text: JSON.stringify(data) }] },
], ...changes });
const run = (extra = {}) => generateOpenAIStructured({ system: 'system', query: '2 người 100k', schema: CUSTOMER_SEARCH_OPENAI_SCHEMA, validate: validateCustomerConstraints, ...extra });
beforeEach(() => {
  vi.stubEnv('OPENAI_API_KEY', 'fixture-openai-key'); vi.stubEnv('OPENAI_MODEL', 'gpt-primary');
  vi.stubEnv('OPENAI_FALLBACK_MODELS', 'gpt-backup');
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Unexpected network')));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe('OpenAI Responses transport', () => {
  it('bounds and deduplicates model configuration', () => {
    vi.stubEnv('OPENAI_FALLBACK_MODELS', 'gpt-primary,https://bad,gpt-backup,gpt-extra,gpt-four');
    expect(getOpenAIModelChain()).toEqual(['gpt-primary','gpt-backup','gpt-extra']);
  });
  it('requires an OpenAI key, never borrowing a Gemini key', async () => {
    vi.stubEnv('OPENAI_API_KEY', ''); await expect(run()).rejects.toMatchObject({ status: 503 }); expect(fetch).not.toHaveBeenCalled();
  });
  it('requests strict schema with store=false and preserves real model provenance', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(ok()); const result = await run();
    expect(result.model).toBe('gpt-primary-snapshot');
    expect(validateServerConstraints({ constraints: result.data })).toEqual(data);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/responses');
    const body = JSON.parse(init?.body as string); expect(body.store).toBe(false);
    expect(body.text.format.strict).toBe(true); expect(body.text.format.schema.additionalProperties).toBe(false);
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer fixture-openai-key' });
  });
  it('sends bounded image input using Responses input_image', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(ok()); await run({ imageDataUrls: ['data:image/png;base64,YQ=='] });
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(body.input[0].content[1]).toMatchObject({ type: 'input_image', detail: 'high' });
  });
  it.each([{ images: ['https://example.com/image.png'] }, { images: ['data:image/svg+xml;base64,YQ=='] }, { images: Array(3).fill('data:image/png;base64,YQ==') }])('rejects unsupported image input %j', async ({ images }) => {
    await expect(run({ imageDataUrls: images })).rejects.toMatchObject({ status: 400 }); expect(fetch).not.toHaveBeenCalled();
  });
  it.each([404,429,503])('fails over after HTTP %s', async status => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('', { status })).mockResolvedValueOnce(ok());
    await expect(run()).resolves.toMatchObject({ data }); expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('does not retry invalid credentials or expose upstream error bodies', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('fixture-provider-secret', { status: 401 }));
    await expect(run()).rejects.toMatchObject({ status: 502 }); expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('rejects incomplete output and tries the backup', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(ok({ status: 'incomplete' })).mockResolvedValueOnce(ok());
    await expect(run()).resolves.toMatchObject({ data }); expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('stops on refusal without retrying another model', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(ok({ output: [{ type: 'message', content: [{ type: 'refusal' }] }] }));
    await expect(run()).rejects.toMatchObject({ status: 422 }); expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('hedges a stalled request and aborts the losing attempt', async () => {
    vi.useFakeTimers(); let signal: AbortSignal;
    vi.mocked(fetch).mockImplementationOnce((_u, init) => { signal = init?.signal as AbortSignal; return new Promise(() => {}); }).mockResolvedValueOnce(ok());
    const promise = run({ hedgeMs: 50 }); await vi.advanceTimersByTimeAsync(51); await promise; expect(signal!.aborted).toBe(true);
  });
  it('rejects at deadline even if fetch ignores abort', async () => {
    vi.useFakeTimers(); vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));
    const assertion = expect(run({ budgetMs: 100 })).rejects.toMatchObject({ status: 504 }); await vi.advanceTimersByTimeAsync(101); await assertion;
  });
  it('propagates cancellation', async () => {
    const controller = new AbortController(); vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));
    const assertion = expect(run({ signal: controller.signal })).rejects.toMatchObject({ status: 499 }); controller.abort(); await assertion;
  });
});
