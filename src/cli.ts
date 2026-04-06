#!/usr/bin/env node

import { Command } from "commander";
import { exportCommand } from "./commands/export.js";
import { importSimpleCommand } from "./commands/import-simple.js";
import { inspectCommand } from "./commands/inspect.js";
import type { SupportedHost } from "./core/types.js";

const program = new Command();

program
  .name("agentbox")
  .description("Portable agent environment collector and packager.")
  .version("0.1.0");

program
  .command("export")
  .description("Export current project's agent configuration to a .agentbox file.")
  .option("--output <file>", "Output .agentbox file path")
  .option("--host <host>", "Force a host probe", parseHost)
  .action(async (options) => {
    await exportCommand(options);
  });

program
  .command("import")
  .description("Import a .agentbox file into current environment.")
  .argument("<file>", "Path to .agentbox file")
  .option("--host <host>", "Target host to import into", parseHost)
  .option("--force", "Overwrite existing files")
  .action(async (bundlePath: string, options) => {
    await importSimpleCommand(bundlePath, options);
  });

program
  .command("inspect")
  .description("Inspect a collected AgentBox snapshot directory.")
  .argument("<path>", "Path to a collected snapshot directory")
  .action(async (snapshotPath: string) => {
    await inspectCommand(snapshotPath);
  });

program.parseAsync(process.argv);

function parseHost(value: string): SupportedHost {
  const supportedHosts: SupportedHost[] = ["claude-code", "unknown"];
  if (!supportedHosts.includes(value as SupportedHost)) {
    throw new Error(`Unsupported host: ${value}`);
  }
  return value as SupportedHost;
}
