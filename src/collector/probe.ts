import type { ResolvedSnapshot, SessionCaptureMode, SourceSnapshot, SupportedHost } from "../core/types.js";

export interface ProbeContext {
  cwd: string;
  homeDir: string;
  sessionMode: SessionCaptureMode;
}

export interface HostDetection {
  host: SupportedHost;
  confidence: number;
  reason: string;
}

export interface HostProbe {
  readonly host: SupportedHost;
  detect(context: ProbeContext): Promise<HostDetection | null>;
  collect(context: ProbeContext): Promise<{
    resolved: ResolvedSnapshot;
    sources: SourceSnapshot;
  }>;
}
