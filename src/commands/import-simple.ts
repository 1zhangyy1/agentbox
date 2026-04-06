import path from "node:path";
import os from "node:os";
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { parse } from "yaml";
import { extractArchiveToDirectory } from "../core/archive.js";
import { pathExists } from "../core/fs.js";
import { ClaudeCodeProbe } from "../probes/claude-code.js";
import { generateClaudeCodePreview } from "../import/claude-code.js";
import type { SupportedHost, ResolvedSnapshot } from "../core/types.js";

export interface ImportSimpleCommandOptions {
  force?: boolean;
  host?: SupportedHost;
}

export async function importSimpleCommand(
  bundlePath: string,
  options: ImportSimpleCommandOptions
): Promise<void> {
  const cwd = process.cwd();
  const homeDir = os.homedir();
  const agentboxDir = path.join(cwd, ".agentbox");

  console.log(`Importing agent configuration from: ${bundlePath}`);

  // Step 1: Unpack
  await extractArchiveToDirectory(bundlePath, agentboxDir);
  console.log(`Unpacked to: ${agentboxDir}`);

  // Step 2: Read snapshot
  const resolvedPath = path.join(agentboxDir, "resolved.yaml");
  const resolved = parse(await readFile(resolvedPath, "utf8")) as ResolvedSnapshot;

  // Step 3: Detect target host
  const probes = [new ClaudeCodeProbe()];
  let targetHost: SupportedHost = options.host ?? "claude-code";

  if (!options.host) {
    for (const probe of probes) {
      const detection = await probe.detect({ homeDir, cwd, sessionMode: "portable" });
      if (detection) {
        targetHost = detection.host;
        break;
      }
    }
  }

  console.log(`Target host: ${targetHost}`);

  // Step 4: Generate preview files
  const previewDir = path.join(agentboxDir, "preview");
  await generateClaudeCodePreview(previewDir, resolved, {
    sourceHost: resolved.host.id,
    targetHost,
    bindings: {},
    tempDir: agentboxDir
  });
  console.log(`Generated preview files in: ${previewDir}`);

  // Step 5: Import based on target host
  if (targetHost === "claude-code") {
    await importToClaudeCode(resolved, homeDir, cwd, options.force);
  } else {
    throw new Error(`Unsupported target host: ${targetHost}`);
  }

  console.log(`\nImport complete!`);
}

async function importToClaudeCode(
  resolved: ResolvedSnapshot,
  homeDir: string,
  cwd: string,
  force?: boolean
): Promise<void> {
  const projectClaudeDir = path.join(cwd, ".claude");
  const profile = resolved.profile as Record<string, unknown>;
  const plugins = resolved.plugins as Record<string, unknown>;
  const tools = resolved.tools as Record<string, unknown>;

  // Import CLAUDE.md
  const projectInstruction = profile.projectInstructionContent as string | null;
  if (projectInstruction) {
    const targetPath = path.join(cwd, "CLAUDE.md");
    if (force || !(await pathExists(targetPath))) {
      await writeFile(targetPath, projectInstruction, "utf8");
      console.log(`Wrote: ${targetPath}`);
    }
  }

  // Import settings.local.json (project-level, not user-level)
  const settingsPath = path.join(projectClaudeDir, "settings.local.json");
  let settings: Record<string, unknown> = {};

  if (await pathExists(settingsPath)) {
    settings = JSON.parse(await readFile(settingsPath, "utf8"));
  }

  if (plugins.enabledPlugins) {
    settings.enabledPlugins = { ...(settings.enabledPlugins as object || {}), ...(plugins.enabledPlugins as object) };
  }
  if (tools.mcpServers) {
    settings.mcpServers = { ...(settings.mcpServers as object || {}), ...replaceTemplates(tools.mcpServers as Record<string, unknown>, homeDir) };
  }

  await mkdir(projectClaudeDir, { recursive: true });
  await writeFile(settingsPath, JSON.stringify(settings, null, 2), "utf8");
  console.log(`Updated: ${settingsPath}`);
}

function replaceTemplates(obj: Record<string, unknown>, homeDir: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result[key] = value.replace(/\{\{HOME\}\}/g, homeDir);
    } else if (value && typeof value === "object") {
      result[key] = replaceTemplates(value as Record<string, unknown>, homeDir);
    } else {
      result[key] = value;
    }
  }
  return result;
}
