import { describe, expect, it } from "vitest";
import {
  colorModeClassName,
  colorModeStorageKey,
  nextColorMode,
  readStoredColorMode,
  writeStoredColorMode
} from "../../src/features/accessibility/colorMode";

function storage(initial: Record<string, string | null> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    }
  };
}

describe("color mode preference", () => {
  it("defaults to standard mode unless colorblind mode is stored", () => {
    expect(readStoredColorMode(storage())).toBe("standard");
    expect(readStoredColorMode(storage({ [colorModeStorageKey]: "bad-value" }))).toBe("standard");
    expect(readStoredColorMode(storage({ [colorModeStorageKey]: "colorblind" }))).toBe("colorblind");
  });

  it("toggles and persists the colorblind mode", () => {
    const memory = storage();
    const mode = nextColorMode("standard");
    writeStoredColorMode(memory, mode);

    expect(mode).toBe("colorblind");
    expect(readStoredColorMode(memory)).toBe("colorblind");
    expect(nextColorMode("colorblind")).toBe("standard");
  });

  it("maps colorblind mode to the shell class", () => {
    expect(colorModeClassName("standard")).toBe("");
    expect(colorModeClassName("colorblind")).toBe("colorblind-mode");
  });
});
