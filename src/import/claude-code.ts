import path from "node:path";
import { homedir } from "node:os";
import { mkdir, writeFile } from "node:fs/promises";
import { toYaml } from "../core/yaml.js";
import type { ResolvedSnapshot } from "../core/types.js";
import {
  buildPortableMemoryMarkdown,
  buildPortableMemoryPreview,
  buildPortableSessionMarkdown,
  buildPortableSessionPreview,
  buildPortableSkillsPreview
} from "./portable.js";
import type { ImportContext, ImportPreviewResult } from "./types.js";

export async function generateClaudeCodePreview(
  outputDir: string,
  resolved: ResolvedSnapshot,
  context: ImportContext
): Promise<ImportPreviewResult> {
  await mkdir(outputDir, { recursive: true });

  const warnings: string[] = [];
  const settingsJson = buildClaudeSettingsPreview(resolved, context, warnings);
  const summaryYaml = buildClaudeSummary(resolved, context, warnings);
  const profileMarkdown = buildClaudeProfilePreview(resolved, context, warnings);
  const skillsYaml = buildPortableSkillsPreview(resolved, context.sourceHost);
  const memoryYaml = buildPortableMemoryPreview(resolved, context.sourceHost);
  const memoryMarkdown = buildPortableMemoryMarkdown(resolved, context.sourceHost);
  const sessionYaml = buildPortableSessionPreview(resolved, context.sourceHost);

  // Build session markdown with actual file content extraction
  const sessionMarkdown = await buildPortableSessionMarkdown(resolved, context.sourceHost, context.tempDir);

  const files = {
    settings: path.join(outputDir, "settings.json"),
    skills: path.join(outputDir, "skills.yaml"),
    memoryYaml: path.join(outputDir, "memory.yaml"),
    memoryMarkdown: path.join(outputDir, "memory.md"),
    sessionYaml: path.join(outputDir, "session.yaml"),
    sessionMarkdown: path.join(outputDir, "session.md"),
    summary: path.join(outputDir, "summary.yaml"),
    profile: path.join(outputDir, "profile.md")
  };
  const generatedFiles = Object.values(files);
  const plan = [
    {
      sourceLayer: "preferences, plugins, tools, securityPolicy, bindings",
      targetPath: files.settings,
      action: "create-preview" as const,
      risk: "medium" as const,
      notes: ["Represents translated Claude Code settings preview; not yet written to ~/.claude/settings.json."]
    },
    {
      sourceLayer: "skills",
      targetPath: files.skills,
      action: "create-preview" as const,
      risk: "low" as const,
      notes: ["Portable skills inventory translated for Claude Code review and later apply."]
    },
    {
      sourceLayer: "memory",
      targetPath: files.memoryYaml,
      action: "create-preview" as const,
      risk: "low" as const,
      notes: ["Structured portable memory preview for machine-readable migration."]
    },
    {
      sourceLayer: "memory",
      targetPath: files.memoryMarkdown,
      action: "create-preview" as const,
      risk: "low" as const,
      notes: ["Human-readable memory excerpts that can be reattached to Claude-visible docs."]
    },
    {
      sourceLayer: "session",
      targetPath: files.sessionYaml,
      action: "create-preview" as const,
      risk: "low" as const,
      notes: ["Structured portable session preview for machine-readable migration."]
    },
    {
      sourceLayer: "session",
      targetPath: files.sessionMarkdown,
      action: "create-preview" as const,
      risk: "low" as const,
      notes: ["Human-readable session summary for Claude review after import."]
    },
    {
      sourceLayer: "warnings",
      targetPath: files.summary,
      action: "create-preview" as const,
      risk: "low" as const,
      notes: ["Human-readable import summary for review."]
    },
    {
      sourceLayer: "profile",
      targetPath: files.profile,
      action: "create-preview" as const,
      risk: "low" as const,
      notes: ["Preview of CLAUDE.md-style profile content."]
    }
  ];

  await writeFile(files.settings, `${JSON.stringify(settingsJson, null, 2)}\n`, "utf8");
  await writeFile(files.skills, toYaml(skillsYaml), "utf8");
  await writeFile(files.memoryYaml, toYaml(memoryYaml), "utf8");
  await writeFile(files.memoryMarkdown, memoryMarkdown, "utf8");
  await writeFile(files.sessionYaml, toYaml(sessionYaml), "utf8");
  await writeFile(files.sessionMarkdown, sessionMarkdown, "utf8");
  await writeFile(files.summary, toYaml(summaryYaml), "utf8");
  await writeFile(files.profile, profileMarkdown, "utf8");

  const reportPath = path.join(outputDir, "report.yaml");
  const report = {
    targetHost: "claude-code",
    targetScope: "user",
    generatedFiles,
    warnings
  };
  await writeFile(reportPath, toYaml(report), "utf8");

  return {
    targetHost: "claude-code",
    outputDir,
    generatedFiles,
    warnings,
    plan
  };
}

function buildClaudeSettingsPreview(
  resolved: ResolvedSnapshot,
  context: ImportContext,
  warnings: string[]
): Record<string, unknown> {
  const plugins = resolved.plugins as Record<string, unknown>;
  const tools = resolved.tools as Record<string, unknown>;

  const settings: Record<string, unknown> = {
    enabledPlugins: plugins.enabledPlugins ?? {},
    extraKnownMarketplaces: plugins.extraKnownMarketplaces ?? {}
  };

  if (tools.mcpServers && Object.keys(tools.mcpServers as Record<string, unknown>).length > 0) {
    settings.mcpServers = replaceTemplatesInObject(tools.mcpServers as Record<string, unknown>, context.bindings);
  }

  warnings.push("Only portable content (plugins, MCP servers) included. Model/API settings preserved from target environment.");

  return settings;
}

function buildClaudeSummary(
  resolved: ResolvedSnapshot,
  context: ImportContext,
  warnings: string[]
): Record<string, unknown> {
  return {
    sourceHost: context.sourceHost,
    targetHost: context.targetHost,
    pluginCount: Object.keys(((resolved.plugins as Record<string, unknown>).enabledPlugins as Record<string, unknown> | undefined) ?? {}).length,
    skillNames:
      (resolved.skills as Record<string, unknown>).installedSkillNames ??
      (resolved.skills as Record<string, unknown>).sharedSkillNames ??
      [],
    bindingsProvided: Object.keys(context.bindings),
    warnings
  };
}

function buildClaudeProfilePreview(
  resolved: ResolvedSnapshot,
  context: ImportContext,
  warnings: string[]
): string {
  const profile = resolved.profile as Record<string, unknown>;
  const content =
    (typeof profile.projectInstructionContent === "string" && profile.projectInstructionContent) ||
    (typeof profile.userInstructionContent === "string" && profile.userInstructionContent) ||
    (typeof profile.projectInstructionPreview === "string" && profile.projectInstructionPreview) ||
    (typeof profile.userInstructionPreview === "string" && profile.userInstructionPreview) ||
    "";

  if (!content) {
    warnings.push("No source profile text was available; generated CLAUDE preview contains summary only.");
  }

  return [
    "# CLAUDE Preview",
    "",
    `Imported from source host: ${context.sourceHost}`,
    "",
    content || "No portable profile text was captured in the current snapshot."
  ].join("\n");
}

function replaceTemplatesInObject(obj: Record<string, unknown>, bindings: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result[key] = replaceTemplates(value, bindings);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) => (typeof item === "string" ? replaceTemplates(item, bindings) : item));
    } else if (value && typeof value === "object") {
      result[key] = replaceTemplatesInObject(value as Record<string, unknown>, bindings);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function replaceTemplates(text: string, bindings: Record<string, string>): string {
  let result = text;
  // Replace standard path templates
  result = result.replace(/\{\{HOME\}\}/g, homedir().replace(/\\/g, "\\\\"));
  // Replace user bindings
  for (const [key, value] of Object.entries(bindings)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}
