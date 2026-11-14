import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { RESPONSE_SCHEMA, SYSTEM_PROMPT, buildUserPrompt, sanitizeResult, type StoreContext } from './bagDraft';

/**
 * POST /api/ai/analyze-bag
 *
 * AI Đăng Hàng (Merchant): nhận 1 ảnh món còn dư, trả về bản nháp JSON để điền form tạo túi.
 * - Bắt buộc Supabase JWT (Authorization: Bearer <access_token>) của user SỞ HỮU một cửa hàng.
 * - Không CORS wildcard: Merchant PWA gọi same-origin qua rewrite `/api/*` -> gosavingfood.app.
 * - API key AI chỉ nằm ở server (`GEMINI_API_KEY`, Google AI Studio), không bao giờ expose ra client.
 * - Route này KHÔNG ghi gì vào DB; chủ quán vẫn phải bấm xác nhận để tạo túi qua luồng cũ.
 */

export const maxDuration = 60;

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // ~3MB base64 payload (client đã nén ~1024px)
const ALLOWED_MIME = /^data:image\/(png|jpe?g|webp);base64,/i;
const HEDGE_DELAY_MS = 5_000; // model chưa trả lời sau 5s -> gọi thêm model dự phòng song song
const TOTAL_AI_BUDGET_MS = 25_000; // tổng thời gian chờ AI cho 1 ảnh
const DEFAULT_FALLBACK_MODELS = 'gemini-3.5-flash-lite,gemini-3.8-flash,gemini-3.6-flash';
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
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!supabaseUrl || !anonKey || !geminiKey) {
    return jsonError(500, 'Máy chủ AI chưa được cấu hình.');
  }

  const supabaseUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await supabaseUser.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return jsonError(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');

  // 2. Phân quyền: chỉ chủ cửa hàng mới được dùng AI đăng hàng
  const { data: ownedStores, error: storeError } = await supabaseUser
    .from('stores')
    .select('id, name, food_categories')
    .eq('owner_user_id', user.id)
    .limit(1);
  if (storeError || !ownedStores?.length) {
    return jsonError(403, 'Chỉ tài khoản cửa hàng mới dùng được tính năng này.');
  }

  if (isRateLimited(user.id)) {
    return jsonError(429, 'Bạn thao tác hơi nhanh, vui lòng thử lại sau ít giây.');
  }

  // 3. Validate input
  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'Dữ liệu gửi lên không hợp lệ.');
  }
  const image = typeof body?.image === 'string' ? body.image : '';
  const mimeMatch = image.match(ALLOWED_MIME);
  if (!mimeMatch) return jsonError(400, 'Ảnh phải là JPG, PNG hoặc WebP.');
  if (image.length > MAX_IMAGE_BYTES) return jsonError(413, 'Ảnh quá lớn, vui lòng chụp lại.');
  const mimeType = `image/${mimeMatch[1].toLowerCase() === 'jpg' ? 'jpeg' : mimeMatch[1].toLowerCase()}`;
  const base64Data = image.slice(mimeMatch[0].length);

  // 4. Gọi Gemini (Google AI Studio) vision với structured output JSON.
  // "Hedged requests": gọi model chính; nếu sau HEDGE_DELAY_MS chưa xong (hoặc lỗi) thì gọi thêm
  // model dự phòng SONG SONG, lấy kết quả đầu tiên thành công -> tránh bị kẹt khi 1 model treo/503.
  const store: StoreContext = { name: ownedStores[0]?.name, foodCategories: ownedStores[0]?.food_categories };
  const result = await raceModels(getModelChain(), geminiKey, mimeType, base64Data, buildUserPrompt(store));

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
  models: string[],
  apiKey: string,
  mimeType: string,
  base64Data: string,
  userPrompt: string
): Promise<{ kind: "ok"; data: unknown; model: string } | { kind: "timeout" | "failed" }> {
  const deadline = Date.now() + TOTAL_AI_BUDGET_MS;
  const controllers: AbortController[] = [];

  return new Promise((resolve) => {
    let next = 0;
    let pending = 0;
    let settled = false;
    let sawTimeout = false;
    let hedgeTimer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();

    const finish = (value: { kind: "ok"; data: unknown; model: string } | { kind: "timeout" | "failed" }) => {
      if (settled) return;
      settled = true;
      clearTimeout(hedgeTimer);
      clearTimeout(deadlineTimer);
      controllers.forEach((c) => c.abort());
      resolve(value);
    };

    const launch = () => {
      if (settled || next >= models.length) return;
      const remaining = deadline - Date.now();
      if (remaining < 1_500) return;
      const model = models[next++];
      const controller = new AbortController();
      controllers.push(controller);
      pending++;
      clearTimeout(hedgeTimer);
      hedgeTimer = setTimeout(launch, HEDGE_DELAY_MS); // model này chậm -> mở thêm model kế tiếp

      callGemini(model, apiKey, mimeType, base64Data, userPrompt, remaining, controller).then((attempt) => {
        pending--;
        if (settled) return;
        if (attempt.kind === "ok") {
          console.info(`[AI analyze-bag] ok via ${model} in ${Date.now() - startedAt}ms`);
          finish({ kind: "ok", data: attempt.data, model });
          return;
        }
        if (attempt.kind === "timeout") sawTimeout = true;
        console.warn("[AI analyze-bag] model failed", model, attempt.kind, attempt.detail?.slice(0, 160));
        if (attempt.kind === "fatal") return finish({ kind: "failed" }); // vd. sai API key
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

type GeminiAttempt =
  | { kind: "ok"; data: unknown; detail?: string }
  | { kind: "retryable" | "timeout" | "fatal"; detail?: string };

function getModelChain(): string[] {
  const primary = process.env.GEMINI_MODEL?.trim();
  const fallbacks = (process.env.GEMINI_FALLBACK_MODELS || DEFAULT_FALLBACK_MODELS)
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return Array.from(new Set([primary, ...fallbacks].filter((m): m is string => Boolean(m))));
}

async function callGemini(
  model: string,
  apiKey: string,
  mimeType: string,
  base64Data: string,
  userPrompt: string,
  timeoutMs: number,
  controller: AbortController
): Promise<GeminiAttempt> {
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
