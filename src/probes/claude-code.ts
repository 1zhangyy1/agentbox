import path from "node:path";
import fs from "node:fs/promises";
import { createEmptyResolvedSnapshot, createEmptySources } from "../core/schemas.js";
import { countDirectoryEntries, detectFormat, listDirectoryNames, listMarkdownFilesRecursive, listRecentFiles, readJsonIfExists, readTextIfExists, readTextPreview, pathExists } from "../core/fs.js";
import type { BindingRequirement, HostArtifact, SessionCaptureMode } from "../core/types.js";
import type { HostDetection, HostProbe, ProbeContext } from "../collector/probe.js";

export class ClaudeCodeProbe implements HostProbe {
  readonly host = "claude-code" as const;

  async detect(context: ProbeContext): Promise<HostDetection | null> {
    const settingsPath = path.join(context.homeDir, ".claude", "settings.json");
    if (!(await pathExists(settingsPath))) {
      return null;
    }
    return {
      host: this.host,
      confidence: 0.9,
      reason: `Found ${settingsPath}`
    };
  }

  async collect(context: ProbeContext) {
    const resolved = createEmptyResolvedSnapshot(this.host);
    const sources = createEmptySources();

    // Collect from user-level settings
    const userSettingsPath = path.join(context.homeDir, ".claude", "settings.json");
    const parsed = await readJsonIfExists<Record<string, unknown>>(userSettingsPath);
    if (parsed) {
      resolved.plugins = {
        enabledPlugins: parsed.enabledPlugins ?? {},
        extraKnownMarketplaces: parsed.extraKnownMarketplaces ?? {}
      };
      resolved.tools = {
        mcpPermissions: {},
        mcpServers: parsed.mcpServers ?? {}
      };
      sources.records.push(
        { key: "host.plugins", sourcePath: userSettingsPath, layer: "plugins", origin: "user" },
        { key: "host.tools", sourcePath: userSettingsPath, layer: "tools", origin: "user" }
      );
    }

    resolved.profile = await collectClaudeProfile(context);
    resolved.memory = await collectClaudeMemory(context);
    resolved.session = await collectClaudeSession(context);
    resolved.skills = await collectSharedSkills(context);

    const artifacts = await collectClaudeArtifacts(context);
    resolved.hostArtifacts.push(...artifacts);
    sources.records.push(
      { key: "profile.currentProject", sourcePath: path.join(context.cwd, "CLAUDE.md"), layer: "profile", origin: "project" },
      { key: "profile.user", sourcePath: path.join(context.homeDir, ".claude", "CLAUDE.md"), layer: "profile", origin: "user" },
      { key: "memory.projects", sourcePath: path.join(context.homeDir, ".claude", "projects"), layer: "memory", origin: "user", note: "Scoped to current project directory" },
      { key: "session.root", sourcePath: path.join(context.homeDir, ".claude"), layer: "session", origin: "user" },
      { key: "skills.shared", sourcePath: path.join(context.homeDir, ".agents"), layer: "skills", origin: "user" }
    );

    return { resolved, sources };
  }
}

async function collectClaudeProfile(context: ProbeContext): Promise<Record<string, unknown>> {
  const projectClaudePath = path.join(context.cwd, "CLAUDE.md");
  const userClaudePath = path.join(context.homeDir, ".claude", "CLAUDE.md");
  const projectRulesPath = path.join(context.cwd, ".claude");
  const projectClaude = await readTextIfExists(projectClaudePath);
  const userClaude = await readTextIfExists(userClaudePath);

  return {
    projectInstructionPath: (await pathExists(projectClaudePath)) ? projectClaudePath : null,
    projectInstructionContent: projectClaude ?? null,
    projectInstructionPreview: projectClaude ? projectClaude.slice(0, 280) : null,
    userInstructionPath: (await pathExists(userClaudePath)) ? userClaudePath : null,
    userInstructionContent: userClaude ?? null,
    userInstructionPreview: userClaude ? userClaude.slice(0, 280) : null,
    projectConfigDirExists: await pathExists(projectRulesPath)
  };
}

async function collectClaudeMemory(context: ProbeContext): Promise<Record<string, unknown>> {
  const projectsRoot = path.join(context.homeDir, ".claude", "projects");

  // Claude Code encodes the project path as: ':' → '-', '\' or '/' → '-'
  // e.g. D:\zhangyy\AIzyyai\agentbox → D--zhangyy-AIzyyai-agentbox
  const projectDirName = context.cwd.replace(/:/g, "-").replace(/[/\\]/g, "-");
  const projectMemoryRoot = path.join(projectsRoot, projectDirName, "memory");

  if (await pathExists(projectMemoryRoot)) {
    const markdownFiles = await listMarkdownFilesRecursive(projectMemoryRoot, 40);
    const recentMarkdownFiles = await listRecentFiles(projectMemoryRoot, 8, [".md"]);
    const memoryExcerpts = await Promise.all(
      recentMarkdownFiles.map(async (filePath) => ({
        path: filePath,
        preview: await readTextPreview(filePath, 360)
      }))
    );
    const validExcerpts = memoryExcerpts.filter((entry) => entry.preview);
    return {
      projectMemoryRoot,
      markdownFileCount: markdownFiles.length,
      sampleMemoryFiles: markdownFiles.slice(0, 12),
      memoryExcerpts: validExcerpts,
      portableSummary:
        validExcerpts.length > 0
          ? `Captured ${validExcerpts.length} memory files from current project (${projectDirName}).`
          : "Current project memory directory exists but contains no markdown files."
    };
  }

  // Fallback: no memory directory found for this project
  const projectDirs = await listDirectoryNames(projectsRoot, 200);
  return {
    projectMemoryRoot: null,
    projectCount: projectDirs.length,
    sampleProjects: projectDirs.slice(0, 10),
    markdownFileCount: 0,
    sampleMemoryFiles: [],
    memoryExcerpts: [],
    portableSummary: `No memory directory found for current project (${projectDirName}). ${projectDirs.length} total project(s) exist in ~/.claude/projects.`
  };
}

async function collectClaudeSession(context: ProbeContext): Promise<Record<string, unknown>> {
  const claudeRoot = path.join(context.homeDir, ".claude");
  const projectsRoot = path.join(claudeRoot, "projects");
  const projectDirName = context.cwd.replace(/:/g, "-").replace(/[/\\]/g, "-");
  const projectSessionRoot = path.join(projectsRoot, projectDirName);

  // Collect full session files for current project
  const transcriptFiles = await listRecentFiles(projectSessionRoot, 50, [".jsonl"]);

  // Extract slugs from session files to find related plans
  const slugs = await extractSlugsFromTranscripts(transcriptFiles);
  const plansRoot = path.join(claudeRoot, "plans");
  const planFiles = await collectPlansBySlugs(plansRoot, slugs);

  const result: Record<string, unknown> = {
    captureMode: "full",
    projectSessionRoot,
    transcriptFiles: transcriptFiles.map(f => ({ path: f })),
    planFiles: planFiles.map(f => ({ path: f })),
    extractedSlugs: Array.from(slugs),
    portableSummary: `Captured ${transcriptFiles.length} transcripts and ${planFiles.length} plans (from ${slugs.size} unique slugs) from current project.`
  };

  return result;
}

async function extractSlugsFromTranscripts(transcriptFiles: string[]): Promise<Set<string>> {
  const slugs = new Set<string>();

  for (const transcriptPath of transcriptFiles) {
    try {
      const content = await fs.readFile(transcriptPath, "utf-8");
      const lines = content.split("\n").filter((line: string) => line.trim());

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (entry.slug && typeof entry.slug === "string") {
            slugs.add(entry.slug);
          }
        } catch {
          // Skip malformed JSON lines
        }
      }
    } catch {
      // Skip files that can't be read
    }
  }

  return slugs;
}

async function collectPlansBySlugs(plansRoot: string, slugs: Set<string>): Promise<string[]> {
  const planFiles: string[] = [];

  if (!(await pathExists(plansRoot))) {
    return planFiles;
  }

  for (const slug of slugs) {
    const planPath = path.join(plansRoot, `${slug}.md`);
    if (await pathExists(planPath)) {
      planFiles.push(planPath);
    }
  }

  return planFiles;
}

async function collectSharedSkills(context: ProbeContext): Promise<Record<string, unknown>> {
  const lockPath = path.join(context.homeDir, ".agents", ".skill-lock.json");
  const sharedSkillsRoot = path.join(context.homeDir, ".agents", "skills");
  const hostSkillsRoot = path.join(context.homeDir, ".claude", "skills");
  const lock = await readJsonIfExists<Record<string, unknown>>(lockPath);
  const installedSkillNames = await listDirectoryNames(sharedSkillsRoot, 100);
  const hostLinkedSkillNames = await listDirectoryNames(hostSkillsRoot, 100);

  return {
    sharedRoot: sharedSkillsRoot,
    installedSkillCount: installedSkillNames.length,
    installedSkillNames,
    hostLinkedSkillCount: hostLinkedSkillNames.length,
    hostLinkedSkillNames,
    lockfilePath: (await pathExists(lockPath)) ? lockPath : null,
    lockfileSkills: lock && typeof lock.skills === "object" ? lock.skills : {}
  };
}

async function collectClaudeArtifacts(context: ProbeContext): Promise<HostArtifact[]> {
  const root = path.join(context.homeDir, ".claude");
  const candidates = [
    { name: "plans", category: "session-plans", portability: "adaptable", sensitivity: "internal" },
    { name: "tasks", category: "session-tasks", portability: "adaptable", sensitivity: "internal" },
    { name: "todos", category: "session-todos", portability: "adaptable", sensitivity: "internal" },
    { name: "shell-snapshots", category: "shell-snapshots", portability: "host-specific", sensitivity: "internal" },
    { name: "transcripts", category: "transcripts", portability: "opaque", sensitivity: "sensitive" },
    { name: "ide", category: "ide-locks", portability: "opaque", sensitivity: "internal" }
  ] as const;

  const artifacts: HostArtifact[] = [];
  for (const candidate of candidates) {
    const artifactPath = path.join(root, candidate.name);
    if (await pathExists(artifactPath)) {
      artifacts.push({
        path: artifactPath,
        detectedFormat: await detectFormat(artifactPath),
        probableCategory: candidate.category,
        portability: candidate.portability,
        sensitivity: candidate.sensitivity
      });
    }
  }
  return artifacts;
}

function createBindingsFromEnvKeys(envKeys: string[]): BindingRequirement[] {
  return envKeys.map((envKey) => ({
    key: envKey,
    kind: envKey.includes("URL") ? "endpoint" : "secret",
    required: envKey.endsWith("TOKEN") || envKey.endsWith("KEY"),
    description: `Environment binding referenced by Claude Code settings: ${envKey}`
  }));
}

function pushBindings(target: BindingRequirement[], next: BindingRequirement[]): void {
  const seen = new Set(target.map((entry) => entry.key));
  for (const binding of next) {
    if (!seen.has(binding.key)) {
      target.push(binding);
      seen.add(binding.key);
    }
  }
}

function getClaudeSessionCaptureConfig(mode: SessionCaptureMode): {
  planLimit: number;
  planPreviewChars: number;
  todoLimit: number;
  todoPreviewChars: number;
  rawPlanLimit: number;
  rawPlanChars: number;
} {
  if (mode === "raw") {
    return {
      planLimit: 6,
      planPreviewChars: 1800,
      todoLimit: 6,
      todoPreviewChars: 1000,
      rawPlanLimit: 4,
      rawPlanChars: 6000
    };
  }
  if (mode === "rich") {
    return {
      planLimit: 5,
      planPreviewChars: 900,
      todoLimit: 5,
      todoPreviewChars: 500,
      rawPlanLimit: 0,
      rawPlanChars: 0
    };
  }
  return {
    planLimit: 3,
    planPreviewChars: 280,
    todoLimit: 0,
    todoPreviewChars: 0,
    rawPlanLimit: 0,
    rawPlanChars: 0
  };
}
