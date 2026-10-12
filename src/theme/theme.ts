/**
 * Site-wide light/dark theme.
 *
 * - The active theme is the `data-theme` attribute on <html>; every colour in the app
 *   is a CSS variable that switches with it (see styles/index.css).
 * - A small script in index.html applies the theme before first paint, so there is no
 *   flash of the wrong theme. It must use the same storage key and rules as below.
 * - An explicit choice is saved in localStorage. Without one, the system preference is
 *   followed (light when the system expresses none) and tracked if it changes.
 */
export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'vixidia-theme';

const listeners = new Set<() => void>();

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

export function readStoredTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null; // storage blocked (private mode, policy): fall back to the system
  }
}

export function systemTheme(): Theme {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function currentTheme(): Theme {
  const attr = document.documentElement.dataset.theme;
  return isTheme(attr) ? attr : 'light';
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = theme === 'dark' ? '#0b1020' : '#f5f6f8';
  listeners.forEach((l) => l());
}

/** Applies and remembers an explicit choice. */
export function setTheme(theme: Theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Not persisted, but still applied for this visit.
  }
  apply(theme);
}

export function toggleTheme() {
  setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Call once at startup: syncs with the pre-paint script and follows system changes. */
export function initTheme() {
  apply(readStoredTheme() ?? systemTheme());
  if (typeof window.matchMedia !== 'function') return;
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (!readStoredTheme()) apply(systemTheme());
  });
}
