import path from "node:path";
import { runCollect } from "../collector/collector.js";
import { createArchiveFromDirectory } from "../core/archive.js";
import { ClaudeCodeProbe } from "../probes/claude-code.js";
import type { SupportedHost } from "../core/types.js";

export interface ExportCommandOptions {
  output?: string;
  host?: SupportedHost;
}

export async function exportCommand(options: ExportCommandOptions): Promise<void> {
  const cwd = process.cwd();
  const projectName = path.basename(cwd);
  const tempDir = path.join(cwd, ".agentbox-temp");
  const outputFile = path.resolve(options.output ?? `${projectName}.agentbox`);

  console.log(`Exporting agent configuration from: ${cwd}`);

  // Collect snapshot
  const result = await runCollect(
    [new ClaudeCodeProbe()],
    {
      host: options.host,
      outputDir: tempDir,
      boxName: projectName,
      sessionMode: "portable"
    }
  );

  console.log(`Collected host: ${result.manifest.metadata.sourceHost}`);

  // Pack into .agentbox file
  await createArchiveFromDirectory(tempDir, outputFile);

  console.log(`\nExported to: ${outputFile}`);
  console.log(`Share this file to migrate your agent configuration.`);
}
