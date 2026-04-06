export interface ParsedEnvLine {
  kind: "entry" | "comment" | "blank";
  raw: string;
  key?: string;
  value?: string;
}

export function parseEnvTemplate(input: string): ParsedEnvLine[] {
  return input.split(/\r?\n/).map<ParsedEnvLine>((line) => {
    if (line.trim() === "") {
      return { kind: "blank", raw: line };
    }
    if (line.trimStart().startsWith("#")) {
      return { kind: "comment", raw: line };
    }

    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) {
      return { kind: "comment", raw: line };
    }

    const key = line.slice(0, equalsIndex).trim();
    const value = line.slice(equalsIndex + 1);
    return {
      kind: "entry",
      raw: line,
      key,
      value
    };
  });
}

export function parseEnvObject(input: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of parseEnvTemplate(input)) {
    if (line.kind === "entry" && line.key) {
      result[line.key] = line.value ?? "";
    }
  }
  return result;
}

export function serializeEnvObject(values: Record<string, string>): string {
  const keys = Object.keys(values).sort();
  if (keys.length === 0) {
    return "# No bindings supplied.\n";
  }

  return `${keys.map((key) => `${key}=${values[key] ?? ""}`).join("\n")}\n`;
}

export function parseKeyValueArg(input: string): { key: string; value: string } {
  const equalsIndex = input.indexOf("=");
  if (equalsIndex <= 0) {
    throw new Error(`Invalid --set value "${input}". Expected KEY=VALUE.`);
  }
  return {
    key: input.slice(0, equalsIndex).trim(),
    value: input.slice(equalsIndex + 1)
  };
}
