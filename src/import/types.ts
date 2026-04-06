import type { SupportedHost } from "../core/types.js";

export interface ImportPlanEntry {
  sourceLayer: string;
  targetPath: string;
  action: "create-preview";
  risk: "low" | "medium" | "high";
  notes?: string[];
}

export interface ImportPreviewResult {
  targetHost: SupportedHost;
  outputDir: string;
  generatedFiles: string[];
  warnings: string[];
  plan: ImportPlanEntry[];
}

export interface ImportContext {
  sourceHost: SupportedHost;
  targetHost: SupportedHost;
  bindings: Record<string, string>;
  tempDir?: string;
}
