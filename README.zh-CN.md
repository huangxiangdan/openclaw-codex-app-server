# OpenClaw Codex App Server 插件

[![CI](https://github.com/pwrdrvr/openclaw-codex-app-server/actions/workflows/ci.yml/badge.svg)](https://github.com/pwrdrvr/openclaw-codex-app-server/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/openclaw-codex-app-server)](https://www.npmjs.com/package/openclaw-codex-app-server)
[![npm downloads](https://img.shields.io/npm/dm/openclaw-codex-app-server)](https://www.npmjs.com/package/openclaw-codex-app-server)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

<p align="center">
  <a href="https://youtu.be/GKkipfNEJJQ">
    <img src="https://img.youtube.com/vi/GKkipfNEJJQ/maxresdefault.jpg" alt="观看 OpenClaw Codex App Server 演示视频" width="100%" />
  </a>
</p>

这个项目没有单独的产品名，它是一个 OpenClaw 插件，用来把 OpenClaw 接到 Codex App Server 协议上，让你可以在 Telegram、Discord、飞书会话中继续使用 Codex Desktop / Codex TUI 的线程。

本文中的 `Codex` 仅用于描述该插件连接的协议与工具链。本仓库是独立项目，不是 OpenAI 或 Codex 官方提供、赞助、背书或关联项目。

如果运行 OpenClaw 的机器上 `codex` 已经可用，这个插件通常也可直接工作。它复用本地 Codex CLI 和登录态，不需要单独的插件登录。

## 快速开始

1. 在 OpenClaw 安装本插件。
2. 在你要绑定的 Telegram / Discord / 飞书会话中使用插件。
3. 发送 `/cas_resume`。
4. 选择最近线程，或点击 `New` 新建线程，或直接输入关键字搜索。
5. 绑定后，该会话里的普通文本会路由到选中的 Codex 线程。

线程选择、项目选择、模型切换和技能入口都支持按钮。如果你的筛选条件有歧义，插件会返回选择器而不是猜测。

## 在 OpenClaw 中安装

以下命令适用于 OpenClaw `2026.3.22` 及以上版本（这些版本包含本插件依赖的 binding / plugin 接口能力）。

npm 安装（稳定版本）：

```bash
openclaw plugins install openclaw-codex-app-server
```

npm 卸载：

```bash
openclaw plugins uninstall openclaw-codex-app-server
```

`2026.3.22+` 已包含所需接口。如果你在更早版本上做联调，请使用文末的本地开发工作流。

预发布版本会发布到 npm 的 dist-tag（不是 `latest`）。例如 `v0.3.0-beta.1` 会发布为 `openclaw-codex-app-server@beta`，因此 `@latest` 仍保持稳定版本。

从当前仓库源码安装：

```bash
git clone https://github.com/pwrdrvr/openclaw-codex-app-server.git
cd openclaw-codex-app-server
openclaw plugins install --link "$PWD"
```

卸载本地 link：

```bash
openclaw plugins uninstall openclaw-codex-app-server
```

## 为什么使用

- 复用你现有的本地 Codex CLI，不需要额外托管桥接。
- 聊天使用自然：`/cas_resume` 绑定一次，后续直接对话。
- 常用控制近在手边：`/cas_status`、`/cas_plan`、`/cas_review` 等。
- 适合把 Telegram / Discord / 飞书会话绑定到真实 Codex 线程。

## 典型流程

1. 在目标会话发送 `/cas_resume`。
2. 用按钮选择线程，点 `New`，或直接传筛选参数，例如：`/cas_resume release-fix`、`/cas_resume --projects`、`/cas_resume --new openclaw`。
3. 可在绑定时顺带设置模型、fast、权限：`/cas_resume --model gpt-5.4 --fast --yolo`。
4. 绑定后直接发送普通消息。
5. 用 `/cas_status` 查看或调整当前绑定状态（模型、推理强度、fast、权限、compact、stop）。
6. 若你通过正常按钮 `Implement this plan` 离开 plan 模式，不需要再执行 `/cas_plan off`；只有手动退出时才需要。

## 飞书说明

- 要获得完整飞书交互能力（卡片按钮 + 回调路由），请使用此飞书通道插件实现：`https://github.com/huangxiangdan/openclaw-lark`。
- 飞书插件安装（npm）：`openclaw plugins install @larksuite/openclaw-lark`
- 飞书插件安装（当前集成使用的 GitHub 源码）：
  - `git clone https://github.com/huangxiangdan/openclaw-lark.git`
  - `cd openclaw-lark && pnpm install && pnpm build`
  - `openclaw plugins install --link "$PWD"`
- 在当前集成方案中，飞书支持依赖上述插件；使用其他飞书插件构建可能出现“按钮缺失”或“点击无响应”。
- `/cas_cb` 是飞书卡片动作使用的内部回调桥接命令，仅能在飞书会话中使用。
- 飞书绑定按会话 + 线程（`threadId`）隔离，同一群多线程不会互相串状态。
- 飞书卡片回调带有严格归属校验（会话 / 账号 / 线程），避免跨频道或跨线程重放。
- 如果运行时 `channel.feishu.sendMessageFeishu` 不可用，插件会偏向单次响应卡片更新，减少重复消息/丢消息。
- OpenClaw 运行时版本应与配置生成版本一致。如果 `openclaw.json` 是 `2026.3.28` 写入，尽量不要混用较老 CLI（例如 `2026.3.22`）。
- 确认 OpenClaw 配置中飞书插件已启用：`plugins.entries.feishu.enabled = true`，否则卡片回调与交互流程不会正常工作。

## 命令参考

| 命令 | 作用 | 说明 / 示例 |
| --- | --- | --- |
| `/cas` | 以按钮菜单列出支持的 Codex 命令。 | 点击按钮可查看该命令详细帮助。 |
| `/cas_resume` | 绑定当前会话到 Codex 线程。 | 无参数时打开当前工作区最近线程选择器，并包含 `New` 按钮。 |
| `/cas_resume --projects` | 先选项目再选线程。 | 先打开项目选择器，再进入线程选择器。 |
| `/cas_resume --new` | 在项目中创建新线程。 | 打开项目选择器，不展示线程列表。 |
| `/cas_resume --new openclaw` | 在匹配项目中直接新建线程。 | 若匹配多个工作区，会返回按钮让你选。 |
| `/cas_resume --all` | 跨项目搜索最近线程。 | 适合线程不在当前工作区时使用。 |
| `/cas_resume --cwd ~/github/openclaw` | 将搜索范围限制在指定工作区。 | `--cwd` 支持绝对路径或 `~/...`。 |
| `/cas_resume --sync` | 恢复线程并尝试同步会话/话题名称。 | 可与其他参数组合使用。 |
| `/cas_resume --model gpt-5.4` | 绑定时设置偏好模型。 | 偏好会保存到 binding，后续会复用。 |
| `/cas_resume --fast`, `/cas_resume --no-fast` | 绑定时设置 fast。 | Fast 仅在支持模型（如 GPT-5.4+）可用。 |
| `/cas_resume --yolo`, `/cas_resume --no-yolo` | 绑定时设置权限模式。 | `--yolo` 表示 Full Access。 |
| `/cas_resume release-fix` | 按标题或 id 恢复匹配线程。 | 多个匹配时返回按钮选择。 |
| `/cas_status` | 显示绑定状态和交互控制。 | 包含模型、推理、fast、权限、compact、stop。 |
| `/cas_status --model gpt-5.4` | 修改偏好模型并刷新状态卡。 | 作用于当前 binding。 |
| `/cas_status --fast`, `/cas_status --no-fast` | 修改 fast 并刷新状态卡。 | Fast 仅在支持模型可用。 |
| `/cas_status --yolo`, `/cas_status --no-yolo` | 修改权限模式并刷新状态卡。 | `--yolo` 选择 Full Access。 |
| `/cas_detach` | 解除当前会话与 Codex 的绑定。 | 解绑后普通消息不会再路由到该线程。 |
| `/cas_stop` | 中断当前正在运行的 Codex turn。 | 仅在 turn 正在执行时生效。 |
| `/cas_steer <message>` | 给当前运行追加 steer 指令。 | 示例：`/cas_steer focus on the failing tests first` |
| `/cas_plan <goal>` | 让 Codex 先给计划而不是直接执行。 | 插件会回传计划问题与最终计划。 |
| `/cas_plan off` | 退出当前会话的 plan 模式。 | 用于手动退出，而不是通过 `Implement this plan` 按钮。 |
| `/cas_review` | 审查当前工作区未提交改动。 | 需要已存在 binding。 |
| `/cas_review <focus>` | 带焦点说明做审查。 | 示例：`/cas_review focus on thread selection regressions` |
| `/cas_compact` | 压缩当前绑定线程。 | 会回传进度与上下文使用情况。 |
| `/cas_skills` | 列出当前工作区可用 skill。 | 最多可附带 8 个技能快捷按钮。 |
| `/cas_skills review` | 过滤技能列表。 | 按技能名、描述或 cwd 匹配。 |
| `/cas_experimental` | 列出 Codex 的实验特性。 | 只读。 |
| `/cas_mcp` | 列出 MCP servers。 | 显示鉴权状态与 tool/resource/template 数。 |
| `/cas_mcp github` | 过滤 MCP server。 | 按名称与鉴权状态匹配。 |
| `/cas_fast` | 切换当前绑定线程 fast。 | 是 `/cas_status` 中 fast 控件的快捷命令。 |
| `/cas_fast on`, `/cas_fast off`, `/cas_fast status` | 显式设置或查看 fast。 | 示例：`/cas_fast status` |
| `/cas_model` | 列模型；会话已绑定时显示模型按钮。 | 未绑定时仅文本列模型。 |
| `/cas_model gpt-5.4` | 设置当前绑定线程模型。 | 也会更新后续复用的偏好模型。 |
| `/cas_permissions` | 显示账号、限流和权限状态。 | 改权限请用 `/cas_status --yolo` 或状态卡按钮。 |
| `/cas_init ...` | 透传 `/init` 给 Codex。 | 参数原样透传到 App Server。 |
| `/cas_diff ...` | 透传 `/diff` 给 Codex。 | 参数原样透传到 App Server。 |
| `/cas_rename <new name>` | 重命名当前绑定线程。 | 示例：`/cas_rename approval flow cleanup` |
| `/cas_rename --sync <new name>` | 重命名并同步会话/话题名称。 | 需要已存在 binding。 |
| `/cas_rename --sync` | 展示建议命名样式，并同步会话名称。 | 适合不手输名称，直接选推荐样式。 |

## 截图占位

### `/cas_resume` 线程选择按钮

<img width="973" height="938" alt="image" src="https://github.com/user-attachments/assets/c0202425-590a-4b23-892d-96333c0c2630" />

### `/cas_resume` 绑定审批

<img width="973" height="938" alt="image" src="https://github.com/user-attachments/assets/cff5da61-d92d-43a4-8c74-be8ea4da48f1" />

### `/cas_resume` 恢复上下文 / 固定消息

<img width="973" height="938" alt="image" src="https://github.com/user-attachments/assets/282b1a63-60b3-48e8-885d-916678d07204" />

### `/cas_status`

<img width="973" height="938" alt="image" src="https://github.com/user-attachments/assets/203796f7-114d-4a13-804d-404504c2546a" />

状态卡是会话绑定后的主要控制面板，提供：

- 模型选择
- 推理强度选择
- 支持模型下的 fast 切换
- Default / Full Access 权限切换
- compact 压缩
- stop 中断

## 插件配置说明

[`openclaw.plugin.json`](./openclaw.plugin.json) 支持：

- `transport`: `stdio` 或 `websocket`
- `command` / `args`: `stdio` 模式下 Codex 可执行程序与参数
- `url` / `authToken` / `headers`: `websocket` 模式连接配置
- `defaultWorkspaceDir`: 未绑定动作的默认工作区
- `defaultModel`: 新线程未显式指定时默认模型
- `defaultServiceTier`: 新 turn 默认 service tier

## 本地联调工作流（配合本地 OpenClaw 源码）

当你需要在 OpenClaw 正式发布相关插件接口前做本地联调，可使用以下流程。

### 1. 准备带所需插件接口的 OpenClaw

本插件最初依赖 [openclaw/openclaw#45318](https://github.com/openclaw/openclaw/pull/45318)。如果该 PR 仍未合并可直接检出；若已合并可直接使用 `main`。

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
gh pr checkout 45318
pnpm install
```

如果不使用 `gh`：

```bash
git fetch origin pull/45318/head:pr-45318
git checkout pr-45318
pnpm install
```

### 2. 以本地源码方式安装本插件

在 OpenClaw 仓库目录执行：

```bash
pnpm openclaw plugins install --link "/absolute/path/to/openclaw-codex-app-server"
```

移除本地 link：

```bash
pnpm openclaw plugins uninstall openclaw-codex-app-server
```

### 3. 启动本地 gateway

在 OpenClaw 仓库目录执行：

```bash
pnpm gateway:watch
```

### 4. （可选）在本仓库做本地依赖覆盖

本仓库不再提交机器本地的 `openclaw` 开发依赖，以保持 CI 可移植。若你希望当前插件源码直接引用你本机 OpenClaw 源码，可在本地工作副本中添加：

```bash
pnpm add -D openclaw@file:/absolute/path/to/openclaw
pnpm install
```

这是本地开发用途，不要提交由此产生的 `package.json` / `pnpm-lock.yaml` 变更。

## 开发检查

```bash
pnpm test
pnpm typecheck
```
