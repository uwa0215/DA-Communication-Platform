"use client";

import * as React from "react";
import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext<{ theme: string; setTheme: (theme: string) => void; systemTheme: string }>({
  theme: "system",
  setTheme: () => {},
  systemTheme: "light",
});

export function ThemeProvider({ children, ...props }: any) {
  const [theme, setTheme] = useState("system");
  const [systemTheme, setSystemTheme] = useState("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemTheme(mediaQuery.matches ? "dark" : "light");
    
    const listener = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? "dark" : "light");
    mediaQuery.addEventListener("change", listener);
    
    const savedTheme = localStorage.getItem("theme") || "system";
    setTheme(savedTheme);
    
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const activeTheme = theme === "system" ? systemTheme : theme;
    if (activeTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
    }
    localStorage.setItem("theme", theme);
  }, [theme, systemTheme, mounted]);

  return <ThemeContext.Provider value={{ theme, setTheme, systemTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
