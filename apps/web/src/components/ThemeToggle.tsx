"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem("brandos_theme");
      const current = (stored as "dark" | "light") || "light";
      setTheme(current);
      document.documentElement.setAttribute("data-theme", current);
      if (current === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch {
      // ignore
    }

    const handleThemeChange = (e: any) => {
      if (e?.detail?.theme) {
        setTheme(e.detail.theme);
        if (e.detail.theme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
    };

    window.addEventListener("brandos:theme-changed", handleThemeChange);
    return () => window.removeEventListener("brandos:theme-changed", handleThemeChange);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);

    try {
      document.documentElement.setAttribute("data-theme", newTheme);
      if (newTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      localStorage.setItem("brandos_theme", newTheme);
      document.cookie = `brandos_theme=${newTheme}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // ignore
    }

    window.dispatchEvent(new CustomEvent("brandos:theme-changed", { detail: { theme: newTheme } }));
  };

  if (!mounted) {
    return (
      <div className="h-9 w-9 rounded-xl border border-zinc-800 bg-zinc-900/60 p-2" />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative flex h-8 w-8 items-center justify-center rounded-xl border transition-all duration-200 focus:outline-none shadow-sm ${
        theme === "dark"
          ? "border-zinc-800 bg-zinc-900/90 text-amber-400 hover:bg-zinc-850 hover:border-zinc-700 hover:text-amber-300"
          : "border-slate-300 bg-white text-indigo-600 hover:bg-slate-100 hover:border-slate-400 hover:text-indigo-700"
      }`}
      title={theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4 transition-transform duration-300 rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="h-4 w-4 transition-transform duration-300 -rotate-12 hover:rotate-0" />
      )}
    </button>
  );
}
