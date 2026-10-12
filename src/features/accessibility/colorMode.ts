export type ColorMode = "standard" | "colorblind";

export type ColorModeStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export const colorModeStorageKey = "quiz_english_color_mode";

export function readStoredColorMode(storage: ColorModeStorage | null | undefined = browserStorage()): ColorMode {
  return storage?.getItem(colorModeStorageKey) === "colorblind" ? "colorblind" : "standard";
}

export function writeStoredColorMode(storage: ColorModeStorage | null | undefined, mode: ColorMode) {
  storage?.setItem(colorModeStorageKey, mode);
}

export function nextColorMode(mode: ColorMode): ColorMode {
  return mode === "colorblind" ? "standard" : "colorblind";
}

export function colorModeClassName(mode: ColorMode) {
  return mode === "colorblind" ? "colorblind-mode" : "";
}

function browserStorage(): ColorModeStorage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}
