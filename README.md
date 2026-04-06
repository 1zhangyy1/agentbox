# AgentBox

**Portable AI agent configuration packaging and sharing tool**

AgentBox packages your AI agent's complete environment (settings, skills, memory, sessions) into a single portable file that can be shared across projects, machines, and teams.

English | [简体中文](./README.zh-CN.md)

## What Problem Does It Solve?

When working with AI agents like Claude Code, you accumulate valuable context:
- Custom skills and workflows
- Project instructions (CLAUDE.md)
- Memory and conversation history
- MCP server configurations
- Plugin settings

**The problem:** This context is trapped on your machine. Moving to a new project, sharing with teammates, or migrating to a new computer means starting from scratch.

**The solution:** AgentBox packages everything into one `.agentbox` file that you can share, backup, or import anywhere.

## Core Features

### 📦 Export
Package your entire agent environment in one command:
```bash
npx @nuomiji/agentbox@latest export --output my-agent.agentbox
```

Creates a portable bundle containing:
- Project instructions (CLAUDE.md)
- Settings and plugins
- Skills metadata
- Memory files
- Recent conversation history (last 5 messages)
- MCP configurations

### 📥 Import
Import someone else's agent configuration:
```bash
npx @nuomiji/agentbox@latest import my-agent.agentbox
```

The bundle is unpacked to `.agentbox/` with AI-friendly preview files in `.agentbox/preview/` showing:
- Recent messages and plans
- Memory excerpts
- Settings overview

### 🔒 Security
Automatic redaction of sensitive data:
- API keys → `{{BINDING_NAME}}`
- Absolute paths → `{{HOME}}`, `{{PROJECT_ROOT}}`
- Tokens and secrets → Redacted

Check what was redacted: `.agentbox/meta/security-audit.json`

## Use Cases

**Team Onboarding**
```bash
# Share your proven setup with new team members
npx @nuomiji/agentbox@latest export --output team-config.agentbox
```

**Machine Migration**
```bash
# Old machine
npx @nuomiji/agentbox@latest export --output my-setup.agentbox

# New machine
npx @nuomiji/agentbox@latest import my-setup.agentbox
```

**Configuration Backup**
```bash
npx @nuomiji/agentbox@latest export --output backup-$(date +%Y%m%d).agentbox
```

**Safe Experimentation**
```bash
# Save current state
npx @nuomiji/agentbox@latest export --output baseline.agentbox

# Try changes...

# Restore if needed
npx @nuomiji/agentbox@latest import baseline.agentbox
```

## AI Assistant Integration

AgentBox includes a skill that teaches AI assistants to use it automatically.

**Install the skill:**

Use `npx skills` command for one-click installation:
```bash
npx skills add https://github.com/1zhangyy1/agentbox --skill agentbox
```

**Or install manually:**
```bash
git clone https://github.com/1zhangyy1/agentbox.git
cp -r agentbox/skills/agentbox /path/to/your/project/.claude/skills/
```

**Once installed, just say:**
- "Export my current setup"
- "Import that agent config"
- "What's in this agentbox file?"

The AI will automatically use AgentBox commands.

## Installation

**No installation needed** - run directly with npx:
```bash
npx @nuomiji/agentbox@latest export --output my-agent.agentbox
npx @nuomiji/agentbox@latest import my-agent.agentbox
```

This always uses the latest version.

## What Gets Captured

| Layer | Content |
|-------|---------|
| Profile | CLAUDE.md project instructions |
| Settings | Plugins, MCP servers |
| Skills | Installed skill metadata |
| Memory | Project memory files |
| Session | Recent transcripts and plans |

## The .agentbox File Format

An `.agentbox` file is a **portable ZIP archive** (typically 1-10MB) containing your complete agent environment:

```
example.agentbox (ZIP archive)
├── box.yaml                      # Bundle metadata
├── bindings.template.env         # Template for API keys/secrets
├── layers/                       # Configuration layers
│   ├── profile.yaml             # CLAUDE.md instructions
│   ├── skills.yaml              # Installed skills
│   ├── memory.yaml              # Memory files
│   ├── plugins.yaml             # Plugin settings
│   ├── session.yaml             # Session metadata
│   └── ...                      # Other settings
├── session/                      # Conversation history
│   ├── transcripts/             # Full conversation logs (.jsonl)
│   └── plans/                   # Plan files (.md)
├── meta/
│   └── security-audit.json      # What was redacted
└── resolved.yaml                 # Merged configuration
```

**Key features:**
- **Portable:** Single file, easy to share via email, Slack, or Git
- **Secure:** API keys and paths automatically redacted
- **Complete:** Everything needed to recreate your agent environment
- **Human-readable:** Unzip to inspect contents (YAML + Markdown)

**After import, you get:**
```
your-project/
├── .agentbox/                    # Unpacked bundle
│   ├── preview/                 # AI-friendly summaries
│   │   ├── session.md          # Recent messages & plans
│   │   ├── memory.md           # Memory excerpts
│   │   ├── settings.json       # Settings overview
│   │   └── profile.md          # Instructions preview
│   ├── layers/                  # Raw configuration
│   └── session/                 # Full transcripts
├── CLAUDE.md                     # Imported (if not exists)
└── .claude/settings.local.json   # Merged settings
```

## File Structure After Import

The `.agentbox/preview/` directory contains AI-friendly summaries that help you understand what was imported without reading raw YAML files.

## Requirements

- Node.js >= 22.0.0
- Claude Code (currently supported host)

## Development

```bash
git clone https://github.com/1zhangyy1/agentbox.git
cd agentbox
npm install
npm run build
```

## Roadmap

### 🚀 Coming Soon

**Multi-Platform Support**
- [ ] Codex Adapter - Support configuration import/export for Codex platform
- [ ] OpenClaw Adapter - Support configuration conversion for OpenClaw platform
- [ ] Cross-Platform Migration - Seamlessly migrate agent configurations between different AI platforms

**Goal:** Make AgentBox the true cross-platform agent configuration standard, allowing you to easily migrate and share your agent environment regardless of which AI platform you use.

## Links

- **npm:** [@nuomiji/agentbox](https://www.npmjs.com/package/@nuomiji/agentbox)
- **GitHub:** [1zhangyy1/agentbox](https://github.com/1zhangyy1/agentbox)
- **Issues:** [Report bugs](https://github.com/1zhangyy1/agentbox/issues)

## License

MIT © zhangyy
