---
name: agentbox
description: Package and share AI agent configurations (Claude Code settings, skills, memory, sessions) across projects and machines. Use this skill whenever the user wants to export their current agent setup, import someone else's configuration, share their Claude environment, migrate settings to a new machine, or backup their agent state. Also trigger when they mention "portable agent", "agent migration", "share my setup", or "import agent config".
---

# AgentBox - Portable Agent Configuration

AgentBox lets you package and share complete AI agent environments. Think of it as "Docker for AI agent configs" - capture everything (settings, skills, memory, sessions) in one portable bundle.

## When to use this

- User wants to export their current Claude Code setup
- User wants to import someone else's agent configuration
- User mentions sharing their agent environment with teammates
- User wants to backup or migrate their settings to another machine
- User asks about portable agent configurations

## Quick Start

AgentBox is available via npx - no installation needed:

```bash
npx @nuomiji/agentbox@latest <command>
```

## Common Workflows

### Export current configuration

To package the current project's agent setup:

```bash
npx @nuomiji/agentbox@latest export --output my-agent.agentbox
```

This creates a `.agentbox` bundle containing:
- Project settings (CLAUDE.md, .claude/settings.local.json)
- Installed skills
- Memory files
- Recent session transcripts and plans
- MCP server configurations

The bundle is portable and safe to share - sensitive data (API keys, tokens) are automatically redacted and replaced with templates.

### Import someone else's configuration

To import an agent bundle into the current project:

```bash
npx @nuomiji/agentbox@latest import my-agent.agentbox
```

This will:
1. Unpack the bundle to `.agentbox/` directory
2. Generate preview files in `.agentbox/preview/` for you to review
3. Import compatible settings into the current project

After import, check `.agentbox/preview/session.md` to see what was included - it shows recent messages, plans, and a summary of the imported configuration.

### Review what's in a bundle

Before importing, you can preview the contents:

```bash
npx @nuomiji/agentbox@latest import my-agent.agentbox
```

Then read `.agentbox/preview/session.md` and other preview files to understand what's included.

## What gets captured

AgentBox collects:
- **Profile**: CLAUDE.md project instructions
- **Settings**: Plugins, MCP servers (with path templates)
- **Skills**: Installed skill metadata and sources
- **Memory**: Project memory files
- **Session**: Recent transcripts and plans (last 5 messages shown in preview)

## What gets redacted

For security, AgentBox automatically redacts:
- API keys and tokens
- Absolute file paths (replaced with `{{HOME}}`, `{{PROJECT_ROOT}}`)
- Sensitive environment variables

Check `.agentbox/meta/security-audit.json` after export to see what was redacted.

## Tips for AI assistants

When helping users with agentbox:

1. **Always use npx**: Don't ask users to install globally. Use `npx agentbox@latest` for the freshest version.

2. **Check the preview first**: After import, read `.agentbox/preview/session.md` to understand what was imported and explain it to the user.

3. **Explain the bundle contents**: Users may not know what's in a bundle. Read the preview files and summarize:
   - What settings were imported
   - What skills are available
   - What the recent session context shows

4. **Handle missing bindings**: If the import mentions missing bindings (like API keys), explain that the user needs to provide them. The bundle includes a `bindings.template.env` file showing what's needed.

5. **Project-level scope**: By default, agentbox imports into the current project (`.claude/settings.local.json`, `CLAUDE.md`), not global user settings. This keeps things isolated and safe.

## Example conversation flow

**User**: "Can you export my current setup so I can share it with my team?"

**You**: 
```bash
npx @nuomiji/agentbox@latest export --output team-agent.agentbox
```

Then explain: "I've created `team-agent.agentbox` with your current project settings, skills, and recent session context. It's safe to share - API keys and personal paths have been redacted. Your team can import it with `npx @nuomiji/agentbox@latest import team-agent.agentbox`."

**User**: "Someone sent me a config file called `expert-agent.agentbox`, can you import it?"

**You**:
```bash
npx @nuomiji/agentbox@latest import expert-agent.agentbox
```

Then read `.agentbox/preview/session.md` and explain what was imported: "I've imported the configuration. It includes [summarize settings, skills, memory]. The preview shows their recent work was about [summarize from session preview]. Everything is now available in your current project."

## Advanced: Specify host

If you need to target a specific host (usually auto-detected):

```bash
npx @nuomiji/agentbox@latest export --host claude-code --output my-agent.agentbox
npx @nuomiji/agentbox@latest import my-agent.agentbox --host claude-code
```

## File locations after import

- `.agentbox/` - Unpacked bundle data
- `.agentbox/preview/` - AI-friendly preview files
  - `session.md` - Recent messages and plans
  - `memory.md` - Memory excerpts
  - `settings.json` - Settings preview
  - `profile.md` - CLAUDE.md preview
- `CLAUDE.md` - Imported project instructions (if not exists)
- `.claude/settings.local.json` - Imported settings (merged)

## Why this matters

AgentBox solves the "works on my machine" problem for AI agents. Instead of manually copying settings, skills, and context, you package everything once and share it. This is especially useful for:

- Onboarding teammates to a project's AI workflow
- Migrating to a new machine
- Sharing proven agent configurations
- Backing up your agent state
- Experimenting with different configurations safely (project-scoped)

The key insight: agent configurations are valuable artifacts worth preserving and sharing, just like code.
