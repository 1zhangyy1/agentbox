import { createWriteStream } from "node:fs";
import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import AdmZip from "adm-zip";
import { ZipFile } from "yazl";

export async function createArchiveFromDirectory(inputDir: string, outputFile: string): Promise<void> {
  await mkdir(path.dirname(outputFile), { recursive: true });

  const zip = new ZipFile();
  const output = createWriteStream(outputFile);

  const completion = new Promise<void>((resolve, reject) => {
    output.on("close", () => resolve());
    output.on("error", reject);
    zip.outputStream.on("error", reject);
  });

  zip.outputStream.pipe(output);
  await addDirectoryToArchive(zip, inputDir, inputDir);
  zip.end();

  await completion;
}

export async function extractArchiveToDirectory(inputFile: string, outputDir: string): Promise<void> {
  await mkdir(outputDir, { recursive: true });
  const zip = new AdmZip(inputFile);
  zip.extractAllTo(outputDir, true);
}

async function addDirectoryToArchive(zip: ZipFile, rootDir: string, currentDir: string): Promise<void> {
  const entries = await readdir(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    const relativePath = toPosix(path.relative(rootDir, fullPath));
    if (entry.isDirectory()) {
      zip.addEmptyDirectory(relativePath);
      await addDirectoryToArchive(zip, rootDir, fullPath);
      continue;
    }

    if (entry.isFile()) {
      const info = await stat(fullPath);
      zip.addFile(fullPath, relativePath, {
        mtime: info.mtime
      });
    }
  }
}

function toPosix(value: string): string {
  return value.split(path.sep).join("/");
}
