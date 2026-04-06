import { stringify } from "yaml";

export function toYaml(value: unknown): string {
  return stringify(value, {
    lineWidth: 0,
    defaultKeyType: "PLAIN"
  });
}
