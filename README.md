# AgentBox

**Portable AI agent configuration packaging and sharing tool**

AgentBox packages your AI agent's complete environment (settings, skills, memory, sessions) into a single portable file that can be shared across projects, machines, and teams.

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

1. Clone this repository or download the skill folder
2. Copy `.claude/skills/agentbox/` to your project's `.claude/skills/` directory
3. The skill is now available to your AI assistant

**Or install from source:**
```bash
git clone https://github.com/1zhangyy1/agentbox.git
cp -r agentbox/.claude/skills/agentbox /path/to/your/project/.claude/skills/
```

**Once installed, just say:**
- "Export my current setup"
- "Import that agent config"
- "What's in this agentbox file?"

The AI will automatically use AgentBox commands.

## Installation

### Option 1: Use npx (Recommended)

**No installation needed** - run directly with npx:
```bash
npx @nuomiji/agentbox@latest export --output my-agent.agentbox
npx @nuomiji/agentbox@latest import my-agent.agentbox
```

This always uses the latest version.

### Option 2: Global Install

For frequent use, install globally:
```bash
npm install -g @nuomiji/agentbox
```

Then use the shorter command:
```bash
agentbox export --output my-agent.agentbox
agentbox import my-agent.agentbox
```

### Option 3: From Source

Clone and build from source:
```bash
git clone https://github.com/1zhangyy1/agentbox.git
cd agentbox
npm install
npm run build
npm link  # Makes 'agentbox' command available globally
```

## What Gets Captured

| Layer | Content |
|-------|---------|
| Profile | CLAUDE.md project instructions |
| Settings | Plugins, MCP servers |
| Skills | Installed skill metadata |
| Memory | Project memory files |
| Session | Recent transcripts and plans |

## File Structure After Import

```
.agentbox/
├── preview/              # AI-friendly summaries
│   ├── session.md       # Recent messages & plans
│   ├── memory.md        # Memory excerpts
│   └── settings.json    # Settings overview
├── session/
│   ├── transcripts/     # Full conversation history
│   └── plans/           # Full plan files
└── layers/              # Raw configuration data
```

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

## Links

- **npm:** [@nuomiji/agentbox](https://www.npmjs.com/package/@nuomiji/agentbox)
- **GitHub:** [1zhangyy1/agentbox](https://github.com/1zhangyy1/agentbox)
- **Issues:** [Report bugs](https://github.com/1zhangyy1/agentbox/issues)

## License

MIT © zhangyy
