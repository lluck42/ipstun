# ipstun 扩展：P2P 网络引导节点目录

## Context

ipstun 目前是"个人设备外网 IP 地址簿"（device_key → 最新 IPv6/IPv4）。用户希望把它扩展为**面向现有 P2P 网络（IPFS 等）的开放引导节点登记处**：已入网的节点运维者把入口地址（multiaddr / ip:port / enode 等）登记上来，新成员入网时从本站拉取当前可用的入口地址列表。

用户明确的取舍：
- **不审核**——完全开放的"临时存储点"，只靠限流 + 数量上限 + 短 TTL 兜底
- 服务的是**现存知名网络**，不是自建新网络；网络名单内置常见项 + 允许自定义 slug
- "自动获取公共节点"落在上报端（未来的小工具/脚本从客户端 peer 记录采集再 POST），因为边缘 Functions 没有定时任务；本站提供被动存储 + 查询 API + 手动登记表单

## 存储设计（复用现有 KV 模式）

- Key：`p2p:{network_slug}:{node_id}`，node_id = address 的 djb2 哈希 hex（同地址重复上报 = 幂等刷新 TTL，天然实现"大家共同保活"）
- Value JSON：`{ network, address, note, updated_at }`
- TTL：**7 天**（对齐"临时存储点"定位，比设备的 30 天短，迫使节点定期重报证明存活）
- 查询：`kv.list({ prefix })` + 逐 key `get`（每网络 ≤100 节点，可接受）

## 后端改动（3 个新文件，沿用现有代码风格）

**1. `functions/api/p2p/report.js`** — POST /api/p2p/report
- 请求体 `{ network, address, note? }`
- 校验：network 匹配 `/^[a-z0-9][a-z0-9-]{0,30}$/`；address trim 后 1–500 字符；note 截断 50 字符（沿用 report.js:72 的 device_name 惯例）
- 复制 `functions/api/report.js:1-29` 的内存级限流（10 次/60 秒）
- 每网络上限 100 个存活节点（超限返回 429，已存在地址的刷新不受限）
- `kv.put(key, payload, { expirationTtl: 604800 })`，成功返回 `{ ok: true, network, node_id }`

**2. `functions/api/p2p/networks.js`** — GET /api/p2p/networks
- `list({ prefix: 'p2p:' })` 提取去重网络 slug 及存活节点数，返回 `{ networks: [{ network, count }] }`

**3. `functions/api/p2p/networks/[network].js`** — GET /api/p2p/networks/:network
- 列出该网络全部存活节点，按 updated_at 降序，返回 `{ network, count, nodes: [...] }`
- 加 `Cache-Control: public, max-age=60` 降 KV 读取压力

## 前端改动

**4. 新页面 `p2p.html`**（克隆 devices.html 骨架，导航标签"节点目录"）：
- Hero + 介绍段 + `info-box warning`（社区登记未经审核，注意投毒风险的友好提示）
- **网络目录**：card-grid 展示内置知名网络（IPFS、libp2p 自定义、BitTorrent DHT、Ethereum、Bitcoin、自定义…，含一句说明和官方节点文档链接）+ 各网络当前存活节点数（来自 GET /api/p2p/networks）
- **登记表单**：网络下拉（内置 + 自定义输入）、地址输入、备注（可选）
- **节点列表**：每网络渲染节点卡片（地址 + `copyButtonHtml()` 复制按钮 + "X 分钟前"更新时间，超过 24h 的置灰），并提供一个"全部地址"的 `.code-block`（style.css:312 已有样式、script.js:22-62 已有复制逻辑，目前全站未使用，正好启用）
- **接口说明**：curl 示例（.code-block），供小工具/脚本对接
- 页面内联 IIFE 脚本遵循 devices.html:79-238 模式，复用 `window.ipstunUi`（escapeHtml/copyButtonHtml），fetch 用 `encodeURIComponent`，渲染一律 escapeHtml

**5. 全站导航**：8 个页面（index/devices/how-it-works/download/changelog/about/404 + p2p 自身）的 navbar 都加"节点目录"（AGENTS.md:102 规则）

**6. 配套文件**：
- `sitemap.xml` 加 p2p.html 条目
- `changelog.html` 在 2026-11-23 段落追加本次变更
- `AGENTS.md` 更新目录树、script.js 描述、架构说明（p2p: 前缀键、7 天 TTL、限流与上限）

## 明确不做（本轮）

- 服务端定时抓取官方节点列表（平台无 cron；且避免硬编码易错的官方 peer ID）
- 登记令牌/审核机制（用户已拍板不审核）
- Windows 小工具的自动采集（后续独立任务，届时直接调用本次的 POST API）

## 验证

1. `npm run dev` 启动本地预览（http://localhost:8787）
2. curl 测试：合法/非法 network slug、超长 address、note 截断、重复上报同地址（应刷新而非新增）、限流触发 429、`GET /api/p2p/networks` 与 `/api/p2p/networks/:network` 返回结构
3. 浏览器打开 p2p.html 走通：选网络 → 登记地址 → 列表出现 → 复制按钮/`.code-block` 复制全部地址可用
4. grep 检查 8 个页面导航一致、sitemap/changelog 已更新