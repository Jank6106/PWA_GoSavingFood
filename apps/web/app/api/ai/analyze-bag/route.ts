import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  OPENAI_RESPONSE_SCHEMA,
  RESPONSE_SCHEMA,
  SYSTEM_PROMPT,
  buildUserPrompt,
  sanitizeResult,
  type StoreContext,
} from './bagDraft';

/**
 * POST /api/ai/analyze-bag
 *
 * AI Đăng Hàng (Merchant): nhận 1 ảnh món còn dư, trả về bản nháp JSON để điền form tạo túi.
 * - Bắt buộc Supabase JWT (Authorization: Bearer <access_token>) của user SỞ HỮU một cửa hàng.
 * - Không CORS wildcard: Merchant PWA gọi same-origin qua rewrite `/api/*` -> gosavingfood.app.
 * - API key AI chỉ nằm ở server (`OPENAI_API_KEY` và/hoặc `GEMINI_API_KEY`), không bao giờ expose ra client.
 * - Nhà cung cấp chính: `AI_PROVIDER` (openai | gemini); mặc định OpenAI nếu có key. Có cả 2 key thì
 *   nhà cung cấp còn lại tự động làm dự phòng (khác hạ tầng -> demo không chết theo 1 nhà cung cấp).
 * - Route này KHÔNG ghi gì vào DB; chủ quán vẫn phải bấm xác nhận để tạo túi qua luồng cũ.
 */

export const maxDuration = 60;

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // ~3MB base64 payload (client đã nén ~1024px)
const ALLOWED_MIME = /^data:image\/(png|jpe?g|webp);base64,/i;
const HEDGE_DELAY_MS = 5_000; // model chưa trả lời sau 5s -> gọi thêm model dự phòng song song
const TOTAL_AI_BUDGET_MS = 25_000; // tổng thời gian chờ AI cho 1 ảnh
const DEFAULT_GEMINI_MODELS = 'gemini-3.5-flash-lite,gemini-3.8-flash,gemini-3.6-flash';
const DEFAULT_OPENAI_MODEL = 'gpt-6.1-terra'; // đọc ảnh chuẩn nhất khi đo (~3-4s/ảnh, effort=none)
const RATE_LIMIT_PER_MINUTE = 12;

// Rate limit đơn giản theo user trong cùng serverless instance (đủ chống spam khi demo / lỡ tay bấm liên tục)
const rateBuckets = new Map<string, number[]>();
function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const recent = (rateBuckets.get(userId) || []).filter((t) => now - t < 60_000);
  if (recent.length >= RATE_LIMIT_PER_MINUTE) {
    rateBuckets.set(userId, recent);
    return true;
  }
  recent.push(now);
  rateBuckets.set(userId, recent);
  return false;
}

/** Đọc `sub` (user id) từ JWT để tra cửa hàng song song; KHÔNG dùng để xác thực (getUser mới xác thực). */
function readJwtSub(token: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1] || '', 'base64url').toString('utf8'));
    return typeof payload?.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

function jsonError(status: number, error: string) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function POST(request: NextRequest) {
  // 1. Xác thực người gọi (Supabase JWT)
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return jsonError(401, 'Thiếu thông tin đăng nhập.');

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const candidates = getCandidates();
  if (!supabaseUrl || !anonKey || candidates.length === 0) {
    console.error('[AI analyze-bag] missing config:', {
      supabaseUrl: Boolean(supabaseUrl),
      supabaseAnonKey: Boolean(anonKey),
      OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY?.trim()),
      GEMINI_API_KEY: Boolean(process.env.GEMINI_API_KEY?.trim()),
    });
    return jsonError(500, 'Máy chủ AI chưa được cấu hình.');
  }

  const supabaseUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Chạy SONG SONG: đọc ảnh gửi lên + xác thực JWT + tra cửa hàng (theo `sub` trong token).
  // Kết quả tra cửa hàng chỉ được dùng khi getUser() xác nhận đúng user đó -> không nới lỏng bảo mật.
  const t0 = Date.now();
  const claimedUserId = readJwtSub(token);
  const [bodyResult, userResult, storeResult] = await Promise.all([
    request.json().then(
      (value: unknown) => ({ ok: true as const, value }),
      () => ({ ok: false as const, value: undefined })
    ),
    supabaseUser.auth.getUser(token),
    claimedUserId
      ? supabaseUser.from('stores').select('id, name, food_categories').eq('owner_user_id', claimedUserId).limit(1)
      : Promise.resolve({ data: null, error: null }),
  ]);
  const tAuth = Date.now();

  const user = userResult.data?.user;
  if (userResult.error || !user || user.id !== claimedUserId) {
    return jsonError(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
  }

  // 2. Phân quyền: chỉ chủ cửa hàng mới được dùng AI đăng hàng
  const ownedStores = storeResult.data;
  if (storeResult.error || !ownedStores?.length) {
    return jsonError(403, 'Chỉ tài khoản cửa hàng mới dùng được tính năng này.');
  }

  if (isRateLimited(user.id)) {
    return jsonError(429, 'Bạn thao tác hơi nhanh, vui lòng thử lại sau ít giây.');
  }

  // 3. Validate input
  if (!bodyResult.ok) return jsonError(400, 'Dữ liệu gửi lên không hợp lệ.');
  const body = bodyResult.value;
  const rawImage = body && typeof body === 'object' ? (body as { image?: unknown }).image : undefined;
  const image = typeof rawImage === 'string' ? rawImage : '';
  const mimeMatch = image.match(ALLOWED_MIME);
  if (!mimeMatch) return jsonError(400, 'Ảnh phải là JPG, PNG hoặc WebP.');
  if (image.length > MAX_IMAGE_BYTES) return jsonError(413, 'Ảnh quá lớn, vui lòng chụp lại.');
  const mimeType = `image/${mimeMatch[1].toLowerCase() === 'jpg' ? 'jpeg' : mimeMatch[1].toLowerCase()}`;
  const base64Data = image.slice(mimeMatch[0].length);

  // 4. Gọi AI vision (OpenAI / Gemini) với structured output JSON.
  // "Hedged requests": gọi model chính; nếu sau HEDGE_DELAY_MS chưa xong (hoặc lỗi) thì gọi thêm
  // model dự phòng SONG SONG, lấy kết quả đầu tiên thành công -> tránh bị kẹt khi 1 model treo/503.
  const store: StoreContext = { name: ownedStores[0]?.name, foodCategories: ownedStores[0]?.food_categories };
  const result = await raceModels(candidates, mimeType, base64Data, buildUserPrompt(store));
  const tAi = Date.now();
  // Log thời gian từng bước để biết chậm ở đâu (mạng/xác thực hay AI)
  console.info(
    `[AI analyze-bag] timing auth+body=${tAuth - t0}ms ai=${tAi - tAuth}ms total=${tAi - t0}ms ` +
      `img=${Math.round((base64Data.length * 3) / 4 / 1024)}KB result=${result.kind}${result.kind === "ok" ? ` via ${result.model}` : ""}`
  );

  if (result.kind === "ok") {
    const draft = sanitizeResult(result.data);
    if (!draft.isFood) {
      return jsonError(422, "Ảnh này có vẻ không phải đồ ăn/đồ uống. Vui lòng chụp lại món cần đăng.");
    }
    return NextResponse.json({ success: true, data: draft, model: result.model });
  }

  return jsonError(
    result.kind === "timeout" ? 504 : 502,
    result.kind === "timeout"
      ? "AI phản hồi quá lâu, vui lòng thử lại hoặc nhập tay."
      : "AI đang bận, vui lòng thử lại hoặc nhập tay."
  );
}

/** Warm-up nhẹ (không gọi AI, không cần auth): Merchant ping khi mở form để route được biên dịch/khởi động sẵn. */
export async function GET() {
  return NextResponse.json({ ok: true });
}

async function raceModels(
  models: Candidate[],
  mimeType: string,
  base64Data: string,
  userPrompt: string
): Promise<RaceResult> {
  const deadline = Date.now() + TOTAL_AI_BUDGET_MS;
  const controllers: AbortController[] = [];

  return new Promise((resolve) => {
    let next = 0;
    let pending = 0;
    let settled = false;
    let sawTimeout = false;
    let hedgeTimer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();

    const deadProviders = new Set<Provider>(); // key sai/hết quota -> bỏ qua mọi model của provider đó

    const finish = (value: RaceResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(hedgeTimer);
      clearTimeout(deadlineTimer);
      controllers.forEach((c) => c.abort());
      resolve(value);
    };

    const launch = () => {
      if (settled) return;
      while (next < models.length && deadProviders.has(models[next].provider)) next++;
      if (next >= models.length) return;
      const remaining = deadline - Date.now();
      if (remaining < 1_500) return;
      const candidate = models[next++];
      const label = `${candidate.provider}:${candidate.model}`;
      const controller = new AbortController();
      controllers.push(controller);
      pending++;
      clearTimeout(hedgeTimer);
      hedgeTimer = setTimeout(launch, HEDGE_DELAY_MS); // model này chậm -> mở thêm model kế tiếp

      const call = candidate.provider === "openai" ? callOpenAI : callGemini;
      call(candidate.model, candidate.apiKey, mimeType, base64Data, userPrompt, remaining, controller).then((attempt) => {
        pending--;
        if (settled) return;
        if (attempt.kind === "ok") {
          console.info(`[AI analyze-bag] ok via ${label} in ${Date.now() - startedAt}ms`);
          finish({ kind: "ok", data: attempt.data, model: label });
          return;
        }
        if (attempt.kind === "timeout") sawTimeout = true;
        console.warn("[AI analyze-bag] model failed", label, attempt.kind, attempt.detail?.slice(0, 160));
        if (attempt.kind === "fatal") deadProviders.add(candidate.provider); // vd. sai API key -> bỏ provider này
        launch(); // lỗi nhanh (503/404/429) -> chuyển ngay model kế tiếp
        if (pending === 0 && (next >= models.length || deadline - Date.now() < 1_500)) {
          finish({ kind: sawTimeout ? "timeout" : "failed" });
        }
      });
    };

    const deadlineTimer = setTimeout(() => finish({ kind: "timeout" }), TOTAL_AI_BUDGET_MS);
    launch();
  });
}

type Provider = "openai" | "gemini";
type Candidate = { provider: Provider; model: string; apiKey: string };
type RaceResult = { kind: "ok"; data: unknown; model: string } | { kind: "timeout" | "failed" };
type AiAttempt =
  | { kind: "ok"; data: unknown; detail?: string }
  | { kind: "retryable" | "timeout" | "fatal"; detail?: string };

const splitModels = (value: string | undefined) =>
  (value || "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

/** Chuỗi (provider, model) theo thứ tự ưu tiên; provider không có key thì bị bỏ qua. */
function getCandidates(): Candidate[] {
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();

  const openaiModels = Array.from(
    new Set([process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL, ...splitModels(process.env.OPENAI_FALLBACK_MODELS)])
  );
  const geminiModels = Array.from(
    new Set(
      [process.env.GEMINI_MODEL?.trim(), ...splitModels(process.env.GEMINI_FALLBACK_MODELS || DEFAULT_GEMINI_MODELS)].filter(
        (m): m is string => Boolean(m)
      )
    )
  );

  const openai: Candidate[] = openaiKey
    ? openaiModels.map((model) => ({ provider: "openai" as const, model, apiKey: openaiKey }))
    : [];
  const gemini: Candidate[] = geminiKey
    ? geminiModels.map((model) => ({ provider: "gemini" as const, model, apiKey: geminiKey }))
    : [];

  // AI_PROVIDER = danh sách provider được phép dùng, theo thứ tự ưu tiên (mặc định CHỈ "openai").
  // Gemini chỉ được gọi khi ghi rõ, vd AI_PROVIDER=openai,gemini — có GEMINI_API_KEY trong env cũng không tự bật.
  const allowed = splitModels(process.env.AI_PROVIDER || "openai").map((p) => p.toLowerCase());
  const byProvider: Record<Provider, Candidate[]> = { openai, gemini };
  return Array.from(new Set(allowed))
    .filter((p): p is Provider => p === "openai" || p === "gemini")
    .flatMap((p) => byProvider[p]);
}

/** OpenAI Chat Completions + vision + Structured Outputs (strict JSON Schema). */
async function callOpenAI(
  model: string,
  apiKey: string,
  mimeType: string,
  base64Data: string,
  userPrompt: string,
  timeoutMs: number,
  controller: AbortController
): Promise<AiAttempt> {
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const body: Record<string, unknown> = {
      model,
      max_completion_tokens: 2048,
      response_format: {
        type: "json_schema",
        json_schema: { name: "surprise_bag_draft", strict: true, schema: OPENAI_RESPONSE_SCHEMA },
      },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}`, detail: "high" } },
          ],
        },
      ],
    };
    // Mặc định "none" (tắt suy luận): đọc ảnh nhanh gấp ~1.5-2 lần mà kết quả như nhau (đo 2026-11-14).
    // Đặt OPENAI_REASONING_EFFORT=default để không gửi tham số (model không hỗ trợ reasoning).
    const effort = (process.env.OPENAI_REASONING_EFFORT?.trim() || "none").toLowerCase();
    if (effort !== "default") body.reasoning_effort = effort;

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!aiRes.ok) {
      const detail = await aiRes.text().catch(() => "");
      // 401/403: key sai; 429 insufficient_quota: hết credit -> bỏ provider. 404/429 rate/5xx -> thử model khác
      const fatal =
        aiRes.status === 401 || aiRes.status === 403 || (aiRes.status === 429 && /insufficient_quota/i.test(detail));
      return { kind: fatal ? "fatal" : "retryable", detail: `${aiRes.status} ${detail}` };
    }

    const aiJson = await aiRes.json();
    const message = aiJson?.choices?.[0]?.message;
    if (message?.refusal) return { kind: "retryable", detail: `refusal: ${message.refusal}` };
    const content: string | undefined = typeof message?.content === "string" ? message.content.trim() : undefined;
    if (!content) return { kind: "retryable", detail: "empty content" };
    try {
      return { kind: "ok", data: JSON.parse(content) };
    } catch {
      return { kind: "retryable", detail: "invalid JSON" };
    }
  } catch (err: unknown) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return { kind: aborted ? "timeout" : "retryable", detail: aborted ? "timeout" : String(err) };
  } finally {
    clearTimeout(timer);
  }
}

async function callGemini(
  model: string,
  apiKey: string,
  mimeType: string,
  base64Data: string,
  userPrompt: string,
  timeoutMs: number,
  controller: AbortController
): Promise<AiAttempt> {
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const aiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        signal: controller.signal,
        headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [
            {
              role: "user",
              parts: [
                { inline_data: { mime_type: mimeType, data: base64Data } },
                { text: userPrompt },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
            temperature: 0.5,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!aiRes.ok) {
      const detail = await aiRes.text().catch(() => "");
      // 400/401/403 do key/cấu hình -> dừng; 404 (model không có), 429, 5xx -> thử model khác
      const fatal = aiRes.status === 401 || aiRes.status === 403 || (aiRes.status === 400 && /API_KEY/i.test(detail));
      return { kind: fatal ? "fatal" : "retryable", detail: `${aiRes.status} ${detail}` };
    }

    const aiJson = await aiRes.json();
    const content: string | undefined = aiJson?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p?.text || "")
      .join("")
      .trim();
    if (!content) return { kind: "retryable", detail: "empty content" };
    try {
      return { kind: "ok", data: JSON.parse(content) };
    } catch {
      return { kind: "retryable", detail: "invalid JSON" };
    }
  } catch (err: unknown) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return { kind: aborted ? "timeout" : "retryable", detail: aborted ? "timeout" : String(err) };
  } finally {
    clearTimeout(timer);
  }
}
