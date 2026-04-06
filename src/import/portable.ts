import type { ResolvedSnapshot } from "../core/types.js";
import { readFile } from "node:fs/promises";
import path from "node:path";

const SESSION_COUNT_KEYS = [
  "plansCount",
  "tasksCount",
  "todosCount",
  "transcriptsCount",
  "sessionsCount",
  "shellSnapshotsCount",
  "fileHistoryCount",
  "sessionFiles",
  "sqliteFiles"
];

const SESSION_BOOLEAN_KEYS = ["hasStateDb", "hasHistory", "hasSandbox", "hasSandboxSecrets"];

export function buildPortableSkillsPreview(
  resolved: ResolvedSnapshot,
  sourceHost: string
): Record<string, unknown> {
  const skills = resolved.skills as Record<string, unknown>;
  const sharedSkillNames = asArray(skills.sharedSkillNames);
  const installedSkillNames = asArray(skills.installedSkillNames);
  const hostLinkedSkillNames = asArray(skills.hostLinkedSkillNames);
  const vendorSkillCollections = asArray(skills.vendorSkillCollections);

  return {
    importedFrom: sourceHost,
    sharedRoot: skills.sharedRoot ?? null,
    sharedSkillNames,
    installedSkillNames,
    hostLinkedSkillNames,
    vendorSkillCollections,
    lockfilePath: skills.lockfilePath ?? null,
    lockfileSkills: asObject(skills.lockfileSkills),
    counts: {
      shared: sharedSkillNames.length,
      installed: installedSkillNames.length,
      hostLinked: hostLinkedSkillNames.length,
      vendorCollections: vendorSkillCollections.length
    }
  };
}

export function buildPortableMemoryPreview(
  resolved: ResolvedSnapshot,
  sourceHost: string
): Record<string, unknown> {
  const memory = resolved.memory as Record<string, unknown>;

  return {
    importedFrom: sourceHost,
    projectCount: memory.projectCount ?? null,
    markdownFileCount: memory.markdownFileCount ?? null,
    memoryFolderCount: memory.memoryFolderCount ?? null,
    memoriesRoot: memory.memoriesRoot ?? null,
    sampleProjects: asStringArray(memory.sampleProjects),
    sampleMemoryFiles: asStringArray(memory.sampleMemoryFiles),
    sampleMemoryFolders: asStringArray(memory.sampleMemoryFolders),
    portableSummary: asOptionalString(memory.portableSummary),
    memoryExcerpts: asPreviewEntries(memory.memoryExcerpts)
  };
}

export function buildPortableSessionPreview(
  resolved: ResolvedSnapshot,
  sourceHost: string
): Record<string, unknown> {
  const session = resolved.session as Record<string, unknown>;
  const preview: Record<string, unknown> = {
    importedFrom: sourceHost,
    captureMode: asOptionalString(session.captureMode),
    portableSummary: asOptionalString(session.portableSummary)
  };

  // Add file references for full content
  const transcriptFiles = asArray(session.transcriptFiles);
  if (transcriptFiles.length > 0) {
    preview.transcriptFiles = transcriptFiles;
    preview.transcriptCount = transcriptFiles.length;
  }

  const planFiles = asArray(session.planFiles);
  if (planFiles.length > 0) {
    preview.planFiles = planFiles;
    preview.planCount = planFiles.length;
  }

  const extractedSlugs = asArray(session.extractedSlugs);
  if (extractedSlugs.length > 0) {
    preview.extractedSlugs = extractedSlugs;
  }

  for (const key of SESSION_COUNT_KEYS) {
    if (typeof session[key] === "number") {
      preview[key] = session[key];
    }
  }

  const historyPath = asOptionalString(session.historyPath);
  if (historyPath) {
    preview.historyPath = historyPath;
  }

  const recentPrompts = asStringArray(session.recentPrompts);
  if (recentPrompts.length > 0) {
    preview.recentPrompts = recentPrompts;
  }

  const recentPlanPreviews = asPreviewEntries(session.recentPlanPreviews);
  if (recentPlanPreviews.length > 0) {
    preview.recentPlanPreviews = recentPlanPreviews;
  }

  const recentTodoPreviews = asPreviewEntries(session.recentTodoPreviews);
  if (recentTodoPreviews.length > 0) {
    preview.recentTodoPreviews = recentTodoPreviews;
  }

  const recentHistoryEntries = asSessionEntries(session.recentHistoryEntries);
  if (recentHistoryEntries.length > 0) {
    preview.recentHistoryEntries = recentHistoryEntries;
  }

  const rawHistoryEntries = asSessionEntries(session.rawHistoryEntries);
  if (rawHistoryEntries.length > 0) {
    preview.rawHistoryEntries = rawHistoryEntries;
  }

  const rawPlanDocuments = asDocumentEntries(session.rawPlanDocuments);
  if (rawPlanDocuments.length > 0) {
    preview.rawPlanDocuments = rawPlanDocuments;
  }

  for (const key of SESSION_BOOLEAN_KEYS) {
    if (typeof session[key] === "boolean") {
      preview[key] = session[key];
    }
  }

  return preview;
}

export function buildPortableMemoryMarkdown(
  resolved: ResolvedSnapshot,
  sourceHost: string
): string {
  const preview = buildPortableMemoryPreview(resolved, sourceHost);
  const lines = ["# Portable Memory Preview", "", `Imported from: ${sourceHost}`];

  const summary = asOptionalString(preview.portableSummary);
  if (summary) {
    lines.push("", "## Summary", "", summary);
  }

  const sampleProjects = asStringArray(preview.sampleProjects);
  if (sampleProjects.length > 0) {
    lines.push("", "## Sample Projects", "");
    for (const entry of sampleProjects) {
      lines.push(`- ${entry}`);
    }
  }

  const sampleMemoryFiles = asStringArray(preview.sampleMemoryFiles);
  if (sampleMemoryFiles.length > 0) {
    lines.push("", "## Sample Memory Files", "");
    for (const entry of sampleMemoryFiles) {
      lines.push(`- ${entry}`);
    }
  }

  const excerpts = asPreviewEntries(preview.memoryExcerpts);
  if (excerpts.length > 0) {
    lines.push("", "## Memory Excerpts", "");
    for (const entry of excerpts) {
      lines.push(`### ${entry.path}`, "", entry.preview, "");
    }
  } else {
    lines.push("", "## Memory Excerpts", "", "No portable memory excerpts were captured in this snapshot.");
  }

  return `${lines.join("\n").trim()}\n`;
}

export async function buildPortableSessionMarkdown(
  resolved: ResolvedSnapshot,
  sourceHost: string,
  tempDir?: string
): Promise<string> {
  const preview = buildPortableSessionPreview(resolved, sourceHost);
  const lines = ["# Portable Session Preview", "", `Imported from: ${sourceHost}`];
  const captureMode = asOptionalString(preview.captureMode);
  if (captureMode) {
    lines.push("", `Capture mode: ${captureMode}`);
  }

  const summary = asOptionalString(preview.portableSummary);
  if (summary) {
    lines.push("", "## Summary", "", summary);
  }

  // Extract and show recent messages from transcripts
  if (tempDir) {
    const transcriptFiles = asArray(preview.transcriptFiles);
    if (transcriptFiles.length > 0) {
      const recentMessages = await extractRecentMessagesFromFiles(tempDir, transcriptFiles, 5);
      if (recentMessages.length > 0) {
        lines.push("", "## Recent Messages (Latest 5)", "");
        for (const msg of recentMessages) {
          lines.push(`**[${msg.timestamp}] ${msg.role}**: ${msg.content}`, "");
        }
      }
    }

    // Extract and show plan summaries
    const planFiles = asArray(preview.planFiles);
    if (planFiles.length > 0) {
      const planSummaries = await extractPlanSummariesFromFiles(tempDir, planFiles);
      if (planSummaries.length > 0) {
        lines.push("", "## Current Plans", "");
        for (const plan of planSummaries) {
          lines.push(`### ${plan.title}`, "", plan.preview, "");
        }
      }
    }
  }

  // Show file references
  const transcriptFiles = asArray(preview.transcriptFiles);
  const planFiles = asArray(preview.planFiles);
  if (transcriptFiles.length > 0 || planFiles.length > 0) {
    lines.push("", "## Full Session Files", "");
    if (transcriptFiles.length > 0) {
      lines.push(`- ${transcriptFiles.length} transcript files available in bundle`);
    }
    if (planFiles.length > 0) {
      lines.push(`- ${planFiles.length} plan files available in bundle`);
    }
  }

  const extractedSlugs = asArray(preview.extractedSlugs);
  if (extractedSlugs.length > 0) {
    lines.push("", "## Plan Slugs", "");
    for (const slug of extractedSlugs) {
      if (typeof slug === "string") {
        lines.push(`- ${slug}`);
      }
    }
  }

  const countKeys = SESSION_COUNT_KEYS.filter((key) => typeof preview[key] === "number");
  if (countKeys.length > 0) {
    lines.push("", "## Session Counts", "");
    for (const key of countKeys) {
      lines.push(`- ${formatLabel(key)}: ${String(preview[key])}`);
    }
  }

  const recentPrompts = asStringArray(preview.recentPrompts);
  if (recentPrompts.length > 0) {
    lines.push("", "## Recent Prompts", "");
    for (const entry of recentPrompts) {
      lines.push(`- ${entry}`);
    }
  }

  const recentPlans = asPreviewEntries(preview.recentPlanPreviews);
  if (recentPlans.length > 0) {
    lines.push("", "## Recent Plan Previews", "");
    for (const entry of recentPlans) {
      lines.push(`### ${entry.path}`, "", entry.preview, "");
    }
  }

  const recentTodos = asPreviewEntries(preview.recentTodoPreviews);
  if (recentTodos.length > 0) {
    lines.push("", "## Recent Todo Previews", "");
    for (const entry of recentTodos) {
      lines.push(`### ${entry.path}`, "", entry.preview, "");
    }
  }

  const recentHistoryEntries = asSessionEntries(preview.recentHistoryEntries);
  if (recentHistoryEntries.length > 0) {
    lines.push("", "## Recent History Entries", "");
    for (const entry of recentHistoryEntries) {
      lines.push(`### ${entry.path ?? entry.sessionId ?? "history-entry"}`);
      if (entry.timestamp !== null) {
        lines.push("", `Timestamp: ${String(entry.timestamp)}`);
      }
      lines.push("", entry.text, "");
    }
  }

  const rawPlanDocuments = asDocumentEntries(preview.rawPlanDocuments);
  if (rawPlanDocuments.length > 0) {
    lines.push("", "## Raw Plan Documents", "");
    for (const entry of rawPlanDocuments) {
      lines.push(`### ${entry.path}`, "", entry.content, "");
    }
  }

  const rawHistoryEntries = asSessionEntries(preview.rawHistoryEntries);
  if (rawHistoryEntries.length > 0) {
    lines.push("", "## Raw History Entries", "");
    for (const entry of rawHistoryEntries) {
      lines.push(`### ${entry.path ?? entry.sessionId ?? "history-entry"}`);
      if (entry.timestamp !== null) {
        lines.push("", `Timestamp: ${String(entry.timestamp)}`);
      }
      lines.push("", entry.text, "");
    }
  }

  return `${lines.join("\n").trim()}\n`;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asStringArray(value: unknown): string[] {
  return asArray(value).filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}

function asPreviewEntries(value: unknown): Array<{ path: string; preview: string }> {
  return asArray(value)
    .map((entry) => asObject(entry))
    .map((entry) => ({
      path: asOptionalString(entry.path) ?? "unknown",
      preview: asOptionalString(entry.preview) ?? ""
    }))
    .filter((entry) => entry.preview.length > 0);
}

function asSessionEntries(
  value: unknown
): Array<{ path?: string; sessionId?: string | null; timestamp: number | null; text: string }> {
  return asArray(value)
    .map((entry) => asObject(entry))
    .map((entry) => ({
      path: asOptionalString(entry.path) ?? undefined,
      sessionId: asOptionalString(entry.sessionId),
      timestamp: typeof entry.timestamp === "number" ? entry.timestamp : null,
      text: asOptionalString(entry.text) ?? ""
    }))
    .filter((entry) => entry.text.length > 0);
}

function asDocumentEntries(value: unknown): Array<{ path: string; content: string }> {
  return asArray(value)
    .map((entry) => asObject(entry))
    .map((entry) => ({
      path: asOptionalString(entry.path) ?? "unknown",
      content: asOptionalString(entry.content) ?? ""
    }))
    .filter((entry) => entry.content.length > 0);
}

function formatLabel(key: string): string {
  return key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^\w/, (match) => match.toUpperCase());
}

async function extractRecentMessagesFromFiles(
  tempDir: string,
  transcriptFiles: unknown[],
  limit: number
): Promise<Array<{ timestamp: string; role: string; content: string }>> {
  const messages: Array<{ timestamp: string; role: string; content: string }> = [];

  // Read the first (most recent) transcript file
  if (transcriptFiles.length === 0) {
    return messages;
  }

  try {
    const firstFile = asObject(transcriptFiles[0]);
    const filePath = asOptionalString(firstFile.path);
    if (!filePath) return messages;

    // Convert portable path to actual path in temp dir
    const actualPath = path.join(tempDir, "session", "transcripts", path.basename(filePath));
    const content = await readFile(actualPath, "utf-8");
    const lines = content.split("\n").filter((line: string) => line.trim());

    // Parse JSONL and extract messages
    const entries = [];
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.type === "user" || entry.type === "assistant") {
          let text = "";
          if (entry.message && typeof entry.message.content === "string") {
            text = entry.message.content;
          } else if (entry.message && Array.isArray(entry.message.content)) {
            for (const block of entry.message.content) {
              if (block.type === "text" && typeof block.text === "string") {
                text += block.text + " ";
              }
            }
            text = text.trim();
          }

          if (text) {
            entries.push({
              timestamp: entry.timestamp || new Date().toISOString(),
              role: entry.type,
              text
            });
          }
        }
      } catch {
        // Skip malformed lines
      }
    }

    // Take last N entries and reverse to show newest first
    const recentEntries = entries.slice(-limit).reverse();
    for (const entry of recentEntries) {
      messages.push({
        timestamp: entry.timestamp,
        role: entry.role,
        content: entry.text.slice(0, 200)
      });
    }
  } catch {
    // Skip files that can't be read
  }

  return messages;
}

async function extractPlanSummariesFromFiles(
  tempDir: string,
  planFiles: unknown[]
): Promise<Array<{ title: string; preview: string }>> {
  const summaries: Array<{ title: string; preview: string }> = [];

  for (const file of planFiles) {
    try {
      const fileObj = asObject(file);
      const filePath = asOptionalString(fileObj.path);
      if (!filePath) continue;

      // Convert portable path to actual path in temp dir
      const actualPath = path.join(tempDir, "session", "plans", path.basename(filePath));
      const content = await readFile(actualPath, "utf-8");

      // Extract first heading as title
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : path.basename(filePath, ".md");

      // Extract first 400 chars as preview
      const preview = content.slice(0, 400).trim();

      summaries.push({ title, preview });
    } catch {
      // Skip files that can't be read
    }
  }

  return summaries;
}
