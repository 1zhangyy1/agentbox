import type { BindingRequirement, ResolvedSnapshot, SupportedHost } from "../core/types.js";
import type { BindingResolutionResult } from "../core/bindings.js";
import type { InstallScope } from "../core/materialize.js";
import type { SkillInstallPlan } from "./install-plan.js";
import type { ImportPreviewResult } from "./types.js";

export interface CompatibilityReport {
  apiVersion: "agentbox/v0.1";
  kind: "CompatibilityReport";
  sourceHost: SupportedHost;
  targetHost: SupportedHost;
  targetScope: InstallScope;
  overallStatus: "ready" | "ready-with-warnings" | "blocked";
  blockers: string[];
  manualActions: string[];
  warnings: string[];
  bindings: {
    required: number;
    provided: number;
    missingRequiredKeys: string[];
    entries: Array<{
      key: string;
      kind: BindingRequirement["kind"];
      required: boolean;
      provided: boolean;
      source: string;
      description: string;
    }>;
  };
  layers: Array<{
    layer: string;
    status: "portable" | "preview-only" | "manual" | "blocked" | "not-applicable";
    notes: string[];
  }>;
}

export function buildCompatibilityReport(input: {
  resolved: ResolvedSnapshot;
  sourceHost: SupportedHost;
  targetHost: SupportedHost;
  bindingResolution: BindingResolutionResult;
  preview: ImportPreviewResult;
  skillInstallPlan: SkillInstallPlan;
}): CompatibilityReport {
  const { resolved, sourceHost, targetHost, bindingResolution, preview, skillInstallPlan } = input;
  const blockers: string[] = [];
  const manualActions: string[] = [];
  const warnings = [...preview.warnings, ...skillInstallPlan.warnings];

  if (bindingResolution.missingRequired.length > 0) {
    blockers.push(
      `Missing required bindings: ${bindingResolution.missingRequired.map((entry) => entry.key).join(", ")}`
    );
  }

  const manualSkillEntries = skillInstallPlan.entries.filter((entry) => entry.status === "manual-review");
  if (manualSkillEntries.length > 0) {
    manualActions.push(
      `Manual skill reconstruction required for: ${manualSkillEntries.map((entry) => entry.skillName).join(", ")}`
    );
  }

  if (preview.warnings.length > 0) {
    manualActions.push("Review import warnings before writing into a real host environment.");
  }

  if (hasPluginData(resolved) && targetHost !== sourceHost) {
    manualActions.push("Review plugin portability manually; plugin runtime state is not fully reconstructed yet.");
  }

  const layers: CompatibilityReport["layers"] = [
    buildLayer("profile", hasMeaningfulProfile(resolved) ? "portable" : "preview-only", [
      hasMeaningfulProfile(resolved)
        ? "Portable profile preview is available for import."
        : "No portable profile text was captured; summary-only preview is available."
    ]),
    buildLayer("memory", "preview-only", [
      "Memory currently imports as a portable summary/inventory preview, not a full semantic replay."
    ]),
    buildLayer(
      "skills",
      manualSkillEntries.length > 0 ? "manual" : "preview-only",
      manualSkillEntries.length > 0
        ? ["Some skills require manual reconstruction. See skill-install-plan.yaml."]
        : ["Skill inventory and reconstruction plan are available in skill-install-plan.yaml."]
    ),
    buildLayer("tools", "preview-only", [
      "Tool and MCP settings are translated into target-host preview config where supported."
    ]),
    buildLayer(
      "bindings",
      bindingResolution.missingRequired.length > 0 ? "blocked" : "portable",
      bindingResolution.missingRequired.length > 0
        ? ["Import is blocked until all required bindings are provided."]
        : ["All required bindings needed for previewed import are present."]
    ),
    buildLayer("plugins", hasPluginData(resolved) ? "manual" : "not-applicable", [
      hasPluginData(resolved)
        ? "Plugin identifiers are preserved, but plugin runtime portability still needs manual review."
        : "No portable plugin data was captured for this snapshot."
    ]),
    buildLayer("session", hasMeaningfulSession(resolved) ? "preview-only" : "not-applicable", [
      hasMeaningfulSession(resolved)
        ? "Session imports as portable summaries/documents for review, not as a resumable native runtime session."
        : "No portable session data was captured for this snapshot."
    ]),
    buildLayer("hostArtifacts", resolved.hostArtifacts.length > 0 ? "manual" : "not-applicable", [
      resolved.hostArtifacts.length > 0
        ? "Host-specific artifacts were detected and preserved in metadata only."
        : "No host-specific artifacts were detected."
    ])
  ];

  return {
    apiVersion: "agentbox/v0.1",
    kind: "CompatibilityReport",
    sourceHost,
    targetHost,
    targetScope: skillInstallPlan.scope,
    overallStatus: blockers.length > 0 ? "blocked" : warnings.length > 0 || manualActions.length > 0 ? "ready-with-warnings" : "ready",
    blockers,
    manualActions,
    warnings,
    bindings: {
      required: bindingResolution.entries.filter((entry) => entry.required).length,
      provided: bindingResolution.entries.filter((entry) => entry.required && entry.provided).length,
      missingRequiredKeys: bindingResolution.missingRequired.map((entry) => entry.key),
      entries: bindingResolution.entries.map((entry) => ({
        key: entry.key,
        kind: entry.kind,
        required: entry.required,
        provided: entry.provided,
        source: entry.source,
        description: entry.description
      }))
    },
    layers
  };
}

function buildLayer(
  layer: string,
  status: CompatibilityReport["layers"][number]["status"],
  notes: string[]
): CompatibilityReport["layers"][number] {
  return { layer, status, notes };
}

function hasMeaningfulProfile(resolved: ResolvedSnapshot): boolean {
  const profile = resolved.profile as Record<string, unknown>;
  return typeof profile.projectInstructionPreview === "string" || typeof profile.userInstructionPreview === "string";
}

function hasPluginData(resolved: ResolvedSnapshot): boolean {
  return Object.keys(resolved.plugins as Record<string, unknown>).length > 0;
}

function hasMeaningfulSession(resolved: ResolvedSnapshot): boolean {
  const session = resolved.session as Record<string, unknown>;
  return (
    typeof session.portableSummary === "string" ||
    Array.isArray(session.recentPrompts) ||
    Array.isArray(session.recentPlanPreviews) ||
    Array.isArray(session.recentTodoPreviews) ||
    Array.isArray(session.recentHistoryEntries) ||
    Array.isArray(session.rawHistoryEntries) ||
    Array.isArray(session.rawPlanDocuments)
  );
}
