import type { EnumMap } from "./types";

export function translateEnumValue(
  rawValue: string,
  enumMap: EnumMap | undefined,
): string | null {
  if (!enumMap) return null;
  for (const group of enumMap.userValues) {
    const candidates = [group.primary, ...group.aliases];
    if (
      candidates.some(
        (c) => c.trim().toLowerCase() === rawValue.trim().toLowerCase()
      )
    ) {
      return enumMap.mappedTo[group.primary] ?? null;
    }
  }
  return null;
}
