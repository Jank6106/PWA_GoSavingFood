import { NextResponse } from 'next/server';
import { generateOpenAIStructured, OpenAIError } from '../../../../lib/ai/openai';
import { CUSTOMER_SEARCH_PROMPT, CUSTOMER_SEARCH_OPENAI_SCHEMA, createRateLimiter, readSearchQuery, validateCustomerConstraints } from '../../../../lib/ai/customerSearch';

export const maxDuration = 40;
const allowRequest = createRateLimiter();
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

// Compile/warm up without a provider request or disclosing configuration values.
export async function GET() {
  return reply({ configured: Boolean(process.env.OPENAI_API_KEY?.trim()), requiresAuth: true });
}

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return reply({ error: 'Đăng nhập để dùng tìm kiếm AI, hoặc chọn bộ lọc cục bộ.' }, 401);
  let query: string;
  try { query = await readSearchQuery(request); }
  catch { return reply({ error: 'Yêu cầu tìm kiếm không hợp lệ (tối đa 400 ký tự).' }, 400); }

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon || !process.env.OPENAI_API_KEY?.trim()) return reply({ error: 'Máy chủ AI chưa được cấu hình.' }, 503);
  let userId: string;
  try {
    const auth = await fetch(`${url.replace(/\/$/, '')}/auth/v1/user`, {
      headers: { apikey: anon, Authorization: `Bearer ${token}` },
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(5000)]), cache: 'no-store',
    });
    if (!auth.ok) return reply({ error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' }, 401);
    const user = await auth.json();
    if (typeof user?.id !== 'string' || !user.id) return reply({ error: 'Phiên đăng nhập không hợp lệ.' }, 401);
    userId = user.id;
  } catch { return reply({ error: 'Chưa thể xác minh phiên đăng nhập. Vui lòng thử lại.' }, 503); }
  if (!allowRequest(userId)) return reply({ error: 'Bạn tìm kiếm hơi nhanh. Vui lòng chờ một phút.' }, 429);

  try {
    const result = await generateOpenAIStructured({ system: CUSTOMER_SEARCH_PROMPT, query, schema: CUSTOMER_SEARCH_OPENAI_SCHEMA, validate: validateCustomerConstraints, signal: request.signal });
    return reply({ constraints: result.data, model: result.model, warnings: [
      'AI chỉ diễn giải yêu cầu. Thành phần, dị ứng, khẩu vị và khẩu phần cần được cửa hàng xác nhận.',
    ] });
  } catch (error) {
    if (error instanceof OpenAIError) return reply({ error: error.message }, error.status);
    return reply({ error: 'Không thể xử lý tìm kiếm AI. Vui lòng thử lại.' }, 502);
  }
}
