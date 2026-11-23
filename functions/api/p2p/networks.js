// 列出当前有存活登记节点的所有 P2P 网络及节点数
export async function onRequestGet(context) {
  const { env } = context;

  try {
    const kv = env['user-device'];
    const counts = new Map();

    // list 结果可能分页（每页最多 1000 个 key），逐页统计
    let cursor;
    do {
      const listed = await kv.list({ prefix: 'p2p:', cursor });
      for (const item of listed.keys) {
        const slug = item.name.split(':')[1];
        if (slug) {
          counts.set(slug, (counts.get(slug) || 0) + 1);
        }
      }
      cursor = listed.list_complete ? undefined : listed.cursor;
    } while (cursor);

    const networks = Array.from(counts.entries())
      .map(([network, count]) => ({ network, count }))
      .sort((a, b) => b.count - a.count || a.network.localeCompare(b.network));

    return Response.json({ networks });
  } catch (err) {
    return Response.json(
      { error: err.message || 'internal error' },
      { status: 500 }
    );
  }
}
