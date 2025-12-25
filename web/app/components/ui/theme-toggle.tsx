"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { useAuth } from "@/app/contexts/AuthContext";
import { FiSun, FiMoon } from "react-icons/fi";

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const { user, updateUser } = useAuth();

  const handleToggle = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);

    if (user) {
      updateUser({ theme_mode: newTheme }).catch((err) => {
        console.error("Failed to save theme preference:", err);
      });
    }
  };

  return (
    <button
      onClick={handleToggle}
      className="rounded-lg p-2 text-neutral-700 transition-colors dark:text-neutral-300"
      aria-label="Toggle theme"
      type="button"
    >
      {theme === "light" ? <FiMoon className="h-5 w-5" /> : <FiSun className="h-5 w-5" />}
    </button>
  );
}

export { ThemeToggle };