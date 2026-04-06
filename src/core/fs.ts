import { access, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

export async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function readJsonIfExists<T>(targetPath: string): Promise<T | null> {
  try {
    if (!(await pathExists(targetPath))) {
      return null;
    }
    const raw = await readFile(targetPath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function readTextIfExists(targetPath: string): Promise<string | null> {
  try {
    if (!(await pathExists(targetPath))) {
      return null;
    }
    return await readFile(targetPath, "utf8");
  } catch {
    return null;
  }
}

export async function countDirectoryEntries(targetPath: string, kind: "file" | "directory" | "any" = "any"): Promise<number> {
  try {
    if (!(await pathExists(targetPath))) {
      return 0;
    }
    const entries = await readdir(targetPath, { withFileTypes: true });
    if (kind === "any") {
      return entries.length;
    }
    return entries.filter((entry) => (kind === "file" ? entry.isFile() : entry.isDirectory())).length;
  } catch {
    return 0;
  }
}

export async function listDirectoryNames(targetPath: string, limit = 50): Promise<string[]> {
  try {
    if (!(await pathExists(targetPath))) {
      return [];
    }
    const entries = await readdir(targetPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .slice(0, limit)
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

export async function listFileNames(targetPath: string, limit = 50): Promise<string[]> {
  try {
    if (!(await pathExists(targetPath))) {
      return [];
    }
    const entries = await readdir(targetPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .slice(0, limit)
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

export async function listMarkdownFilesRecursive(targetPath: string, limit = 100): Promise<string[]> {
  try {
    if (!(await pathExists(targetPath))) {
      return [];
    }

    const results: string[] = [];
    await walk(targetPath, async (entryPath, isDirectory) => {
      if (results.length >= limit) {
        return;
      }
      if (!isDirectory && entryPath.toLowerCase().endsWith(".md")) {
        results.push(entryPath);
      }
    });

    return results;
  } catch {
    return [];
  }
}

export async function listFilesRecursive(
  targetPath: string,
  limit = 100,
  filter?: (entryPath: string) => boolean
): Promise<string[]> {
  try {
    if (!(await pathExists(targetPath))) {
      return [];
    }

    const results: string[] = [];
    await walk(targetPath, async (entryPath, isDirectory) => {
      if (results.length >= limit || isDirectory) {
        return;
      }
      if (!filter || filter(entryPath)) {
        results.push(entryPath);
      }
    });

    return results;
  } catch {
    return [];
  }
}

export async function listRecentFiles(targetPath: string, limit = 20, extensions?: string[]): Promise<string[]> {
  try {
    if (!(await pathExists(targetPath))) {
      return [];
    }

    const files = await listFilesRecursive(targetPath, Math.max(limit * 5, limit), (entryPath) => {
      if (!extensions || extensions.length === 0) {
        return true;
      }
      const lower = entryPath.toLowerCase();
      return extensions.some((extension) => lower.endsWith(extension.toLowerCase()));
    });

    const withStats = await Promise.all(
      files.map(async (filePath) => {
        try {
          return { filePath, mtimeMs: (await stat(filePath)).mtimeMs };
        } catch {
          return { filePath, mtimeMs: 0 };
        }
      })
    );

    return withStats
      .filter((entry) => entry.mtimeMs > 0)
      .sort((left, right) => right.mtimeMs - left.mtimeMs)
      .slice(0, limit)
      .map((entry) => entry.filePath);
  } catch {
    return [];
  }
}

export async function readTextPreview(targetPath: string, maxChars = 600): Promise<string | null> {
  try {
    if (!(await pathExists(targetPath))) {
      return null;
    }
    const raw = await readFile(targetPath, "utf8");
    const normalized = raw.replace(/\r\n/g, "\n").trim();
    if (!normalized) {
      return null;
    }
    return normalized.length > maxChars ? `${normalized.slice(0, maxChars - 3)}...` : normalized;
  } catch {
    return null;
  }
}

export async function readJsonlTail<T>(targetPath: string, limit = 20): Promise<T[]> {
  try {
    if (!(await pathExists(targetPath))) {
      return [];
    }

    const raw = await readFile(targetPath, "utf8");
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .slice(-limit);

    const results: T[] = [];
    for (const line of lines) {
      try {
        results.push(JSON.parse(line) as T);
      } catch {
        // Ignore malformed lines for best-effort history extraction.
      }
    }
    return results;
  } catch {
    return [];
  }
}

export async function detectFormat(targetPath: string): Promise<
  "file" | "directory" | "json" | "yaml" | "toml" | "markdown" | "sqlite" | "unknown"
> {
  try {
    if (!(await pathExists(targetPath))) {
      return "unknown";
    }
    const info = await stat(targetPath);
    if (info.isDirectory()) {
      return "directory";
    }

    const lower = targetPath.toLowerCase();
    if (lower.endsWith(".json")) {
      return "json";
    }
    if (lower.endsWith(".yaml") || lower.endsWith(".yml")) {
      return "yaml";
    }
    if (lower.endsWith(".toml")) {
      return "toml";
    }
    if (lower.endsWith(".md")) {
      return "markdown";
    }
    if (lower.endsWith(".sqlite") || lower.endsWith(".db")) {
      return "sqlite";
    }
    return "file";
  } catch {
    return "unknown";
  }
}

async function walk(
  root: string,
  visit: (entryPath: string, isDirectory: boolean) => Promise<void>
): Promise<void> {
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    await visit(entryPath, entry.isDirectory());
    if (entry.isDirectory()) {
      await walk(entryPath, visit);
    }
  }
}
