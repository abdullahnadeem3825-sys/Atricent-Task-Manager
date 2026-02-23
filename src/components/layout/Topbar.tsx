"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/layout/ThemeProvider";
import { useUser } from "@/hooks/useUser";
import { useSupabase } from "@/hooks/useSupabase";

export default function Topbar({ title }: { title?: string }) {
  const { theme, setTheme } = useTheme();
  const { profile } = useUser();
  const supabase = useSupabase();
  const router = useRouter();
  const [showProfile, setShowProfile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowProfile(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const themeIcon = theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "💻";

  return (
    <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between px-6 sticky top-0 z-40">
      {title && (
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          {title}
        </h1>
      )}
      <div className="ml-auto flex items-center gap-4">
        <button
          onClick={cycleTheme}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={`Theme: ${theme}`}
        >
          <span className="text-lg">{themeIcon}</span>
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              {(profile?.full_name || "?").charAt(0)}
            </div>
          </button>

          {showProfile && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 py-2 animate-fade-in z-50">
              <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 mb-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {profile?.full_name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {profile?.email}
                </p>
              </div>

              <button
                onClick={() => {
                  setShowProfile(false);
                  router.push("/settings");
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
              >
                <span>⚙️</span> Settings
              </button>

              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2"
              >
                <span>🚪</span> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
