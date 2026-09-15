export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { device_key, device_name, ipv6, ipv4 } = body;

    if (!device_key || (!ipv6 && !ipv4)) {
      return Response.json(
        { error: 'device_key and at least one ip (ipv6 or ipv4) are required' },
        { status: 400 }
      );
    }

    const key = device_key.trim();
    if (!key) {
      return Response.json(
        { error: 'device_key cannot be empty' },
        { status: 400 }
      );
    }

    const kv = env['user-device'];

    const payload = JSON.stringify({
      device_key: key,
      device_name: device_name || '',
      ipv6,
      ipv4: ipv4 || '',
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
