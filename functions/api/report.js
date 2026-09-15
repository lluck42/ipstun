// 简单内存级频率限制（按 IP）
// 注意：边缘函数的运行实例之间不共享内存，
// 所以这不是全局完美的限流，但能挡住普通刷接口行为。
const requestLog = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;

function getClientIp(request) {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function isRateLimited(ip) {
  const now = Date.now();
  const history = requestLog.get(ip) || [];
  const valid = history.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (valid.length >= RATE_LIMIT_MAX_REQUESTS) {
    requestLog.set(ip, valid);
    return true;
  }

  valid.push(now);
  requestLog.set(ip, valid);
  return false;
}

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(clientIp)) {
      return Response.json(
        { error: 'too many requests, please try again later' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { device_key, device_name, ipv6, ipv4 } = body;

    if (!device_key || !device_name || (!ipv6 && !ipv4)) {
      return Response.json(
        { error: 'device_key, device_name and at least one ip (ipv6 or ipv4) are required' },
        { status: 400 }
      );
    }

    const key = String(device_key).trim();
    if (!key) {
      return Response.json(
        { error: 'device_key cannot be empty' },
        { status: 400 }
      );
    }

    if (!isValidUuid(key)) {
      return Response.json(
        { error: 'device_key must be a valid uuid' },
        { status: 400 }
      );
    }

    const name = device_name ? String(device_name).trim().slice(0, 50) : '';

    const kv = env['user-device'];

    const payload = JSON.stringify({
      device_key: key,
      device_name: name,
      ipv6: String(ipv6 || ''),
      ipv4: String(ipv4 || ''),
      updated_at: Date.now()
    });

    // 30 天有效期：设备持续上报会自动刷新，长期未上报则自动清理
    const THIRTY_DAYS = 30 * 24 * 60 * 60;
    await kv.put(key, payload, { expirationTtl: THIRTY_DAYS });

    return Response.json({ ok: true, device_key: key });
  } catch (err) {
    return Response.json(
      { error: err.message || 'internal error' },
      { status: 500 }
    );
  }
}
