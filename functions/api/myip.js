export async function onRequestGet(context) {
  const { request } = context;

  // 边缘网关通常把客户端真实 IP 放在 cf-connecting-ip 请求头中
  // 本地开发或 fallback 时尝试 X-Forwarded-For / X-Real-IP
  const edgeIp = request.headers.get('cf-connecting-ip');
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  let ip = edgeIp || realIp || '';
  if (!ip && forwardedFor) {
    ip = forwardedFor.split(',')[0].trim();
  }
  ip = ip || 'unknown';

  let version = 'unknown';
  if (ip.includes(':')) {
    version = 'IPv6';
  } else if (ip.includes('.')) {
    version = 'IPv4';
  }

  return Response.json({
    ip,
    version,
    user_agent: request.headers.get('user-agent') || ''
  });
}
