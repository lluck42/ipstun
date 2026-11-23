# ipstun 项目指南

## 项目概述

`ipstun` 是一个基于边缘网络 Pages + Functions 的多设备外网 IP 实时同步小站。前端提供本机 IP 检测、设备 IP 同步与查询、二维码分享，后端通过分布式键值存储（KV）存储每个设备最新的 IPv6 / IPv4 地址。小工具计划解决“家宽 IPv6 前缀动态变化”的问题：实时监测本机 IPv6 并上报到本站后端，让外网设备始终能通过本站查询到最新地址。站点前端由纯 HTML / CSS / JavaScript 编写，后端由边缘网络 Functions 提供。

- 项目名称：ipstun
- 仓库远程：`origin` → Gitee（`git@gitee.com:lluck42/ipstun.git`），`github` → GitHub（`git@github.com:lluck42/ipstun.git`）
- 线上域名：`https://www.ipstun.cn/`（见 `sitemap.xml`、`robots.txt`）
- 许可证：MIT License（Copyright (c) 2026 lluck42）
- 当前分支：`master`

## 当前仓库内容

```
.
├── index.html                        # 站点首页：主推公网 IP 检测 + 设备 IP 同步
├── devices.html                      # 我的设备页：管理本地保存的设备并查询其最新 IPv6 / IPv4
├── p2p.html                          # 节点目录页：为现有 P2P 网络登记/查询入口节点（交互在页面内联脚本中）
├── how-it-works.html                 # 技术原理页：解释 IP 检测与 IPv6 直连原理
├── download.html                     # 相关软件页：推荐与公网 IP 配合使用的远程桌面、SSH、文件同步等工具
├── changelog.html                    # 更新记录页
├── about.html                        # 关于页：项目介绍、技术栈、隐私说明与开源反馈
├── 404.html                          # 自定义 404 页（noindex）
├── favicon.svg                       # 站点图标
├── robots.txt                        # 屏蔽 /api/，声明 sitemap
├── sitemap.xml                       # 站点地图（线上域名 www.ipstun.cn）
├── baidu_verify_*.html               # 百度收录验证文件（勿删、勿改名）
├── style.css                         # 站点共用样式
├── script.js                         # 导航、公网 IP 检测、设备上报/查询、localStorage 设备管理、浏览器端持续同步与百度统计
├── images/                           # 静态图片目录（当前为空，仅含 .gitkeep 占位）
├── lib/                              # 本地化的第三方 JS 库（当前为 qrcode.min.js）
├── functions/                        # 边缘网络 Functions（后端接口）
│   └── api/
│       ├── myip.js                   # GET /api/myip：返回访问者当前公网 IP 与协议版本
│       ├── report.js                 # POST /api/report：凭 device_key 上报 IPv6
│       ├── devices/
│       │   └── [device_key].js       # GET /api/devices/:device_key：查询设备最新 IP
│       └── p2p/
│           ├── report.js             # POST /api/p2p/report：登记 P2P 网络入口节点（7 天 TTL、限流、每网络 100 上限）
│           ├── networks.js           # GET /api/p2p/networks：列出有存活节点的网络及数量
│           └── networks/
│               └── [network].js      # GET /api/p2p/networks/:network：查询网络全部存活节点（60s 边缘缓存）
├── wrangler.toml                     # 边缘网络部署与 KV 绑定配置
├── package.json                      # 开发依赖与部署脚本
├── .gitignore                        # Git 忽略规则（含 package-lock.json）
├── LICENSE                           # MIT 许可证
├── README.en.md                      # 英文版 README（仍为模板占位内容）
└── README.md                         # 中文版 README（已描述功能、架构与运行方式）
```

`README.md` 已包含实际的项目介绍、软件架构与安装运行说明；`README.en.md` 仍为模板占位文本。网站页面已具备实际内容，相关软件推荐页与“我的设备”页已上线，Windows 自动同步小工具尚未开发完成。

## 技术栈与架构

当前站点为边缘网络 Pages + Functions 全栈应用。

- 前端：HTML5、CSS3、原生 JavaScript（ES6），位于仓库根目录
- 后端：边缘网络 Functions（基于 Serverless 运行时的服务端函数），位于 `functions/`
- 数据存储：分布式键值存储 KV（绑定变量名为 `user-device`），用于存储每个设备最新的 IPv6 地址。每个设备用 **device_key（UUID）** 作为 KV key，value 中保存设备名、IPv6/IPv4 和更新时间
- P2P 节点目录：与设备记录共用同一 KV，key 为 `p2p:{网络slug}:{地址哈希}` 前缀键，value 为 `{network, address, note, updated_at}`，TTL 7 天；同一地址重复登记会幂等刷新有效期。设备记录是裸 UUID key，靠 `p2p:` 前缀区分，互不冲突
- 前端本地数据：设备列表与 device_key 持久化在浏览器 `localStorage` 中，监听状态通过 `BroadcastChannel` 跨页面同步（导航栏圆点指示器）。新增页面如需共享设备数据请沿用这两个机制，不要再造存储
- 部署平台：边缘网络 Pages（静态资源 + Functions 一起部署）
- 本地开发：`wrangler pages dev .`
- 小工具：计划为 Windows 桌面程序，核心功能是“IPv6 地址监测 + 上报到本站后端”。技术栈待定（如 C# / Python / Go 等），开发完成后会把可执行文件或下载链接放到 `releases/`、`download/` 或独立页面，并在站点导航中更新入口。

## 构建与运行

### 本地开发

1. 安装依赖（首次）：
   ```bash
   npm install
   ```
2. 本地预览（含 Functions 接口）：
   ```bash
   npm run dev
   ```
   默认打开 `http://localhost:8787`。

### 部署到边缘网络 Pages

1. 确保已在服务商控制台创建 KV 命名空间，并把 ID 填入 `wrangler.toml`。
2. 执行：
   ```bash
   npm run deploy
   ```
3. 部署成功后，静态页面和 `/api/*` 接口会同时上线。

> 注意：`wrangler.toml` 中已填入真实的 KV namespace ID，部署前无需再替换。代码中通过 `env['user-device']` 访问 KV，因此边缘网络 Pages 里的 KV binding 名称也必须是 `user-device`。KV namespace ID 本身不是敏感信息，但不要把生产 API Token 写入仓库。

后续如果开发了 Windows 小工具，建议把二进制文件或压缩包放到仓库的 `releases/` 或 `download/` 目录，并在站点中更新下载入口；`download.html` 目前用作相关软件推荐页。

## 测试策略

静态网站目前以手动预览为主，没有自动化测试。后续如果引入 JavaScript 工具函数或 Windows 小工具，再补充对应测试：

- 前端：可使用 Playwright 或简单的链接检查脚本验证页面可访问性。
- 小工具：根据最终技术栈选择单元测试框架（如 .NET 的 xUnit、Python 的 pytest、Go 的 testing 等）。

## 代码风格与开发约定

静态站点部分：

- 使用语义化 HTML5 标签（`nav`、`header`、`main`、`section`、`footer` 等）。
- CSS 使用原生变量（`--*`）统一主题色，避免过度嵌套。
- JavaScript 使用原生 ES6，不引入第三方框架，保持轻量。
- 页面链接使用相对路径，确保在 Gitee Pages / GitHub Pages 根目录部署时正常工作。
- 导航栏是每页各自复制的静态 HTML：新增页面时需同步修改所有页面里的 `<nav>`，并更新 `sitemap.xml` 与 `changelog.html`。

小工具部分：

- 待确定具体技术栈后再制定格式化、静态检查与提交信息规范。
- 分支模型参考 README 说明：功能开发使用 `Feat_xxx` 分支。

## 参与贡献

根据现有 README 的说明，贡献流程为：

1. Fork 本仓库
2. 新建 `Feat_xxx` 分支
3. 提交代码
4. 新建 Pull Request

## 安全注意事项

- 当前仓库没有存储任何凭证或敏感信息；`wrangler.toml` 中的 KV ID 仅为资源标识符，API Token 等 Secrets 不应写入仓库。
- `script.js` 实现导航、公网 IP 检测、设备 IP 上报与查询、localStorage 设备管理、device_key 生成、浏览器端持续同步以及百度统计。
- 浏览器端“开启监听”功能会把 device_key 保留在页面内存中并定时上报，存在被 XSS 或本地恶意软件读取的风险，建议仅临时使用；长期自动同步请使用桌面小软件。
- 页面中已接入百度统计脚本，用于了解访问量与页面使用情况。
- 后续开发中请勿将 `.env`、私钥、密码、令牌等敏感文件提交到仓库。
- 仓库已配置 `.gitignore`，避免提交 `node_modules`、`.wrangler`、本地配置以及 Windows 小工具的构建产物。
- KV 中存储的是用户设备的 IPv6 地址和 device_key，属于网络层信息，应注意隐私保护：知道 device_key 即可查询和更新该设备 IP，请勿泄露。
- `/api/p2p/*` 是完全开放的登记接口（产品决策：不做审核）：仅有内存级限流、字段长度与网络 slug 格式校验、每网络 100 节点上限和 7 天 TTL 兜底。节点列表理论上可被投毒（日蚀攻击入口），p2p.html 已放置风险提示，请勿移除。

## 给后续 AI 编码助手的提示

在为本项目生成或修改代码之前，请先确认：

1. 是否已经确定了具体的技术栈和目录结构。
2. 是否存在新的构建配置文件需要同步更新本文件。
3. 本 `AGENTS.md` 中的内容是否仍然准确；如有变化，请一并更新。
