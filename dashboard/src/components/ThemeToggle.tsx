"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="p-2 rounded-lg bg-[#1A1C23] border border-[#2A2D37]">
        <div className="h-5 w-5" />
      </button>
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-lg bg-[#1A1C23] border border-[#2A2D37] hover:border-[#5865F2] transition-colors"
      title={theme === "dark" ? "تبديل للوضع الفاتح" : "تبديل للوضع الداكن"}
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5 text-[#F0F0F0]" />
      ) : (
        <Moon className="h-5 w-5 text-[#F0F0F0]" />
      )}
    </button>
  );
}
