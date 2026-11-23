// 浏览器版 libp2p 节点封装入口
// 由 npm run build:p2p-lib 用 esbuild 打包为 lib/libp2p.bundle.min.js
// 页面通过 window.ipstunP2P 调用，避免页面脚本直接接触 libp2p API
import { createLibp2p } from 'libp2p'
import { webSockets } from '@libp2p/websockets'
import { noise } from '@libp2p/noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { identify } from '@libp2p/identify'
import { ping } from '@libp2p/ping'
import { kadDHT } from '@libp2p/kad-dht'
import { generateKeyPair, privateKeyFromProtobuf, privateKeyToProtobuf } from '@libp2p/crypto/keys'
import { multiaddr } from '@multiformats/multiaddr'
import { dns, RecordType } from '@multiformats/dns'
import { dnsJsonOverHttps } from '@multiformats/dns/resolvers'

// IPFS 官方 bootstrap 的 WSS 入口（2026-11 经 dnsaddr 两跳解析核实）
// 官方源：github.com/ipfs/go-ipfs-config bootstrap_peers.go
// 地址失效时重新解析 _dnsaddr.bootstrap.libp2p.io 的 TXT 记录并重建本文件
const OFFICIAL_BOOTSTRAP_WSS = [
  '/dns4/chic-1.bootstrap.ipni.io/tcp/4443/wss/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
  '/dns4/chic-1-b.bootstrap.ipni.io/tcp/4453/wss/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
  '/dns4/lith-1.bootstrap.ipni.io/tcp/4443/wss/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
  '/dns4/sing-1.bootstrap.ipni.io/tcp/4443/wss/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt'
]

// 单次拨号的超时时间，避免某个入口一直不响应时卡住整个加入流程
const DIAL_TIMEOUT_MS = 12 * 1000

// 域名解析：libp2p 默认用 Cloudflare / Google 的 DoH，国内直连不通，
// 所以把阿里 DNS 的 JSON 接口放在第一位（国内可直连且允许跨域），其余作为回退。
// 阿里 DNS 返回的 Question 是对象而非数组，库自带的转换函数处理不了，这里自行转换。
const ALIDNS_JSON_URL = 'https://dns.alidns.com/resolve'
const ALIDNS_TIMEOUT_MS = 4 * 1000

// 给一个可选的外部 signal 叠加超时，返回新的 signal 和清理函数
function withTimeout (signal, ms) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  const onAbort = () => controller.abort()

  if (signal) {
    if (signal.aborted) {
      controller.abort()
    } else {
      signal.addEventListener('abort', onAbort, { once: true })
    }
  }

  return {
    signal: controller.signal,
    done () {
      clearTimeout(timer)
      if (signal) {
        signal.removeEventListener('abort', onAbort)
      }
    }
  }
}

async function alidnsResolver (fqdn, options = {}) {
  const guard = withTimeout(options.signal, ALIDNS_TIMEOUT_MS)

  try {
    const answers = []

    for (const type of options.types ?? [RecordType.A]) {
      const query = new URLSearchParams({ name: fqdn, type: RecordType[type] })
      const response = await fetch(`${ALIDNS_JSON_URL}?${query}`, {
        headers: { accept: 'application/dns-json' },
        signal: guard.signal
      })

      if (!response.ok) {
        throw new Error(`dns query failed: ${response.status}`)
      }

      const result = await response.json()

      for (const answer of result.Answer ?? []) {
        answers.push({
          name: answer.name,
          type: RecordType[answer.type],
          TTL: answer.TTL ?? 60,
          data: answer.data
        })
      }
    }

    return { Status: 0, TC: false, RD: true, RA: true, AD: false, CD: false, Question: [], Answer: answers }
  } finally {
    guard.done()
  }
}

function toBase64 (bytes) {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

function fromBase64 (str) {
  const binary = atob(str)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// 生成新的 Ed25519 节点身份，返回 base64(protobuf 私钥)，页面负责持久化到 localStorage
async function generateKeyBase64 () {
  const key = await generateKeyPair('Ed25519')
  return toBase64(privateKeyToProtobuf(key))
}

// 创建浏览器节点（client 模式：可发起 DHT 查询、发现 peer，不响应服务）
// privateKeyBase64 传入则恢复身份，否则生成临时身份
async function createNode (options = {}) {
  const privateKey = options.privateKeyBase64
    ? privateKeyFromProtobuf(fromBase64(options.privateKeyBase64))
    : undefined

  return createLibp2p({
    ...(privateKey == null ? {} : { privateKey }),
    transports: [webSockets()],
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    // sorter 返回 0 关闭默认的随机排序，保证按列表顺序依次尝试
    dns: dns({
      resolvers: {
        '.': [
          alidnsResolver,
          dnsJsonOverHttps('https://cloudflare-dns.com/dns-query'),
          dnsJsonOverHttps('https://dns.google/resolve')
        ]
      },
      sorter: () => 0
    }),
    services: {
      identify: identify(),
      ping: ping(),
      dht: kadDHT({ clientMode: true })
    }
  })
}

// 拨号一个入口地址。libp2p 的 dial 只接受 multiaddr 对象（传字符串会直接抛错），
// 页面传的是字符串，这里负责转换
async function dial (node, address, timeoutMs = DIAL_TIMEOUT_MS) {
  const guard = withTimeout(undefined, timeoutMs)

  try {
    return await node.dial(multiaddr(address), { signal: guard.signal })
  } finally {
    guard.done()
  }
}

window.ipstunP2P = { createNode, dial, generateKeyBase64, OFFICIAL_BOOTSTRAP_WSS }
