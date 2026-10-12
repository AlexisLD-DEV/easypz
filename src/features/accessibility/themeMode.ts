export type ThemeMode = "light" | "dark";

export type ThemeModeStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export const themeModeStorageKey = "easypz_theme_mode";

export function readStoredThemeMode(storage: ThemeModeStorage | null | undefined = browserStorage()): ThemeMode {
  return storage?.getItem(themeModeStorageKey) === "dark" ? "dark" : "light";
}

export function writeStoredThemeMode(storage: ThemeModeStorage | null | undefined, mode: ThemeMode) {
  storage?.setItem(themeModeStorageKey, mode);
}

export function nextThemeMode(mode: ThemeMode): ThemeMode {
  return mode === "dark" ? "light" : "dark";
}

export function themeModeClassName(mode: ThemeMode) {
  return mode === "dark" ? "dark-mode" : "";
}

function browserStorage(): ThemeModeStorage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}
