import type { BoxManifest, ResolvedSnapshot, SourceSnapshot } from "./types.js";

export const BOX_SCHEMA_VERSION = "agentbox/v0.1";

export function createEmptyResolvedSnapshot(hostId: ResolvedSnapshot["host"]["id"]): ResolvedSnapshot {
  return {
    host: {
      id: hostId,
      platform: process.platform,
      shell: process.env.SHELL ?? process.env.ComSpec
    },
    profile: {},
    memory: {},
    session: {},
    skills: {},
    plugins: {},
    tools: {},
    preferences: {},
    securityPolicy: {},
    hooks: {},
    runtime: {},
    bindings: [],
    hostArtifacts: []
  };
}

export function createEmptySources(): SourceSnapshot {
  return {
    precedenceOrder: ["session", "project", "workspace", "user", "global", "default"],
    records: []
  };
}

export function createBoxManifest(input: {
  name: string;
  sourceHost: BoxManifest["metadata"]["sourceHost"];
  sourceVersion?: string;
}): BoxManifest {
  return {
    apiVersion: "agentbox/v0.1",
    kind: "AgentBox",
    metadata: {
      name: input.name,
      version: "0.1.0",
      createdAt: new Date().toISOString(),
      sourceHost: input.sourceHost,
      sourceVersion: input.sourceVersion
    },
    compatibility: {
      sourceHost: input.sourceHost,
      suggestedTargets: ["claude-code"]
    },
    layers: {
      profile: { path: "layers/profile.yaml", portability: "portable" },
      memory: { path: "layers/memory.yaml", portability: "adaptable" },
      session: { path: "layers/session.yaml", portability: "adaptable" },
      skills: { path: "layers/skills.yaml", portability: "adaptable" },
      plugins: { path: "layers/plugins.yaml", portability: "host-specific" },
      tools: { path: "layers/tools.yaml", portability: "adaptable" },
      preferences: { path: "layers/preferences.yaml", portability: "adaptable" },
      securityPolicy: { path: "layers/security-policy.yaml", portability: "host-specific" },
      hooks: { path: "layers/hooks.yaml", portability: "host-specific" },
      runtime: { path: "layers/runtime.yaml", portability: "adaptable" },
      bindings: { path: "layers/bindings.yaml", portability: "host-specific" },
      hostArtifacts: { path: "layers/host-artifacts.yaml", portability: "opaque" }
    }
  };
}
