# AgentBox

**便携式 AI 智能体配置打包与共享工具**

AgentBox 将你的 AI 智能体完整环境（设置、技能、记忆、会话）打包成一个便携文件，可以在项目、机器和团队之间共享。

[English](./README.md) | 简体中文

## 解决什么问题？

使用 Claude Code 等 AI 智能体时，你会积累大量有价值的上下文：
- 自定义技能和工作流
- 项目指令（CLAUDE.md）
- 记忆和对话历史
- MCP 服务器配置
- 插件设置

**问题：** 这些上下文被困在你的机器上。换新项目、与队友共享、或迁移到新电脑时，一切都要从头开始。

**解决方案：** AgentBox 将所有内容打包成一个 `.agentbox` 文件，你可以随时共享、备份或导入。

## 核心功能

### 📦 导出
一条命令打包整个智能体环境：
```bash
npx @nuomiji/agentbox@latest export --output my-agent.agentbox
```

创建包含以下内容的便携包：
- 项目指令（CLAUDE.md）
- 设置和插件
- 技能元数据
- 记忆文件
- 最近对话历史（最后 5 条消息）
- MCP 配置

### 📥 导入
导入他人的智能体配置：
```bash
npx @nuomiji/agentbox@latest import my-agent.agentbox
```

包会被解压到 `.agentbox/` 目录，并在 `.agentbox/preview/` 生成 AI 友好的预览文件，显示：
- 最近的消息和计划
- 记忆摘录
- 设置概览

### 🔒 安全性
自动脱敏处理敏感数据：
- API 密钥 → `{{BINDING_NAME}}`
- 绝对路径 → `{{HOME}}`、`{{PROJECT_ROOT}}`
- 令牌和密钥 → 已脱敏

查看脱敏内容：`.agentbox/meta/security-audit.json`

## 使用场景

**团队入职**
```bash
# 与新团队成员共享你的成熟配置
npx @nuomiji/agentbox@latest export --output team-config.agentbox
```

**机器迁移**
```bash
# 旧机器
npx @nuomiji/agentbox@latest export --output my-setup.agentbox

# 新机器
npx @nuomiji/agentbox@latest import my-setup.agentbox
```

**配置备份**
```bash
npx @nuomiji/agentbox@latest export --output backup-$(date +%Y%m%d).agentbox
```

**安全实验**
```bash
# 保存当前状态
npx @nuomiji/agentbox@latest export --output baseline.agentbox

# 尝试修改...

# 需要时恢复
npx @nuomiji/agentbox@latest import baseline.agentbox
```

## AI 助手集成

AgentBox 包含一个技能，可以教 AI 助手自动使用它。

**安装技能：**

使用 `npx skills` 命令一键安装：
```bash
npx skills add https://github.com/1zhangyy1/agentbox --skill agentbox
```

**或手动安装：**
```bash
git clone https://github.com/1zhangyy1/agentbox.git
cp -r agentbox/skills/agentbox /path/to/your/project/.claude/skills/
```

**安装后，只需说：**
- "导出我当前的配置"
- "导入那个智能体配置"
- "这个 agentbox 文件里有什么？"

AI 会自动使用 AgentBox 命令。

## 安装方式

**无需安装** - 直接用 npx 运行：
```bash
npx @nuomiji/agentbox@latest export --output my-agent.agentbox
npx @nuomiji/agentbox@latest import my-agent.agentbox
```

始终使用最新版本。

## 捕获的内容

| 层级 | 内容 |
|-------|---------|
| Profile | CLAUDE.md 项目指令 |
| Settings | 插件、MCP 服务器 |
| Skills | 已安装技能元数据 |
| Memory | 项目记忆文件 |
| Session | 最近的对话记录和计划 |

## .agentbox 文件格式

`.agentbox` 文件是一个**便携式 ZIP 压缩包**（通常 1-10MB），包含你的完整智能体环境：

```
example.agentbox (ZIP 压缩包)
├── box.yaml                      # 包元数据
├── bindings.template.env         # API 密钥/密钥模板
├── layers/                       # 配置层
│   ├── profile.yaml             # CLAUDE.md 指令
│   ├── skills.yaml              # 已安装技能
│   ├── memory.yaml              # 记忆文件
│   ├── plugins.yaml             # 插件设置
│   ├── session.yaml             # 会话元数据
│   └── ...                      # 其他设置
├── session/                      # 对话历史
│   ├── transcripts/             # 完整对话日志 (.jsonl)
│   └── plans/                   # 计划文件 (.md)
├── meta/
│   └── security-audit.json      # 脱敏记录
└── resolved.yaml                 # 合并后的配置
```

**核心特性：**
- **便携：** 单个文件，可通过邮件、Slack 或 Git 轻松共享
- **安全：** API 密钥和路径自动脱敏
- **完整：** 包含重建智能体环境所需的一切
- **可读：** 解压后可查看内容（YAML + Markdown）

**导入后得到：**
```
your-project/
├── .agentbox/                    # 解压后的包
│   ├── preview/                 # AI 友好的摘要
│   │   ├── session.md          # 最近的消息和计划
│   │   ├── memory.md           # 记忆摘录
│   │   ├── settings.json       # 设置概览
│   │   └── profile.md          # 指令预览
│   ├── layers/                  # 原始配置
│   └── session/                 # 完整对话记录
├── CLAUDE.md                     # 已导入（如不存在）
└── .claude/settings.local.json   # 合并后的设置
```

## 导入后的文件结构

`.agentbox/preview/` 目录包含 AI 友好的摘要，帮助你理解导入的内容，无需阅读原始 YAML 文件。

## 系统要求

- Node.js >= 22.0.0
- Claude Code（当前支持的宿主）

## 开发

```bash
git clone https://github.com/1zhangyy1/agentbox.git
cd agentbox
npm install
npm run build
```

## 路线图

### 🚀 即将推出

**多平台支持**
- [ ] Codex 适配器 - 支持 Codex 平台的配置导入导出
- [ ] OpenClaw 适配器 - 支持 OpenClaw 平台的配置互转
- [ ] 跨平台迁移 - 在不同 AI 平台间无缝迁移智能体配置

**目标：** 让 AgentBox 成为真正的跨平台智能体配置标准，无论你使用哪个 AI 平台，都能轻松迁移和共享你的智能体环境。

## 链接

- **npm:** [@nuomiji/agentbox](https://www.npmjs.com/package/@nuomiji/agentbox)
- **GitHub:** [1zhangyy1/agentbox](https://github.com/1zhangyy1/agentbox)
- **问题反馈:** [报告 Bug](https://github.com/1zhangyy1/agentbox/issues)

## 许可证

MIT © zhangyy
