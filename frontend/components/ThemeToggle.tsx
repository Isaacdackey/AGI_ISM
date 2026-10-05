"use client";
import { Moon, Monitor, Sun } from "lucide-react";
import { useTheme, type ThemeChoice } from "@/lib/theme";

const OPTIONS: { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Thème clair", Icon: Sun },
  { value: "dark", label: "Thème sombre", Icon: Moon },
  { value: "system", label: "Thème système", Icon: Monitor },
];

/** Sélecteur Clair / Sombre / Système. L'état réel n'est affiché qu'après montage
 * (évite tout mismatch d'hydratation avec le script anti-flash). */
export function ThemeToggle() {
  const { theme, setTheme, mounted } = useTheme();

  if (!mounted) {
    return <span aria-hidden="true" className="w-9 h-9 rounded-full border border-sand bg-surface shrink-0" />;
  }
  return (
    <div role="group" aria-label="Choisir le thème d'affichage" className="flex items-center gap-0.5 rounded-full border border-sand bg-surface p-0.5 shrink-0">
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={active}
            aria-label={label}
            title={label}
            className={`p-2 rounded-full transition shrink-0 ${
              active ? "bg-gray-warm text-ink" : "text-ink-secondary hover:text-ink"
            }`}
          >
            <Icon className="w-[18px] h-[18px] shrink-0" />
          </button>
        );
      })}
    </div>
  );
}
