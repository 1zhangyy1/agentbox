import type { BindingRequirement } from "./types.js";

export interface BindingResolutionSource {
  kind: "explicit" | "env-file" | "process-env" | "template-empty";
  name: string;
  values: Record<string, string | undefined>;
}

export interface BindingResolutionEntry {
  key: string;
  kind: BindingRequirement["kind"];
  required: boolean;
  description: string;
  value: string;
  provided: boolean;
  source: BindingResolutionSource["kind"];
}

export interface BindingResolutionResult {
  entries: BindingResolutionEntry[];
  values: Record<string, string>;
  missingRequired: BindingResolutionEntry[];
  providedCount: number;
}

export function resolveBindings(
  requirements: BindingRequirement[],
  templateEntries: Record<string, string>,
  sources: BindingResolutionSource[]
): BindingResolutionResult {
  const requirementMap = new Map(requirements.map((binding) => [binding.key, binding]));
  const allKeys = new Set<string>([
    ...Object.keys(templateEntries),
    ...requirements.map((binding) => binding.key)
  ]);

  const entries: BindingResolutionEntry[] = [];
  const values: Record<string, string> = {};

  for (const key of Array.from(allKeys).sort()) {
    const requirement = requirementMap.get(key);
    const resolved = resolveBindingValue(key, sources);
    const value = resolved?.value ?? templateEntries[key] ?? "";
    const entry: BindingResolutionEntry = {
      key,
      kind: requirement?.kind ?? "secret",
      required: requirement?.required ?? false,
      description: requirement?.description ?? `Binding required by template key "${key}"`,
      value,
      provided: value.length > 0,
      source: resolved?.source ?? "template-empty"
    };

    entries.push(entry);
    values[key] = value;
  }

  const missingRequired = entries.filter((entry) => entry.required && !entry.provided);
  const providedCount = entries.filter((entry) => entry.provided).length;

  return {
    entries,
    values,
    missingRequired,
    providedCount
  };
}

function resolveBindingValue(
  key: string,
  sources: BindingResolutionSource[]
): { value: string; source: BindingResolutionSource["kind"] } | null {
  for (const source of sources) {
    const value = source.values[key];
    if (value !== undefined && value.length > 0) {
      return {
        value,
        source: source.kind
      };
    }
  }
  return null;
}
