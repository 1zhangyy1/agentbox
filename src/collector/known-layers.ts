export const COLLECTOR_LAYERS = [
  "profile",
  "memory",
  "session",
  "skills",
  "plugins",
  "tools",
  "preferences",
  "securityPolicy",
  "hooks",
  "runtime",
  "bindings",
  "hostArtifacts"
] as const;

export type CollectorLayer = (typeof COLLECTOR_LAYERS)[number];
