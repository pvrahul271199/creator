"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "flight" | "graphite";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "flight",
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("flight");

  useEffect(() => {
    const saved = localStorage.getItem("boardroom_theme") as Theme | null;
    if (saved === "flight" || saved === "graphite") {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    } else {
      document.documentElement.setAttribute("data-theme", "flight");
    }
  }, []);

  const handleSetTheme = (next: Theme) => {
    setTheme(next);
    localStorage.setItem("boardroom_theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  const toggleTheme = () => {
    handleSetTheme(theme === "flight" ? "graphite" : "flight");
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme: handleSetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
