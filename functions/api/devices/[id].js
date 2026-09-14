export async function onRequestGet(context) {
  const { env, params } = context;
  const deviceId = params.id;

  if (!deviceId) {
    return new Response('not found', { status: 404 });
  }

  const data = await env['user-device'].get(deviceId);

  if (!data) {
    return new Response('not found', { status: 404 });
  }

  return Response.json(JSON.parse(data));
}
