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

// 网络标识：小写字母/数字/连字符，2~31 位
function isValidNetworkSlug(value) {
  return /^[a-z0-9][a-z0-9-]{1,30}$/.test(value);
}

// 同一网络内用地址哈希做节点 ID：
// 重复登记同一地址时幂等刷新，不同地址极少概率哈希碰撞也只是覆盖一条记录
function hashAddress(address) {
  let hash = 5381;
  for (let i = 0; i < address.length; i++) {
    hash = ((hash << 5) + hash + address.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
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
    const { network, address, note } = body;

    if (!network || !address) {
      return Response.json(
        { error: 'network and address are required' },
        { status: 400 }
      );
    }

    const networkSlug = String(network).trim().toLowerCase();
    if (!isValidNetworkSlug(networkSlug)) {
      return Response.json(
        { error: 'network must be 2-31 chars of lowercase letters, digits or hyphens' },
        { status: 400 }
      );
    }

    const nodeAddress = String(address).trim().slice(0, 500);
    if (!nodeAddress) {
      return Response.json(
        { error: 'address cannot be empty' },
        { status: 400 }
      );
    }

    const nodeNote = note ? String(note).trim().slice(0, 50) : '';

    const kv = env['user-device'];
    const prefix = `p2p:${networkSlug}:`;
    const nodeId = hashAddress(nodeAddress);
    const key = `${prefix}${nodeId}`;

    // 每网络上限：防止刷接口灌满节点列表（重复地址刷新不占新名额）
    const MAX_NODES_PER_NETWORK = 100;
    const existing = await kv.get(key);
    if (!existing) {
      const listed = await kv.list({ prefix });
      if (listed.keys.length >= MAX_NODES_PER_NETWORK) {
        return Response.json(
          { error: `this network already has ${MAX_NODES_PER_NETWORK} live nodes, try again later` },
          { status: 429 }
        );
      }
    }

    const payload = JSON.stringify({
      network: networkSlug,
      address: nodeAddress,
      note: nodeNote,
      updated_at: Date.now()
    });

    // 7 天有效期：登记是临时存储点，节点需定期重报证明存活
    const SEVEN_DAYS = 7 * 24 * 60 * 60;
    await kv.put(key, payload, { expirationTtl: SEVEN_DAYS });

    return Response.json({ ok: true, network: networkSlug, node_id: nodeId });
  } catch (err) {
    return Response.json(
      { error: err.message || 'internal error' },
      { status: 500 }
    );
  }
}
