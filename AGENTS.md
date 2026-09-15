# ipstun 项目指南

## 项目概述

`ipstun` 是一个基于 Cloudflare Pages + Pages Functions 的多设备外网 IP 实时同步小站。前端提供本机 IP 检测、设备 IP 同步与查询、二维码分享以及 IPv6 科普教程，后端通过 Cloudflare KV 存储每个设备最新的 IPv6 / IPv4 地址。小工具计划解决“家宽 IPv6 前缀动态变化”的问题：实时监测本机 IPv6 并上报到本站后端，让外网设备始终能通过本站查询到最新地址。站点前端由纯 HTML / CSS / JavaScript 编写，后端由 Cloudflare Pages Functions 提供。

- 项目名称：ipstun
- 仓库地址：`git@gitee.com:lluck42/ipstun.git`
- 许可证：MIT License（Copyright (c) 2026 lluck42）
- 当前分支：`master`
- 当前提交：`12e0472 Initial commit`

## 当前仓库内容

```
.
├── index.html                        # 站点首页：主推公网 IP 检测 + 设备 IP 同步
├── how-it-works.html                 # 技术原理页：解释 IP 检测与 IPv6 直连原理
├── guide.html                        # 详细教程：各平台查看 IP 与 IPv6 的方法
├── download.html                     # 小工具下载页（软件尚未发布，当前为占位）
├── changelog.html                    # 更新记录页
├── style.css                         # 站点共用样式
├── script.js                         # 导航、代码块复制、公网 IP 检测、设备 IP 查询、密钥生成、浏览器端持续同步与百度统计
├── functions/                        # Cloudflare Pages Functions（后端接口）
│   └── api/
│       ├── myip.js                   # GET /api/myip：返回访问者当前公网 IP 与协议版本
│       ├── report.js                 # POST /api/report：凭 device_key 上报 IPv6
│       └── devices/
│           └── [device_key].js       # GET /api/devices/:device_key：查询设备最新 IP
├── wrangler.toml                     # Cloudflare 部署与 KV 绑定配置
├── package.json                      # 开发依赖与部署脚本
├── .gitignore                        # Git 忽略规则
├── LICENSE                           # MIT 许可证
├── README.en.md                      # 英文版 README（模板内容）
└── README.md                         # 中文版 README（模板内容）
```

两个 README 文件目前仍为占位符文本，未描述具体的项目功能、架构或安装步骤。网站页面已具备实际内容，但小软件尚未开发完成。

## 技术栈与架构

当前站点为 Cloudflare Pages + Pages Functions 全栈应用。

- 前端：HTML5、CSS3、原生 JavaScript（ES6），位于仓库根目录
- 后端：Cloudflare Pages Functions（基于 Workers 运行时的服务端函数），位于 `functions/`
- 数据存储：Cloudflare KV（绑定变量名为 `user-device`），用于存储每个设备最新的 IPv6 地址。每个设备用 **device_key（UUID）** 作为 KV key，value 中保存设备名、IPv6/IPv4 和更新时间
- 部署平台：Cloudflare Pages（静态资源 + Functions 一起部署）
- 本地开发：`wrangler pages dev .`
- 小工具：计划为 Windows 桌面程序，核心功能是“IPv6 地址监测 + 上报到本站后端”。技术栈待定（如 C# / Python / Go 等），开发完成后会把可执行文件或下载链接更新到 `download.html`

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

### 部署到 Cloudflare Pages

1. 确保已在 Cloudflare Dashboard 创建 KV 命名空间，并把 ID 填入 `wrangler.toml`。
2. 执行：
   ```bash
   npm run deploy
   ```
3. 部署成功后，静态页面和 `/api/*` 接口会同时上线。

> 注意：`wrangler.toml` 中的 KV ID 是占位符，实际部署前必须替换。代码中通过 `env['user-device']` 访问 KV，因此 Cloudflare Pages 里的 KV binding 名称也必须是 `user-device`。KV namespace ID 本身不是敏感信息，但建议不要把生产 API Token 写入仓库。

后续如果开发了 Windows 小工具，建议把二进制文件或压缩包放到仓库的 `releases/` 或 `download/` 目录，并在 `download.html` 中更新下载链接。

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
- `script.js` 实现导航、代码块复制、设备 IP 查询、device_key 生成、当前公网 IP 检测、浏览器端持续同步以及百度统计。
- 浏览器端“开启监听”功能会把 device_key 保留在页面内存中并定时上报，存在被 XSS 或本地恶意软件读取的风险，建议仅临时使用；长期自动同步请使用桌面小软件。
- 页面中已接入百度统计脚本，用于了解访问量与页面使用情况。
- 后续开发中请勿将 `.env`、私钥、密码、令牌等敏感文件提交到仓库。
- 仓库已配置 `.gitignore`，避免提交 `node_modules`、`.wrangler`、本地配置以及 Windows 小工具的构建产物。
- KV 中存储的是用户设备的 IPv6 地址和 device_key，属于网络层信息，应注意隐私保护：知道 device_key 即可查询和更新该设备 IP，请勿泄露。

## 给后续 AI 编码助手的提示

在为本项目生成或修改代码之前，请先确认：

1. 是否已经确定了具体的技术栈和目录结构。
2. 是否存在新的构建配置文件需要同步更新本文件。
3. 本 `AGENTS.md` 中的内容是否仍然准确；如有变化，请一并更新。
