import { homedir } from "node:os";
import path from "node:path";
import type { SupportedHost } from "./types.js";

export type InstallScope = "user" | "project";

export interface PathResolutionContext {
  mode: "sandbox" | "real-home";
  targetRoot?: string;
  projectRoot?: string;
}

export function getDefaultInstallScope(targetHost: SupportedHost): InstallScope {
  return "user";
}

export function resolvePortablePath(portablePath: string, context: PathResolutionContext): string {
  const portable = portablePath.replace(/\//g, "\\");

  if (context.mode === "real-home") {
    if (portable.startsWith("{{HOME}}")) {
      return path.join(homedir(), portable.slice("{{HOME}}".length).replace(/^\\+/, ""));
    }
    if (portable.startsWith("{{PROJECT_ROOT}}")) {
      if (!context.projectRoot) {
        throw new Error(`Portable path requires project root but none was provided: ${portablePath}`);
      }
      return path.join(path.resolve(context.projectRoot), portable.slice("{{PROJECT_ROOT}}".length).replace(/^\\+/, ""));
    }
    if (portable.startsWith("{{TARGET_SKILLS_ROOT}}")) {
      throw new Error("{{TARGET_SKILLS_ROOT}} cannot be resolved in real-home mode without an explicit sandbox target root.");
    }
    if (path.isAbsolute(portable)) {
      return portable;
    }
    if (!context.projectRoot) {
      throw new Error(`Relative portable path requires project root in real-home mode: ${portablePath}`);
    }
    return path.join(path.resolve(context.projectRoot), portable);
  }

  if (!context.targetRoot) {
    throw new Error("Sandbox path resolution requires targetRoot.");
  }

  const targetRoot = path.resolve(context.targetRoot);
  if (portable.startsWith("{{HOME}}")) {
    return path.join(targetRoot, "home", portable.slice("{{HOME}}".length).replace(/^\\+/, ""));
  }
  if (portable.startsWith("{{PROJECT_ROOT}}")) {
    return path.join(targetRoot, "project", portable.slice("{{PROJECT_ROOT}}".length).replace(/^\\+/, ""));
  }
  if (portable.startsWith("{{TARGET_SKILLS_ROOT}}")) {
    return path.join(targetRoot, "skills", portable.slice("{{TARGET_SKILLS_ROOT}}".length).replace(/^\\+/, ""));
  }
  if (path.isAbsolute(portable)) {
    const driveSanitized = portable.replace(/[:\\\/]/g, "_");
    return path.join(targetRoot, "absolute", driveSanitized);
  }
  return path.join(targetRoot, portable);
}

export function describeMaterializationMode(context: PathResolutionContext): string {
  if (context.mode === "real-home") {
    return context.projectRoot ? `real-home (project root: ${path.resolve(context.projectRoot)})` : "real-home";
  }
  return `sandbox (${path.resolve(context.targetRoot ?? ".")})`;
}
