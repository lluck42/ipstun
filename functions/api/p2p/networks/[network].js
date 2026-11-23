// 查询某个 P2P 网络的全部存活入口节点（按更新时间倒序）
export async function onRequestGet(context) {
  const { env, params } = context;
  const network = String(params.network || '').trim().toLowerCase();

  if (!network) {
    return new Response('not found', { status: 404 });
  }

  try {
    const kv = env['user-device'];
    const prefix = `p2p:${network}:`;
    const nodes = [];

    let cursor;
    do {
      const listed = await kv.list({ prefix, cursor });
      const values = await Promise.all(
        listed.keys.map((item) => kv.get(item.name))
      );
      for (const value of values) {
        if (value) {
          nodes.push(JSON.parse(value));
        }
      }
      cursor = listed.list_complete ? undefined : listed.cursor;
    } while (cursor);

    nodes.sort((a, b) => b.updated_at - a.updated_at);

    // 短缓存：降低 KV 读取压力，列表最多延迟 1 分钟可见
    return Response.json(
      { network, count: nodes.length, nodes },
      { headers: { 'Cache-Control': 'public, max-age=60' } }
    );
  } catch (err) {
    return Response.json(
      { error: err.message || 'internal error' },
      { status: 500 }
    );
  }
}
