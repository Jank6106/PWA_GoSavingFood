import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateStructured, getModelChain } from '../apps/web/lib/ai/gemini';
import { createRateLimiter, readSearchQuery, validateCustomerConstraints } from '../apps/web/lib/ai/customerSearch';
import { GET, POST } from '../apps/web/app/api/ai/customer-search/route';
import { validateServerConstraints } from '../apps/customer/src/services/customer-finder.service';

const constraints = { maxBudget: 100000, people: 2, category: 'bakery', area: null, pickupBefore: '20:00', preferences: ['không cay'] };
const response = (data: unknown = constraints) => Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(data) }] } }] });
const request = (body: unknown, token = 'fixture-session') => new Request('http://localhost/api/ai/customer-search', {
  method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: JSON.stringify(body),
});
const generate = (extra = {}) => generateStructured({ system: 'system', query: '2 người dưới 100k', schema: {}, validate: validateCustomerConstraints, ...extra });

beforeEach(() => {
  vi.stubEnv('OPENAI_API_KEY', 'fixture-openai-key');
  vi.stubEnv('OPENAI_MODEL', 'gpt-primary');
  vi.stubEnv('OPENAI_FALLBACK_MODELS', '');
  vi.stubEnv('GEMINI_API_KEY', 'fixture-key');
  vi.stubEnv('GEMINI_MODEL', 'gemini-primary');
  vi.stubEnv('GEMINI_FALLBACK_MODELS', 'gemini-fallback');
  vi.stubEnv('SUPABASE_URL', 'https://auth.example.test');
  vi.stubEnv('SUPABASE_ANON_KEY', 'fixture-anon');
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Unexpected mocked fetch')));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('Customer AI contract and input boundaries', () => {
  it('round-trips the server shape through the existing client validator', () => {
    const parsed = validateCustomerConstraints(constraints);
    expect(validateServerConstraints({ constraints: parsed })).toEqual(parsed);
  });
  it.each([
    { people: 0 }, { people: 1.5 }, { people: 21 }, { maxBudget: -1 }, { maxBudget: Infinity },
    { category: 'invented' }, { area: 1 }, { area: ' ' }, { pickupBefore: '25:10' },
    { preferences: [12] }, { preferences: Array(9).fill('x') }, { fabricatedBags: [] },
  ])('rejects invalid/unexpected provider fields %j', (change) => {
    expect(() => validateCustomerConstraints({ ...constraints, ...change })).toThrow();
  });
  it('rejects incomplete output instead of widening the search', () => {
    expect(() => validateCustomerConstraints({ people: 2 })).toThrow();
  });
  it('accepts a 400-character Vietnamese query', async () => {
    expect(await readSearchQuery(request({ query: 'á'.repeat(400) }))).toHaveLength(400);
  });
  it.each([{ query: '' }, { query: 'x'.repeat(401) }, {}, [], null])('rejects malformed input %j', async body => {
    await expect(readSearchQuery(request(body))).rejects.toThrow();
  });
  it('bounds streamed request bytes before JSON decoding', async () => {
    await expect(readSearchQuery(request({ query: 'x', extra: 'x'.repeat(5000) }))).rejects.toThrow(/lớn/);
  });
  it('expires quota buckets and keeps user limits separate', () => {
    const allow = createRateLimiter(2, 100);
    expect(allow('a', 0)).toBe(true); expect(allow('a', 1)).toBe(true);
    expect(allow('a', 2)).toBe(false); expect(allow('b', 2)).toBe(true);
    expect(allow('a', 101)).toBe(true);
  });
});

describe('Gemini transport adapted from Hanh', () => {
  it('deduplicates and bounds the model chain', () => {
    vi.stubEnv('GEMINI_FALLBACK_MODELS', 'gemini-primary,bad/url,gemini-two,gemini-three,gemini-four');
    expect(getModelChain()).toEqual(['gemini-primary', 'gemini-two', 'gemini-three']);
  });
  it('requires a server key without making a request', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    await expect(generate()).rejects.toMatchObject({ status: 503 });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('uses header authentication and structured output, returning real model provenance', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response());
    expect(await generate()).toEqual({ data: constraints, model: 'gemini-primary' });
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).not.toContain('fixture-key');
    expect(init?.headers).toMatchObject({ 'x-goog-api-key': 'fixture-key' });
    expect(JSON.parse(init?.body as string).generationConfig.responseMimeType).toBe('application/json');
  });
  it('falls back on upstream errors or rejected model output', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({ people: 2 })).mockResolvedValueOnce(response());
    expect((await generate()).model).toBe('gemini-fallback');
  });
  it('does not return provider bodies containing secrets', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('fixture-secret-detail', { status: 403 }));
    await expect(generate()).rejects.toMatchObject({ status: 502 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('launches a hedge for a stalled model and aborts the losing request', async () => {
    vi.useFakeTimers();
    let losingSignal: AbortSignal | undefined;
    vi.mocked(fetch).mockImplementationOnce((_url, init) => {
      losingSignal = init?.signal as AbortSignal;
      return new Promise(() => {});
    }).mockResolvedValueOnce(response());
    const promise = generate({ hedgeMs: 50 });
    await vi.advanceTimersByTimeAsync(51);
    expect((await promise).model).toBe('gemini-fallback');
    expect(losingSignal?.aborted).toBe(true);
  });
  it('enforces a deadline even when fetch ignores abort', async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));
    const assertion = expect(generate({ budgetMs: 100 })).rejects.toMatchObject({ status: 504 });
    await vi.advanceTimersByTimeAsync(101);
    await assertion;
  });
  it('propagates caller cancellation', async () => {
    const controller = new AbortController();
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));
    const assertion = expect(generate({ signal: controller.signal })).rejects.toMatchObject({ status: 499 });
    controller.abort();
    await assertion;
  });
});

describe('Customer AI route authorization', () => {
  it('warms up without a billable provider request', async () => {
    expect(await (await GET()).json()).toEqual({ configured: true, requiresAuth: true });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects anonymous callers without a provider request', async () => {
    expect((await POST(request({ query: 'bánh 100k' }, ''))).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects invalid input before external requests', async () => {
    expect((await POST(request({ query: 'x'.repeat(401) }))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects invalid JWTs before a provider request', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('', { status: 401 }));
    expect((await POST(request({ query: 'bánh 100k' }))).status).toBe(401);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('/auth/v1/user');
  });
  it('returns only normalized constraints for an authenticated caller', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ id: 'fixture-customer' })).mockResolvedValueOnce(Response.json({
      status: 'completed', model: 'gpt-primary', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(constraints) }] }],
    }));
    const res = await POST(request({ query: 'bánh 100k' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(validateServerConstraints(data)).toEqual(constraints);
    expect(data.model).toBe('gpt-primary');
    expect(data.results).toBeUndefined(); expect(data.bags).toBeUndefined();
    expect(res.headers.get('cache-control')).toBe('no-store');
  });
});
