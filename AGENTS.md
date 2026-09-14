# ipstun 项目指南

## 项目概述

`ipstun` 是一个计划用于承载“ipstun 科普教程”的仓库。目前仓库处于初始阶段，仅包含 Gitee 生成的默认 README 模板文件和 MIT 许可证，尚未包含任何源代码、构建配置或测试。

- 项目名称：ipstun
- 仓库地址：`git@gitee.com:lluck42/ipstun.git`
- 许可证：MIT License（Copyright (c) 2026 lluck42）
- 当前分支：`master`
- 当前提交：`12e0472 Initial commit`

## 当前仓库内容

```
.
├── LICENSE          # MIT 许可证
├── README.en.md     # 英文版 README（模板内容）
└── README.md        # 中文版 README（模板内容）
```

两个 README 文件目前均为占位符文本，未描述具体的项目功能、架构或安装步骤。

## 技术栈与架构

**尚未确定。** 仓库中没有 `pyproject.toml`、`package.json`、`Cargo.toml`、`pom.xml`、`go.mod`、`CMakeLists.txt` 或其他任何语言/框架的构建配置文件，也没有任何源代码目录或模块划分。

后续引入技术栈时，应在此节补充：

- 编程语言与运行时版本
- 主要依赖与框架
- 目录结构与模块职责
- 运行时架构图或服务边界

## 构建与运行

**当前无可用命令。** 因为不存在源码和构建配置，无法执行编译、安装或运行操作。

后续根据选择的技术栈，常见的入口命令可能包括：

- Python：`pip install -r requirements.txt && python -m ipstun`
- Node.js：`npm install && npm start`
- Rust：`cargo build && cargo run`
- Go：`go build && ./ipstun`

## 测试策略

**当前无测试。** 仓库中没有单元测试、集成测试或持续工作流配置。

建议在添加首批代码时同步建立测试：

1. 选择项目对应的测试框架并写入依赖配置。
2. 为核心功能编写单元测试。
3. 在 CI 中运行测试，确保每次提交都通过。

## 代码风格与开发约定

**尚未制定。** 建议在确定技术栈后补充：

- 代码格式化工具（如 `black`、`prettier`、`rustfmt` 等）
- 静态检查工具（如 `ruff`、`eslint`、`clippy` 等）
- 提交信息规范
- 分支模型（当前 README 提到使用 `Feat_xxx` 分支）

## 参与贡献

根据现有 README 的说明，贡献流程为：

1. Fork 本仓库
2. 新建 `Feat_xxx` 分支
3. 提交代码
4. 新建 Pull Request

## 安全注意事项

- 当前仓库没有可运行的代码，也没有存储任何凭证或敏感信息。
- 后续开发中请勿将 `.env`、私钥、密码、令牌等敏感文件提交到仓库。
- 建议在仓库中配置 `.gitignore`，避免提交临时文件、依赖目录和本地配置。

## 给后续 AI 编码助手的提示

在为本项目生成或修改代码之前，请先确认：

1. 是否已经确定了具体的技术栈和目录结构。
2. 是否存在新的构建配置文件需要同步更新本文件。
3. 本 `AGENTS.md` 中的内容是否仍然准确；如有变化，请一并更新。
