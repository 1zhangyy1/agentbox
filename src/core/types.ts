export type PortabilityLabel = "portable" | "adaptable" | "host-specific" | "opaque";

export type SensitivityLabel = "public" | "internal" | "sensitive" | "secret";

export type SupportedHost = "claude-code" | "unknown";

export type SessionCaptureMode = "portable" | "rich" | "raw";

export interface PackageMetadata {
  name: string;
  version: string;
  createdAt: string;
  sourceHost: SupportedHost;
  sourceVersion?: string;
}

export interface CollectedItemRef {
  id: string;
  layer: string;
  sourcePath: string;
  extractionMethod: "structured" | "artifact-fallback" | "derived";
  portability: PortabilityLabel;
  sensitivity: SensitivityLabel;
  transformed: boolean;
  redacted: boolean;
  notes?: string[];
}

export interface HostArtifact {
  path: string;
  detectedFormat: "file" | "directory" | "json" | "yaml" | "toml" | "markdown" | "sqlite" | "unknown";
  probableCategory: string;
  portability: PortabilityLabel;
  sensitivity: SensitivityLabel;
}

export interface BindingRequirement {
  key: string;
  kind: "secret" | "identity" | "path" | "endpoint";
  required: boolean;
  description: string;
}

export interface ResolvedSnapshot {
  host: {
    id: SupportedHost;
    version?: string;
    platform: string;
    shell?: string;
  };
  profile: Record<string, unknown>;
  memory: Record<string, unknown>;
  session: Record<string, unknown>;
  skills: Record<string, unknown>;
  plugins: Record<string, unknown>;
  tools: Record<string, unknown>;
  preferences: Record<string, unknown>;
  securityPolicy: Record<string, unknown>;
  hooks: Record<string, unknown>;
  runtime: Record<string, unknown>;
  bindings: BindingRequirement[];
  hostArtifacts: HostArtifact[];
}

export interface SourceRecord {
  key: string;
  sourcePath: string;
  layer: string;
  origin: "session" | "project" | "workspace" | "user" | "global" | "default" | "unknown";
  note?: string;
}

export interface SourceSnapshot {
  precedenceOrder: string[];
  records: SourceRecord[];
}

export interface BoxManifest {
  apiVersion: "agentbox/v0.1";
  kind: "AgentBox";
  metadata: PackageMetadata;
  compatibility: {
    sourceHost: SupportedHost;
    suggestedTargets: SupportedHost[];
  };
  layers: {
    profile: { path: string; portability: PortabilityLabel };
    memory: { path: string; portability: PortabilityLabel };
    session: { path: string; portability: PortabilityLabel };
    skills: { path: string; portability: PortabilityLabel };
    plugins: { path: string; portability: PortabilityLabel };
    tools: { path: string; portability: PortabilityLabel };
    preferences: { path: string; portability: PortabilityLabel };
    securityPolicy: { path: string; portability: PortabilityLabel };
    hooks: { path: string; portability: PortabilityLabel };
    runtime: { path: string; portability: PortabilityLabel };
    bindings: { path: string; portability: PortabilityLabel };
    hostArtifacts: { path: string; portability: PortabilityLabel };
  };
}
