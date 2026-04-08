export type ThemePreference = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "lbs-theme-preference";

function isThemePreference(value: string | null): value is ThemePreference {
    return value === "system" || value === "light" || value === "dark";
}

export function getThemePreference(): ThemePreference {
    if (typeof window === "undefined") return "system";
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : "system";
}

export function resolveTheme(preference: ThemePreference): "light" | "dark" {
    if (preference === "light" || preference === "dark") return preference;
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(preference: ThemePreference) {
    if (typeof window === "undefined") return;
    const resolved = resolveTheme(preference);
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    root.setAttribute("data-theme", resolved);
    root.style.colorScheme = resolved;
}

export function setThemePreference(preference: ThemePreference) {
    if (typeof window === "undefined") return;
    localStorage.setItem(THEME_STORAGE_KEY, preference);
    applyTheme(preference);
}
