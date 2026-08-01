"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "", label: "نظرة عامة", icon: "🏠" },
  { href: "/tickets", label: "نظام التذاكر", icon: "🎫" },
  { href: "/voice", label: "الرومات الصوتية", icon: "🎙️" },
  { href: "/welcome", label: "الترحيب والمغادرة", icon: "👋" },
  { href: "/autoresponse", label: "الردود التلقائية", icon: "🤖" },
  { href: "/roles", label: "الرولات والألوان", icon: "🎖️" },
  { href: "/leveling", label: "المستويات والخبرة", icon: "🆙" },
  { href: "/automod", label: "الرقابة التلقائية", icon: "🛡️" },
  { href: "/antinuke", label: "مكافحة الغزو", icon: "🚨" },
  { href: "/captcha", label: "نظام التحقق", icon: "🔐" },
  { href: "/logging", label: "السجلات", icon: "📋" },
  { href: "/commands", label: "إدارة الأوامر", icon: "⚙️" }
];

export default function Sidebar({ guildId }: { guildId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/${guildId}`;

  return (
    <nav className="flex w-full flex-col gap-1 overflow-x-auto sm:w-64 sm:shrink-0 sm:overflow-visible">
      {NAV_ITEMS.map((item) => {
        const href = `${base}${item.href}`;
        const active = pathname === href;
        return (
          <Link
            key={item.href}
            href={href}
            className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-brand text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            <span>{item.icon}</span>
            <span className="whitespace-nowrap">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
