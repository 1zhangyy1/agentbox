import os from "node:os";
import path from "node:path";
import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { createBoxManifest, createEmptyResolvedSnapshot, createEmptySources } from "../core/schemas.js";
import { toYaml } from "../core/yaml.js";
import type { BoxManifest, ResolvedSnapshot, SessionCaptureMode, SourceSnapshot, SupportedHost } from "../core/types.js";
import { redactCollectedData } from "../core/redaction.js";
import type { HostProbe, ProbeContext } from "./probe.js";

export interface CollectOptions {
  host?: SupportedHost;
  outputDir: string;
  boxName: string;
  sessionMode?: SessionCaptureMode;
}

export interface CollectResult {
  manifest: BoxManifest;
  resolved: ResolvedSnapshot;
  sources: SourceSnapshot;
  outputDir: string;
}

export async function runCollect(probes: HostProbe[], options: CollectOptions): Promise<CollectResult> {
  const context: ProbeContext = {
    cwd: process.cwd(),
    homeDir: os.homedir(),
    sessionMode: options.sessionMode ?? "portable"
  };

  const probe = await selectProbe(probes, context, options.host);
  const collected = probe
    ? await probe.collect(context)
    : {
        resolved: createEmptyResolvedSnapshot("unknown"),
        sources: createEmptySources()
      };

  const manifest = createBoxManifest({
    name: options.boxName,
    sourceHost: probe?.host ?? "unknown",
    sourceVersion: collected.resolved.host.version
  });

  const redacted = redactCollectedData(
    {
      cwd: context.cwd,
      homeDir: context.homeDir
    },
    collected.resolved,
    collected.sources
  );

  await writeSnapshot(options.outputDir, manifest, redacted.resolved, redacted.sources, redacted.bindingsTemplate, redacted.audit);

  return {
    manifest,
    resolved: redacted.resolved,
    sources: redacted.sources,
    outputDir: options.outputDir
  };
}

async function selectProbe(
  probes: HostProbe[],
  context: ProbeContext,
  requestedHost?: SupportedHost
): Promise<HostProbe | null> {
  if (requestedHost && requestedHost !== "unknown") {
    return probes.find((probe) => probe.host === requestedHost) ?? null;
  }

  const detections = await Promise.all(
    probes.map(async (probe) => {
      const detection = await probe.detect(context);
      return detection ? { probe, detection } : null;
    })
  );

  const candidates = detections.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  candidates.sort((left, right) => right.detection.confidence - left.detection.confidence);
  return candidates[0]?.probe ?? null;
}

async function writeSnapshot(
  outputDir: string,
  manifest: BoxManifest,
  resolved: ResolvedSnapshot,
  sources: SourceSnapshot,
  bindingsTemplate: string,
  audit: unknown
): Promise<void> {
  await mkdir(path.join(outputDir, "layers"), { recursive: true });
  await mkdir(path.join(outputDir, "meta"), { recursive: true });
  await mkdir(path.join(outputDir, "session"), { recursive: true });

  await writeFile(path.join(outputDir, "box.yaml"), toYaml(manifest), "utf8");
  await writeFile(path.join(outputDir, "resolved.yaml"), toYaml(resolved), "utf8");
  await writeFile(path.join(outputDir, "sources.yaml"), toYaml(sources), "utf8");
  await writeFile(path.join(outputDir, "bindings.template.env"), bindingsTemplate, "utf8");
  await writeFile(path.join(outputDir, "meta", "security-audit.json"), JSON.stringify(audit, null, 2), "utf8");
  await writeLayer(outputDir, "profile.yaml", resolved.profile);
  await writeLayer(outputDir, "memory.yaml", resolved.memory);
  await writeLayer(outputDir, "session.yaml", resolved.session);
  await writeLayer(outputDir, "skills.yaml", resolved.skills);
  await writeLayer(outputDir, "plugins.yaml", resolved.plugins);
  await writeLayer(outputDir, "tools.yaml", resolved.tools);
  await writeLayer(outputDir, "preferences.yaml", resolved.preferences);
  await writeLayer(outputDir, "security-policy.yaml", resolved.securityPolicy);
  await writeLayer(outputDir, "hooks.yaml", resolved.hooks);
  await writeLayer(outputDir, "runtime.yaml", resolved.runtime);
  await writeLayer(outputDir, "bindings.yaml", { bindings: resolved.bindings });
  await writeLayer(outputDir, "host-artifacts.yaml", { artifacts: resolved.hostArtifacts });

  // Copy session files
  const session = resolved.session as Record<string, unknown>;
  const transcriptFiles = session.transcriptFiles as Array<{ path: string }> | undefined;
  const planFiles = session.planFiles as Array<{ path: string }> | undefined;
  const historyFile = session.historyFile as string | undefined;

  if (transcriptFiles) {
    for (const file of transcriptFiles) {
      const sourcePath = file.path.replace(/\{\{HOME\}\}/g, os.homedir());
      const fileName = path.basename(sourcePath);
      const destPath = path.join(outputDir, "session", "transcripts", fileName);
      await mkdir(path.dirname(destPath), { recursive: true });
      try {
        await copyFile(sourcePath, destPath);
      } catch {
        // Ignore copy errors
      }
    }
  }

  if (planFiles) {
    for (const file of planFiles) {
      const sourcePath = file.path.replace(/\{\{HOME\}\}/g, os.homedir());
      const fileName = path.basename(sourcePath);
      const destPath = path.join(outputDir, "session", "plans", fileName);
      await mkdir(path.dirname(destPath), { recursive: true });
      try {
        await copyFile(sourcePath, destPath);
      } catch {
        // Ignore copy errors
      }
    }
  }

  if (historyFile) {
    const sourcePath = historyFile.replace(/\{\{HOME\}\}/g, os.homedir());
    const destPath = path.join(outputDir, "session", "history.jsonl");
    await mkdir(path.dirname(destPath), { recursive: true });
    try {
      await copyFile(sourcePath, destPath);
    } catch {
      // Ignore copy errors
    }
  }
}

async function writeLayer(outputDir: string, filename: string, value: unknown): Promise<void> {
  await writeFile(path.join(outputDir, "layers", filename), toYaml(value), "utf8");
}
