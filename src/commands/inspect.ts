import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";
import type { BoxManifest, ResolvedSnapshot } from "../core/types.js";

export async function inspectCommand(targetPath: string): Promise<void> {
  const root = path.resolve(targetPath);
  const manifestPath = path.join(root, "box.yaml");
  const resolvedPath = path.join(root, "resolved.yaml");

  const manifest = parse(await readFile(manifestPath, "utf8")) as BoxManifest;
  const resolved = parse(await readFile(resolvedPath, "utf8")) as ResolvedSnapshot;

  process.stdout.write(`Name: ${manifest.metadata.name}\n`);
  process.stdout.write(`Source host: ${manifest.metadata.sourceHost}\n`);
  process.stdout.write(`Created at: ${manifest.metadata.createdAt}\n`);
  process.stdout.write(`Suggested targets: ${manifest.compatibility.suggestedTargets.join(", ")}\n`);
  process.stdout.write(`Bindings: ${resolved.bindings.length}\n`);
  process.stdout.write(`Host artifacts: ${resolved.hostArtifacts.length}\n`);
  process.stdout.write(`Enabled layer files:\n`);

  for (const [layerName, layerRef] of Object.entries(manifest.layers)) {
    process.stdout.write(`- ${layerName}: ${layerRef.path} (${layerRef.portability})\n`);
  }
}
