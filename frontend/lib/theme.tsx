"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemeChoice = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "theme";
const DEFAULT_CHOICE: ThemeChoice = "system";

/** Script bloquant injecté avant le premier rendu : applique `dark` sans flash.
 * Doit rester synchronisé avec resolveTheme/applyTheme ci-dessous. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${STORAGE_KEY}")||"${DEFAULT_CHOICE}";if(t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}`;

function readStoredChoice(): ThemeChoice {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    // localStorage indisponible (navigation privée…) : repli système.
  }
  return DEFAULT_CHOICE;
}

function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveChoice(choice: ThemeChoice): ResolvedTheme {
  if (choice === "dark") return "dark";
  if (choice === "light") return "light";
  return prefersDark() ? "dark" : "light";
}

function applyResolved(resolved: ResolvedTheme): void {
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

type ThemeContextValue = {
  theme: ThemeChoice;
  setTheme: (t: ThemeChoice) => void;
  resolvedTheme: ResolvedTheme;
  /** Faux pendant le SSR / avant montage : le toggle n'affiche l'état réel qu'après. */
  mounted: boolean;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_CHOICE,
  setTheme: () => {},
  resolvedTheme: "light",
  mounted: false,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeChoice>(DEFAULT_CHOICE);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const [mounted, setMounted] = useState(false);

  // Montage : relit le choix persisté (le script inline a déjà appliqué la classe).
  useEffect(() => {
    const stored = readStoredChoice();
    setThemeState(stored);
    setResolvedTheme(resolveChoice(stored));
    setMounted(true);
  }, []);

  // Applique + persiste à chaque changement de choix.
  useEffect(() => {
    if (!mounted) return;
    applyResolved(resolveChoice(theme));
    setResolvedTheme(resolveChoice(theme));
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Stockage indisponible : le choix vit le temps de la session.
    }
  }, [theme, mounted]);

  // Mode "system" : suit l'OS en direct.
  useEffect(() => {
    if (!mounted || theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const next = mq.matches ? "dark" : "light";
      applyResolved(next);
      setResolvedTheme(next);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme, mounted]);

  const setTheme = useCallback((t: ThemeChoice) => setThemeState(t), []);

  const value = useMemo(
    () => ({ theme, setTheme, resolvedTheme, mounted }),
    [theme, setTheme, resolvedTheme, mounted],
  );
  // Script bloquant en premier enfant : s'exécute avant la peinture, aucun flash.
  return (
    <ThemeContext.Provider value={value}>
      <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
