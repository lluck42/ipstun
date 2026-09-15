export async function onRequestGet(context) {
  const { env, params } = context;
  const deviceKey = params.device_key;

  if (!deviceKey) {
    return new Response('not found', { status: 404 });
  }

  const data = await env['user-device'].get(deviceKey);

  if (!data) {
    return new Response('not found', { status: 404 });
  }

  return Response.json(JSON.parse(data));
}
