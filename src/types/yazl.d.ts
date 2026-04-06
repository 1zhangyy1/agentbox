declare module "yazl" {
  import type { Readable } from "node:stream";

  export interface AddFileOptions {
    mtime?: Date;
  }

  export class ZipFile {
    outputStream: Readable;
    addFile(realPath: string, metadataPath: string, options?: AddFileOptions): void;
    addEmptyDirectory(metadataPath: string): void;
    end(): void;
  }
}
