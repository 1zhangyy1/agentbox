import path from "node:path";
import type { BindingRequirement, ResolvedSnapshot, SourceSnapshot } from "./types.js";

export interface RedactionEvent {
  kind: "path" | "token-like" | "url-credential" | "binding-template";
  location: string;
  beforePreview: string;
  afterPreview: string;
  reason: string;
}

export interface SecurityAudit {
  generatedAt: string;
  rulesVersion: string;
  eventCount: number;
  events: RedactionEvent[];
}

export interface RedactionContext {
  homeDir: string;
  cwd: string;
}

export interface RedactionResult {
  resolved: ResolvedSnapshot;
  sources: SourceSnapshot;
  audit: SecurityAudit;
  bindingsTemplate: string;
}

const TOKEN_LIKE_PATTERNS: RegExp[] = [
  /\b(sk|ghp|ghu|github_pat|cr)_[A-Za-z0-9_\-]{12,}\b/g,
  /\bAIza[0-9A-Za-z\-_]{20,}\b/g
];

const URL_CREDENTIAL_PATTERN = /https?:\/\/[^/\s:@]+:[^@\s/]+@/g;

export function redactCollectedData(
  context: RedactionContext,
  resolved: ResolvedSnapshot,
  sources: SourceSnapshot
): RedactionResult {
  const events: RedactionEvent[] = [];
  const clonedResolved = deepClone(resolved);
  const clonedSources = deepClone(sources);

  const redactString = (value: string, location: string): string => {
    let next = value;

    if (containsPathLike(value, context.homeDir)) {
      const before = next;
      next = normalizeKnownPaths(next, context);
      if (next !== before) {
        events.push({
          kind: "path",
          location,
          beforePreview: preview(before),
          afterPreview: preview(next),
          reason: "Normalized machine-specific path."
        });
      }
    }

    for (const pattern of TOKEN_LIKE_PATTERNS) {
      const before = next;
      next = next.replace(pattern, "{{REDACTED_SECRET}}");
      if (next !== before) {
        events.push({
          kind: "token-like",
          location,
          beforePreview: preview(before),
          afterPreview: preview(next),
          reason: "Removed token-like secret value."
        });
      }
    }

    {
      const before = next;
      next = next.replace(URL_CREDENTIAL_PATTERN, "https://{{REDACTED_CREDENTIALS}}@");
      if (next !== before) {
        events.push({
          kind: "url-credential",
          location,
          beforePreview: preview(before),
          afterPreview: preview(next),
          reason: "Removed credential embedded in URL."
        });
      }
    }

    return next;
  };

  walkMutable(clonedResolved, "resolved", (value, location) => {
    if (typeof value === "string") {
      return redactString(value, location);
    }
    return value;
  });

  for (const record of clonedSources.records) {
    const before = record.sourcePath;
    const after = normalizeKnownPaths(before, context);
    if (after !== before) {
      record.sourcePath = after;
      events.push({
        kind: "path",
        location: `sources.records:${record.key}`,
        beforePreview: preview(before),
        afterPreview: preview(after),
        reason: "Normalized source path."
      });
    }
  }

  const bindingsTemplate = createBindingsTemplate(clonedResolved.bindings, events);

  return {
    resolved: clonedResolved,
    sources: clonedSources,
    audit: {
      generatedAt: new Date().toISOString(),
      rulesVersion: "0.1",
      eventCount: events.length,
      events
    },
    bindingsTemplate
  };
}

function createBindingsTemplate(bindings: BindingRequirement[], events: RedactionEvent[]): string {
  const lines = bindings.map((binding) => {
    events.push({
      kind: "binding-template",
      location: `bindings:${binding.key}`,
      beforePreview: binding.key,
      afterPreview: `${binding.key}=`,
      reason: "Generated placeholder entry in bindings template."
    });
    return `${binding.key}=`;
  });

  return lines.length > 0 ? `${lines.join("\n")}\n` : "# No bindings detected yet.\n";
}

function containsPathLike(value: string, homeDir: string): boolean {
  const normalizedHome = normalizeSlashes(homeDir).toLowerCase();
  const normalizedValue = normalizeSlashes(value).toLowerCase();
  return normalizedValue.includes(normalizedHome) || /[A-Za-z]:\\/.test(value);
}

function normalizeKnownPaths(value: string, context: RedactionContext): string {
  let next = value;
  const homeVariants = new Set([
    context.homeDir,
    normalizeSlashes(context.homeDir),
    context.homeDir.replace(/\//g, "\\")
  ]);

  for (const variant of homeVariants) {
    if (variant) {
      next = replaceAllCaseInsensitive(next, variant, "{{HOME}}");
    }
  }

  const cwdVariants = new Set([
    context.cwd,
    normalizeSlashes(context.cwd),
    context.cwd.replace(/\//g, "\\")
  ]);

  for (const variant of cwdVariants) {
    if (variant) {
      next = replaceAllCaseInsensitive(next, variant, "{{PROJECT_ROOT}}");
    }
  }

  // Best-effort redaction of Windows username in remaining home-like paths.
  const parsedHome = path.parse(context.homeDir);
  const homeParts = normalizeSlashes(context.homeDir).split("/");
  const username = homeParts[homeParts.length - 1];
  if (username) {
    next = next.replace(new RegExp(escapeRegExp(username), "gi"), "{{USERNAME}}");
  }

  if (parsedHome.root) {
    next = next.replace(/([A-Za-z]):\\Users\\\{\{USERNAME\}\}/gi, "{{HOME}}");
  }

  return next;
}

function walkMutable(value: unknown, location: string, visit: (value: unknown, location: string) => unknown): unknown {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const current = value[index];
      if (typeof current === "object" && current !== null) {
        walkMutable(current, `${location}[${index}]`, visit);
      } else {
        value[index] = visit(current, `${location}[${index}]`);
      }
    }
    return value;
  }

  if (value && typeof value === "object") {
    for (const [key, current] of Object.entries(value as Record<string, unknown>)) {
      if (typeof current === "object" && current !== null) {
        walkMutable(current, `${location}.${key}`, visit);
      } else {
        (value as Record<string, unknown>)[key] = visit(current, `${location}.${key}`);
      }
    }
    return value;
  }

  return visit(value, location);
}

function preview(value: string): string {
  return value.length > 120 ? `${value.slice(0, 117)}...` : value;
}

function normalizeSlashes(value: string): string {
  return value.replace(/\\/g, "/");
}

function replaceAllCaseSensitive(input: string, search: string, replacement: string): string {
  return input.split(search).join(replacement);
}

function replaceAllCaseInsensitive(input: string, search: string, replacement: string): string {
  const regex = new RegExp(escapeRegExp(search), "gi");
  return input.replace(regex, replacement);
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
