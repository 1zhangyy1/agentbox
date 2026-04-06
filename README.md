# AgentBox

AgentBox is a portable agent environment collector and packager.

Current implementation status:

- TypeScript CLI scaffold
- core schemas for `box`, `resolved`, and `sources`
- host probe interface
- initial `collect` command
- initial `inspect` command
- initial `pack` command
- initial `unpack` command
- initial `bind` command
- initial `import` preview command
- initial `apply` command
- initial probes for `claude-code`, `codex`, `cursor`, and `openclaw`
- redaction pipeline for collected snapshots
- `bindings.template.env` generation
- `security-audit.json` generation
- import preview coverage for profile, settings, skills, and memory summary layers

## Current Probe Coverage

### Claude Code

- settings and plugin metadata
- env key extraction into bindings
- current project and user profile detection
- project memory summary
- session summary counts
- shared skill lock and shared skills inventory
- host artifact discovery for plans, tasks, todos, transcripts, shell snapshots, and IDE state

### Codex

- `config.toml` preferences and MCP servers
- provider env key extraction into bindings
- version metadata from `version.json`
- project profile detection
- memory/session summary
- shared and Codex-local skill inventory
- host artifact discovery for sandbox, auth, state db, and vendor imports

### Cursor

- `mcp.json` tool extraction
- extension inventory summary
- project/snapshot counts
- artifact discovery for analytics, browser logs, and IDE state

## Commands

Install dependencies:

```bash
npm install
```

Run typecheck:

```bash
npm run typecheck
```

Run the smoke regression suite:

```bash
npm run smoke
```

Enable the networked installer path inside the smoke test:

```bash
AGENTBOX_ENABLE_NETWORK_SMOKE=1 npm run smoke
```

Run a collect:

```bash
npm run collect -- --host codex --output ./snapshot-codex --name codex-box
```

Inspect a collected snapshot:

```bash
npx tsx src/cli.ts inspect ./snapshot-codex
```

Pack a collected snapshot into a distributable bundle:

```bash
npx tsx src/cli.ts pack ./snapshot-codex --output ./dist/codex-box.agentbox
```

Unpack a bundle into a staging directory:

```bash
npx tsx src/cli.ts unpack ./dist/codex-box.agentbox --output ./staging/codex-box
```

Resolve bindings for a staging directory:

```bash
npx tsx src/cli.ts bind ./staging/codex-box --set APIROUTER_API_KEY=your-key
```

Resolve bindings from a dotenv file and fail if required values are still missing:

```bash
npx tsx src/cli.ts bind ./staging/codex-box --env-file ./.env.agentbox --require-complete
```

Generate a host-native import preview from a staging directory:

```bash
npx tsx src/cli.ts import ./staging/claude-box --host codex --output ./import-preview/claude-to-codex
```

Generate a project-scoped preview instead of the host default:

```bash
npx tsx src/cli.ts import ./staging/claude-box --host codex --scope project --output ./import-preview/claude-to-codex-project
```

Apply an import preview into a target directory:

```bash
npx tsx src/cli.ts apply ./import-preview/claude-to-codex --execute --target-root ./apply-targets/claude-to-codex
```

Apply directly into real host-style paths under a project root:

```bash
npx tsx src/cli.ts apply ./import-preview/claude-to-codex-project --execute --real-home --project-root ./my-project --scope project
```

Install skills from a generated skill install plan:

```bash
npx tsx src/cli.ts install-skills ./import-preview/claude-to-codex --execute --target-root ./skill-targets/claude-to-codex
```

Install skills into real host-style paths under a project root:

```bash
npx tsx src/cli.ts install-skills ./import-preview/claude-to-codex-project --execute --real-home --project-root ./my-project --scope project
```

The generated import preview now includes host-native config plus portable layer files for:

- `skills.preview.yaml`
- `memory.preview.yaml`
- `memory.preview.md`
- `session.preview.yaml`
- `session.preview.md`
- `skill-install-plan.yaml`
- `compatibility-report.yaml`
- host summary files such as `import-summary.yaml`

`skill-install-plan.yaml` is the current bridge between portable skill metadata and real reconstruction. It records source URLs, expected hashes when available, target-host install roots, and manual-review items for skills that cannot yet be reinstalled automatically.

`install-skills` executes that plan into an explicit target directory. It currently clones source repositories, extracts the skill folder pointed to by `skillPath`, and writes an `agentbox-skill-install-report.yaml` file. It does not mutate real host home directories automatically.

When activation succeeds, AgentBox also writes `agentbox-skill-activation-map.yaml` so the target directory clearly shows which host-visible skill entries were linked or copied into place.

`compatibility-report.yaml` summarizes whether the preview is blocked, ready, or ready-with-warnings, including missing required bindings and manual migration steps.

Session collection modes:

- `portable`: counts + compact recent excerpts suitable for safe sharing
- `rich`: more recent prompts/plans/todos for stronger context handoff
- `raw`: recent raw session entries/documents embedded into the snapshot after redaction

Example:

```bash
npx tsx src/cli.ts collect --session-mode rich --output ./snapshot-rich
```

Default install scope by host:

- `codex`: `user`
- `claude-code`: `user`
- `openclaw`: `project`

You can override that default with `--scope user` or `--scope project` during `import`, `apply`, and `install-skills`.

## Current Output

`collect` writes a directory snapshot with:

- `box.yaml`
- `resolved.yaml`
- `sources.yaml`
- `layers/*.yaml`
- `bindings.template.env`
- `meta/security-audit.json`

Example snapshots already generated in this workspace:

- `snapshot-claude/`
- `snapshot-codex/`
- `snapshot-cursor/`

Example bundles already generated in this workspace:

- `dist/codex-box.agentbox`
- `dist/claude-box.agentbox`

Example unpacked staging output already generated in this workspace:

- `staging/codex-box/`
- `staging/claude-box/`

Example import previews already generated in this workspace:

- `import-preview/claude-to-codex/`
- `import-preview/codex-to-claude/`
- `import-preview/claude-to-openclaw/`

Example apply targets already generated in this workspace:

- `apply-targets/claude-to-codex/`

## Current Limitations

- `unpack` only extracts to staging; it does not import into host-native locations yet
- `bind` is currently non-interactive; it resolves values from `--set` and optional process env
- host probes are partial and intentionally conservative
- unknown host artifact fallback is implemented at the metadata level
- import currently generates host-native preview files only; it does not write into real host config locations yet
- memory import is currently a portable summary/inventory preview, not a full semantic memory replay
- skills import now includes a reconstruction plan and a target-root installer, but still does not mutate real host home directories automatically
- `apply` and `install-skills` can now target real host-style paths, but the safest default remains sandbox mode
- compatibility is reported explicitly, but some host behaviors still require manual review
- cross-host adapters are currently implemented only for preview targets `codex`, `claude-code`, and `openclaw`
- full real-home user-scope installs should still be used carefully, because they write into live host paths

## Current Safety Behavior

- machine-specific paths are normalized into placeholders like `{{HOME}}` and `{{PROJECT_ROOT}}`
- token-like values are redacted if they appear in collected string fields
- live secrets are not written into `bindings.template.env`
- required bindings are emitted as placeholder keys only
- every redaction is logged in `meta/security-audit.json`

## Important Design Notes

- secrets are not exported as live values
- collector output is organized by normalized layers
- the goal is not to enumerate every host field in advance
- future host changes should be handled through structured extraction plus artifact fallback
