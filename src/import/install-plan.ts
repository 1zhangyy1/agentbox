import { getDefaultInstallScope } from "../core/materialize.js";
import type { InstallScope } from "../core/materialize.js";
import type { ResolvedSnapshot, SupportedHost } from "../core/types.js";

export interface SkillInstallPlan {
  apiVersion: "agentbox/v0.1";
  kind: "SkillInstallPlan";
  sourceHost: SupportedHost;
  targetHost: SupportedHost;
  scope: InstallScope;
  targetStrategy: {
    scope: InstallScope;
    downloadRoot: string;
    activationRoot: string;
    activationMode: "shared-root" | "host-local" | "workspace-local";
  };
  entries: SkillInstallPlanEntry[];
  warnings: string[];
}

export interface SkillInstallPlanEntry {
  skillName: string;
  status: "ready" | "manual-review";
  installStrategy: "git-clone-and-verify" | "manual";
  source: {
    source?: string | null;
    sourceType?: string | null;
    sourceUrl?: string | null;
    skillPath?: string | null;
    expectedHash?: string | null;
    pluginName?: string | null;
  };
  target: {
    scope: InstallScope;
    downloadRoot: string;
    activationRoot: string;
    targetFolderName: string;
    activationMode: "shared-root" | "host-local" | "workspace-local";
  };
  suggestedCommands: string[];
  notes: string[];
}

export function buildSkillInstallPlan(
  resolved: ResolvedSnapshot,
  sourceHost: SupportedHost,
  targetHost: SupportedHost,
  options?: {
    scope?: InstallScope;
  }
): SkillInstallPlan {
  const skills = resolved.skills as Record<string, unknown>;
  const scope = options?.scope ?? getDefaultInstallScope(targetHost);
  const targetStrategy = resolveSkillTargetStrategy(targetHost, scope);
  const sharedSkillNames = asStrings(skills.sharedSkillNames);
  const installedSkillNames = asStrings(skills.installedSkillNames);
  const lockfileSkills = asObject(skills.lockfileSkills);

  const skillNames = new Set<string>([
    ...sharedSkillNames,
    ...installedSkillNames,
    ...Object.keys(lockfileSkills)
  ]);

  const warnings: string[] = [];
  const entries = Array.from(skillNames)
    .sort((left, right) => left.localeCompare(right))
    .map((skillName) => buildSkillEntry(skillName, lockfileSkills[skillName], targetStrategy, warnings));

  if (entries.length === 0) {
    warnings.push("No portable skill entries were found in the current snapshot.");
  }

  return {
    apiVersion: "agentbox/v0.1",
    kind: "SkillInstallPlan",
    sourceHost,
    targetHost,
    scope,
    targetStrategy,
    entries,
    warnings
  };
}

function buildSkillEntry(
  skillName: string,
  rawSkillRecord: unknown,
  targetStrategy: SkillInstallPlan["targetStrategy"],
  warnings: string[]
): SkillInstallPlanEntry {
  const skillRecord = asObject(rawSkillRecord);
  const sourceUrl = asOptionalString(skillRecord.sourceUrl);
  const sourceType = asOptionalString(skillRecord.sourceType);
  const source = asOptionalString(skillRecord.source);
  const skillPath = asOptionalString(skillRecord.skillPath);
  const expectedHash = asOptionalString(skillRecord.skillFolderHash);
  const pluginName = asOptionalString(skillRecord.pluginName);

  const notes: string[] = [];
  const suggestedCommands: string[] = [];
  let status: SkillInstallPlanEntry["status"] = "ready";
  let installStrategy: SkillInstallPlanEntry["installStrategy"] = "git-clone-and-verify";

  if (!sourceUrl) {
    status = "manual-review";
    installStrategy = "manual";
    notes.push("No sourceUrl was captured for this skill, so AgentBox cannot reconstruct it automatically yet.");
    warnings.push(`Skill "${skillName}" is missing sourceUrl metadata and will require manual reconstruction.`);
  } else {
    suggestedCommands.push(`git clone ${sourceUrl} ${joinPortablePath(targetStrategy.downloadRoot, skillName)}`);
    if (expectedHash) {
      suggestedCommands.push(`# verify expected skill folder hash: ${expectedHash}`);
    } else {
      notes.push("No skillFolderHash was captured, so post-install verification is weaker than ideal.");
    }
  }

  if (skillPath) {
    notes.push(`Expected skill entry file inside repo: ${skillPath}`);
  }

  if (pluginName) {
    notes.push(`This skill is associated with plugin "${pluginName}" and may require a matching plugin install on the target host.`);
  }

  if (targetStrategy.activationMode !== "shared-root") {
    notes.push(`Target host ${targetStrategy.activationMode} install may require host-specific skill registration after download.`);
  } else {
    notes.push("Target host is expected to consume skills from the shared skill root.");
  }

  return {
    skillName,
    status,
    installStrategy,
    source: {
      source,
      sourceType,
      sourceUrl,
      skillPath,
      expectedHash,
      pluginName
    },
    target: {
      scope: targetStrategy.scope,
      downloadRoot: targetStrategy.downloadRoot,
      activationRoot: targetStrategy.activationRoot,
      targetFolderName: skillName,
      activationMode: targetStrategy.activationMode
    },
    suggestedCommands,
    notes
  };
}

export function resolveSkillTargetStrategy(targetHost: SupportedHost, scope: InstallScope): SkillInstallPlan["targetStrategy"] {
  if (targetHost === "claude-code") {
    return {
      scope,
      downloadRoot: scope === "user" ? "{{HOME}}\\.agents\\skills" : "{{PROJECT_ROOT}}\\.agents\\skills",
      activationRoot: scope === "user" ? "{{HOME}}\\.claude\\skills" : "{{PROJECT_ROOT}}\\.claude\\skills",
      activationMode: "shared-root"
    };
  }

  return {
    scope,
    downloadRoot: "{{TARGET_SKILLS_ROOT}}",
    activationRoot: "{{TARGET_SKILLS_ROOT}}",
    activationMode: "host-local"
  };
}

function joinPortablePath(root: string, name: string): string {
  const normalizedRoot = root.replace(/[\\\/]+$/, "");
  return `${normalizedRoot}\\${name}`;
}

function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}
