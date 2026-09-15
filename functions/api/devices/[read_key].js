export async function onRequestGet(context) {
  const { env, params } = context;
  const readKey = params.read_key;

  if (!readKey) {
    return new Response('not found', { status: 404 });
  }

  const data = await env['user-device'].get(readKey);

  if (!data) {
    return new Response('not found', { status: 404 });
  }

  const record = JSON.parse(data);
  // 永远不向客户端返回 write_key_hash
  const { write_key_hash, ...publicInfo } = record;

  return Response.json(publicInfo);
}
