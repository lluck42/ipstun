export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { device_id, ipv6, interface_name, ipv4 } = await request.json();

    if (!device_id || !ipv6) {
      return Response.json(
        { error: 'device_id and ipv6 are required' },
        { status: 400 }
      );
    }

    const payload = JSON.stringify({
      ipv6,
      interface_name: interface_name || '',
      ipv4: ipv4 || '',
      updated_at: Date.now()
    });

    await env.IPSTUN_KV.put(device_id, payload);

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { error: err.message || 'internal error' },
      { status: 500 }
    );
  }
}
