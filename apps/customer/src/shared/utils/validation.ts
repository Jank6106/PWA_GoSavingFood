/**
 * Tiện ích validation và chuẩn hóa thông tin đăng nhập, xác thực
 * Tuân thủ quy chuẩn số điện thoại Việt Nam và Email RFC 5322
 */

// Regex kiểm tra số điện thoại di động Việt Nam (10 số, đầu số 03, 05, 07, 08, 09)
const VIETNAM_PHONE_GENERAL_REGEX = /^0(3|5|7|8|9)[0-9]{8}$/;

// Regex kiểm tra Email RFC 5322 đơn giản hóa, yêu cầu tên miền có đuôi ít nhất 2 ký tự
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export interface NormalizedIdentifier {
  type: 'email' | 'phone' | 'invalid';
  raw: string;
  normalized: string;
  phoneE164?: string;
  phoneNational?: string;
  syntheticEmail?: string;
  errorMessage?: string;
}

/**
 * Làm sạch chuỗi số điện thoại thô (bỏ khoảng trắng, dấu gạch nối, dấu ngoặc, dấu chấm)
 */
export function cleanPhoneNumber(raw: string): string {
  let cleaned = raw.trim().replace(/[\s\-_().]/g, '');
  if (cleaned.startsWith('+84')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('84') && cleaned.length >= 11) {
    cleaned = '0' + cleaned.slice(2);
  }
  return cleaned;
}

/**
 * Kiểm tra xem chuỗi có phải số điện thoại di động Việt Nam hợp lệ
 */
export function isValidVietnamesePhone(raw: string): boolean {
  const cleaned = cleanPhoneNumber(raw);
  return VIETNAM_PHONE_GENERAL_REGEX.test(cleaned);
}

export interface RecipientPhoneValidationResult {
  isValid: boolean;
  cleaned: string;
  digitsCount: number;
  errorMessage?: string;
}

/**
 * Kiểm tra chi tiết số điện thoại người nhận hàng
 * Đảm bảo đúng định dạng và đủ số lượng chữ số (đúng 10 số, đầu 03, 05, 07, 08, 09)
 */
export function validateRecipientPhone(raw: string): RecipientPhoneValidationResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      isValid: false,
      cleaned: '',
      digitsCount: 0,
      errorMessage: 'Vui lòng nhập số điện thoại người nhận.',
    };
  }

  const cleaned = cleanPhoneNumber(trimmed);
  const digitsOnly = cleaned.replace(/\D/g, '');
  const digitsCount = digitsOnly.length;

  if (!digitsOnly.startsWith('0')) {
    return {
      isValid: false,
      cleaned,
      digitsCount,
      errorMessage: 'Số điện thoại phải bắt đầu bằng số 0 (hoặc +84).',
    };
  }

  if (digitsCount < 10) {
    return {
      isValid: false,
      cleaned,
      digitsCount,
      errorMessage: `Số điện thoại chưa đủ (cần đủ 10 số, hiện có ${digitsCount}/10 số).`,
    };
  }

  if (digitsCount > 10) {
    return {
      isValid: false,
      cleaned,
      digitsCount,
      errorMessage: 'Số điện thoại quá dài (số di động Việt Nam chỉ có 10 chữ số).',
    };
  }

  if (!VIETNAM_PHONE_GENERAL_REGEX.test(cleaned)) {
    return {
      isValid: false,
      cleaned,
      digitsCount,
      errorMessage: 'Đầu số không hợp lệ. Phải bắt đầu bằng 03, 05, 07, 08 hoặc 09.',
    };
  }

  return {
    isValid: true,
    cleaned,
    digitsCount: 10,
  };
}

/**
 * Kiểm tra xem chuỗi có phải Email hợp lệ
 */
export function isValidEmail(raw: string): boolean {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.length < 5 || trimmed.length > 254) return false;
  if (!EMAIL_REGEX.test(trimmed)) return false;
  // Đảm bảo phần domain có dấu chấm và đuôi tên miền hợp lệ
  const parts = trimmed.split('@');
  if (parts.length !== 2) return false;
  const domain = parts[1];
  const domainParts = domain.split('.');
  const tld = domainParts[domainParts.length - 1];
  return tld.length >= 2;
}

/**
 * Phân tích và phát hiện loại định danh (Email hoặc Số điện thoại Việt Nam)
 * Ngăn chặn triệt để số lung tung như '123', 'abc', chuỗi bừa bãi
 */
export function parseIdentifier(raw: string): NormalizedIdentifier {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      type: 'invalid',
      raw,
      normalized: '',
      errorMessage: 'Vui lòng nhập email hoặc số điện thoại.',
    };
  }

  // Trường hợp có ký tự '@' -> Coi là Email
  if (trimmed.includes('@')) {
    if (isValidEmail(trimmed)) {
      return {
        type: 'email',
        raw,
        normalized: trimmed.toLowerCase(),
      };
    }
    return {
      type: 'invalid',
      raw,
      normalized: trimmed,
      errorMessage: 'Địa chỉ email không đúng định dạng (ví dụ: ten@domain.com).',
    };
  }

  // Trường hợp chỉ chứa chữ số hoặc tiền tố điện thoại (+84, 0...)
  const isDigitLike = /^[+0-9\s\-_.()]+$/.test(trimmed);
  if (isDigitLike) {
    const cleaned = cleanPhoneNumber(trimmed);
    if (isValidVietnamesePhone(trimmed)) {
      const phoneNational = cleaned; // ví dụ: 0912345678
      const phoneE164 = `+84${cleaned.slice(1)}`; // ví dụ: +84912345678
      const syntheticEmail = `phone_84${cleaned.slice(1)}@gosavingfood.vn`;

      return {
        type: 'phone',
        raw,
        normalized: phoneNational,
        phoneNational,
        phoneE164,
        syntheticEmail,
      };
    }

    if (cleaned.length < 10) {
      return {
        type: 'invalid',
        raw,
        normalized: trimmed,
        errorMessage: 'Số điện thoại quá ngắn (cần đủ 10 chữ số, ví dụ: 0912345678).',
      };
    }

    if (cleaned.length > 10) {
      return {
        type: 'invalid',
        raw,
        normalized: trimmed,
        errorMessage: 'Số điện thoại quá dài (số điện thoại di động Việt Nam chỉ có 10 chữ số).',
      };
    }

    return {
      type: 'invalid',
      raw,
      normalized: trimmed,
      errorMessage:
        'Đầu số điện thoại không hợp lệ. Số điện thoại di động Việt Nam phải bắt đầu bằng 03, 05, 07, 08 hoặc 09.',
    };
  }

  return {
    type: 'invalid',
    raw,
    normalized: trimmed,
    errorMessage: 'Vui lòng nhập địa chỉ email hợp lệ hoặc số điện thoại 10 chữ số.',
  };
}

/**
 * Đánh giá độ mạnh mật khẩu
 */
export interface PasswordStrength {
  score: number; // 0 (rất yếu) đến 4 (rất mạnh)
  level: 'too_short' | 'weak' | 'fair' | 'good' | 'strong';
  feedback: string;
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  if (!password || password.length < 6) {
    return {
      score: 0,
      level: 'too_short',
      feedback: 'Mật khẩu phải có ít nhất 6 ký tự.',
    };
  }

  let score = 1;
  const hasLetters = /[a-zA-Z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const isLong = password.length >= 8;

  if (hasLetters && hasNumbers) score += 1;
  if (isLong) score += 1;
  if (hasSpecial) score += 1;

  switch (score) {
    case 1:
      return { score: 1, level: 'weak', feedback: 'Mật khẩu yếu. Nên kết hợp chữ và số.' };
    case 2:
      return { score: 2, level: 'fair', feedback: 'Mật khẩu trung bình.' };
    case 3:
      return { score: 3, level: 'good', feedback: 'Mật khẩu khá an toàn.' };
    case 4:
    default:
      return { score: 4, level: 'strong', feedback: 'Mật khẩu rất mạnh.' };
  }
}

/**
 * Chuyển đổi mã lỗi Supabase Auth sang thông báo tiếng Việt thân thiện
 */
export function mapSupabaseAuthError(error: any): string {
  if (!error) return 'Đã xảy ra lỗi không xác định.';
  const msg = typeof error === 'string' ? error : error.message || '';
  const code = error.code || '';

  // Quá giới hạn gửi (Rate Limiting)
  if (
    code === 'over_email_send_rate_limit' ||
    msg.includes('over_email_send_rate_limit') ||
    msg.includes('rate limit') ||
    msg.includes('Email rate limit exceeded')
  ) {
    return 'Hệ thống đang giới hạn tần suất gửi email để bảo vệ an toàn. Vui lòng đợi 60 giây trước khi thử lại.';
  }

  // Sai thông tin đăng nhập
  if (
    code === 'invalid_credentials' ||
    msg.includes('Invalid login credentials') ||
    msg.includes('invalid_grant')
  ) {
    return 'Email/Số điện thoại hoặc mật khẩu không chính xác.';
  }

  // Tài khoản đã tồn tại
  if (
    code === 'user_already_exists' ||
    msg.includes('User already registered') ||
    msg.includes('already registered')
  ) {
    return 'Tài khoản này đã tồn tại trên hệ thống. Vui lòng chuyển sang Đăng nhập.';
  }

  // Mã OTP không đúng hoặc hết hạn
  if (
    code === 'otp_expired' ||
    msg.includes('Token has expired') ||
    msg.includes('invalid token') ||
    msg.includes('Invalid OTP')
  ) {
    return 'Mã OTP không chính xác hoặc đã hết hạn. Vui lòng kiểm tra lại hòm thư hoặc yêu cầu mã mới.';
  }

  // Mật khẩu quá ngắn
  if (msg.includes('Password should be at least')) {
    return 'Mật khẩu phải có ít nhất 6 ký tự.';
  }

  // Email chưa xác thực
  if (msg.includes('Email not confirmed')) {
    return 'Email chưa được xác thực. Vui lòng kiểm tra hộp thư đến (hoặc hòm thư Spam) để xác nhận.';
  }

  return msg || 'Thao tác xác thực không thành công. Vui lòng thử lại sau.';
}
