# ipstun

一个基于 Cloudflare Pages + Pages Functions 的 IPv6 科普与地址同步小站。

## 介绍

很多家庭宽带其实已经分配了公网 IPv6，但普通用户往往不知道如何查看，更不知道 IPv6 能让每台设备拥有独立可达的地址。ipstun 提供：

- **科普教程**：教你在 Windows、macOS、Linux、手机、路由器上查看自己的 IP 与 IPv6。
- **查看当前公网 IP**：一键检测你当前访问互联网使用的 IP 是 IPv4 还是 IPv6。
- **设备 IP 查询**：通过 device_key 查询已同步设备的最新 IPv6 / IPv4，也支持二维码扫码查询。
- **浏览器端持续同步**：保持首页打开，可每 30 秒自动检测并上报本机 IP（适合临时使用）。
- **IPv6 同步接口**：配合即将发布的小工具，在家宽 IPv6 前缀变动时自动上报最新地址。
- **更新记录**：独立的 changelog 页面，记录每次功能迭代与接口变更。
- **技术原理**：解释本站如何检测公网 IP、IPv6 直连原理以及数据同步机制。

## 软件架构

- 前端：纯 HTML / CSS / 原生 JavaScript，位于仓库根目录。
- 后端：Cloudflare Pages Functions（`functions/`）。
  - `GET /api/myip`：返回访问者当前公网 IP 与协议版本。
  - `POST /api/report`：凭 device_key 上报设备 IP。
  - `GET /api/devices/:device_key`：查询设备最新 IP。
- 数据存储：Cloudflare KV（绑定名 `user-device`），以 device_key（UUID）为 key。

## 安装与运行

1. 安装依赖：
   ```bash
   npm install
   ```
2. 本地开发：
   ```bash
   npm run dev
   ```
3. 部署到 Cloudflare Pages：
   ```bash
   npm run deploy
   ```

部署前请确保 `wrangler.toml` 中的 KV namespace ID 已替换为你自己在 Cloudflare Dashboard 创建的命名空间 ID。

## 使用说明

1. 在首页生成一个 device_key。
2. 方式一（推荐）：将 device_key 配置到同步小软件，小软件会自动上报设备 IPv6 / IPv4。
3. 方式二（临时）：在首页“浏览器端持续同步”区域填写 device_key，保持页面打开即可每 30 秒自动上报。
4. 需要查询时，输入 device_key 或扫描二维码即可查看最新 IP。

## 参与贡献

1. Fork 本仓库
2. 新建 `Feat_xxx` 分支
3. 提交代码
4. 新建 Pull Request
