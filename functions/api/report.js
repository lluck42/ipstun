export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { device_key, device_name, ipv6, ipv4 } = body;

    if (!device_key || !ipv6) {
      return Response.json(
        { error: 'device_key and ipv6 are required' },
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

    await kv.put(key, payload);

    return Response.json({ ok: true, device_key: key });
  } catch (err) {
    return Response.json(
      { error: err.message || 'internal error' },
      { status: 500 }
    );
  }
}
