declare module "adm-zip" {
  export default class AdmZip {
    constructor(input?: string | Buffer);
    extractAllTo(targetPath: string, overwrite?: boolean): void;
  }
}
