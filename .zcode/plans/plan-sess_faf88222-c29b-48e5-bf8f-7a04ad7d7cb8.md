# p2p.html 新增"加入网络"功能：浏览器即节点（IPFS 主网）

## Context

用户希望 p2p.html 的重点从"静态登记处"升级为"入网门户"：**点击按钮，当前网页就加入 P2P 网络，成为真实成员**。基于前期讨论确认的技术事实：边缘函数无常驻进程当不了节点，但浏览器页面开着时是真常驻，可通过 WSS 加入 libp2p 网络。目标网络为知名的公有网络（IPFS 主网）——用户全程的意图都是"现成网络"，且其早前说的"加入网络后会记录公共节点数据"正好由本功能实现：**浏览器成员自动发现真实在线的 WSS 节点并上报到本站登记处**，形成"越多人加入→节点目录越丰富"的飞轮。

## 总体设计

```
[加入 IPFS 网络] 按钮（点击时才加载 bundle，不拖累首屏）
  → lib/libp2p.bundle.min.js（esbuild 打包的浏览器版 js-libp2p，本地化，qrcode.min.js 惯例）
  → 引导源（两层，闭环）：
      1. 本站登记处 GET /api/p2p/networks/ipfs 已登记的 wss 地址
      2. 官方 /dnsaddr/bootstrap.libp2p.io 列表（bundle 内置，经 DNS-over-HTTPS 解析——浏览器无法直接查 DNS TXT）
  → 浏览器节点加入 IPFS 主网 DHT（clientMode：能查询、能发现、不响应服务）
  → 每 2 分钟从 peerStore 收集新发现的 wss 地址 → 批量 POST /api/p2p/report（network=ipfs）
  → 页面显示：PeerID（复制按钮）、连接状态、已连接 peer 数、本页已上报数
  → 退出按钮 / 关闭页面 → node.stop()
```

## 改动清单

**1. 新增 bundle 构建链（package.json + 新入口源码）**
- devDependencies：`libp2p`、`@libp2p/websockets`、`@libp2p/kad-dht`、`@libp2p/identify`、`@libp2p/noise`、`@chainsafe/libp2p-yamux`、`@chainsafe/dns-over-http-resolver`、`esbuild`
- 新增 `scripts.build:p2p-lib`：esbuild 把 `lib/libp2p-entry.js` 打成 IIFE 单文件 `lib/libp2p.bundle.min.js`，暴露 `window.ipstunP2P.createNode(options)`（thin wrapper，配置在页面侧传入）
- 产物提交进仓库；源码入口和构建脚本也提交，可重复构建
- 官方 bootstrap 列表（dnsaddr 形式，peer ID 从 [go-ipfs-config/bootstrap_peers.go](https://github.com/ipfs/go-ipfs-config/blob/master/bootstrap_peers.go) 核实，不凭记忆写）内置在 wrapper 里

**2. p2p.html 新增"加入网络"section**（放在"网络目录"与"登记入口节点"之间，成为页面重点）
- 说明文案 + `.info-box`（提示：页面需保持打开，关闭即离线；浏览器节点为 client 模式）
- 按钮：`加入 IPFS 网络` / `退出网络`（复用 `btn btn-primary`，参照 index.html monitor 按钮的 start/stop 切换模式）
- 状态区（复用 `.query-result` + `<dl>` + `copyButtonHtml()`）：PeerID、状态徽章（复用 `statusBadgeHtml`）、连接 peer 数、发现/上报计数
- 内联脚本新增独立 IIFE 块：
  - PeerID 密钥持久化 `localStorage`（key `ipstun_p2p_peer_key`，Ed25519），沿用 AGENTS.md 的 localStorage 惯例
  - 点击时动态 `<script>` 注入 bundle（只加载一次）
  - 已上报地址存页面内 `Set` 去重；每批最多 8 个（给 /api/p2p/report 的 10 次/分钟限流留余量，批量间 2 分钟）
  - 只上报含 `/wss` 的 multiaddr（浏览器可达的才有意义）
  - `beforeunload` → `node.stop()`（参照 script.js:686 的 beforeunload 模式）

**3. 后端：零改动**（上报复用 POST /api/p2p/report，引导源复用 GET /api/p2p/networks/:network）

**4. 配套**：changelog.html 追加条目；AGENTS.md 更新（lib/ 新增 bundle 与构建脚本说明、"浏览器即节点"架构注记、localStorage 新 key）

## 关键技术决策

- **纯 libp2p 而非 Helia**：只需要 DHT + peerStore 发现节点，不需要 IPFS 文件层，bundle 小一半
- **kadDHT clientMode**：浏览器不做 DHT 服务端（响应查询），但能发起查询、维护路由表、发现 peer——满足"采集公共节点"目的
- **DoH 解析器**：`@chainsafe/dns-over-http-resolver` 是 js-libp2p 生态处理浏览器 `/dnsaddr/` 的标准做法（社区与 libp2p#94 确认）
- **点击时按需加载**：bundle 预计 400–600KB（gzip 后约 150KB），不影响不用此功能的访客

## 验证

1. `npm install` 装依赖 → `npm run build:p2p-lib` 生成 bundle（确认无报错、体积合理）
2. `npm run dev` 本地起服务，浏览器打开 p2p.html：
   - 未点击时页面加载不受 bundle 影响（首屏正常）
   - 点击"加入 IPFS 网络"→ PeerID 显示且刷新后保持（localStorage）→ 连接 peer 数 > 0（浏览器需能访问 bootstrap.libp2p.io，用户浏览器此前可访问 Cloudflare，预期可行）
   - 等待采集周期后 `GET /api/p2p/networks/ipfs` 出现 wss 真实节点（浏览器端采集闭环验证）
   - 退出按钮 / 关闭页签后连接断开
3. grep 检查 changelog/AGENTS.md 已更新；`node --check` 校验新脚本语法
4. 部署走 `npm run proxy` + `npm run deploy:cn`（代理桥流程已记录在 AGENTS.md）

## 明确不做（本轮）

- 私有圈子网络（PSK/relay）——用户意图是知名公有网络；私有路线若将来要做再单独立项
- 成员间消息/文件传输——先跑通"入网 + 自动采集"主链路
- Windows 小工具集成——未来对接同一 API 即可