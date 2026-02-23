"use client";

import { useTheme } from "@/components/layout/ThemeProvider";

export default function Topbar({ title }: { title?: string }) {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const themeIcon = theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "💻";

  return (
    <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between px-6">
      {title && (
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          {title}
        </h1>
      )}
      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={cycleTheme}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={`Theme: ${theme}`}
        >
          <span className="text-lg">{themeIcon}</span>
        </button>
      </div>
    </header>
  );
}
