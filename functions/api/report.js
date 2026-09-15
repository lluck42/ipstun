export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { read_key, write_key, device_name, ipv6, ipv4 } = body;

    if (!read_key || !write_key || !ipv6) {
      return Response.json(
        { error: 'read_key, write_key and ipv6 are required' },
        { status: 400 }
      );
    }

    const key = read_key.trim();
    if (!key) {
      return Response.json(
        { error: 'read_key cannot be empty' },
        { status: 400 }
      );
    }

    const kv = env['user-device'];
    const writeKeyHash = await sha256(write_key);

    const existing = await kv.get(key);
    if (existing) {
      const record = JSON.parse(existing);
      if (record.write_key_hash !== writeKeyHash) {
        return Response.json(
          { error: 'invalid write_key' },
          { status: 403 }
        );
      }
    }

    const payload = JSON.stringify({
      read_key: key,
      device_name: device_name || '',
      ipv6,
      ipv4: ipv4 || '',
      write_key_hash: writeKeyHash,
      updated_at: Date.now()
    });

    await kv.put(key, payload);

    return Response.json({ ok: true, read_key: key });
  } catch (err) {
    return Response.json(
      { error: err.message || 'internal error' },
      { status: 500 }
    );
  }
}

async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
