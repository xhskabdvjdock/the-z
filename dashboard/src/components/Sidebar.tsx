"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "", label: "نظرة عامة" },
  { href: "/tickets", label: "نظام التذاكر" },
  { href: "/voice", label: "الرومات الصوتية" },
  { href: "/welcome", label: "الترحيب والمغادرة" },
  { href: "/autoresponse", label: "الردود التلقائية" },
  { href: "/roles", label: "الرولات والألوان" },
  { href: "/leveling", label: "المستويات والخبرة" },
  { href: "/automod", label: "الرقابة التلقائية" },
  { href: "/antinuke", label: "مكافحة الغزو" },
  { href: "/captcha", label: "نظام التحقق" },
  { href: "/logging", label: "السجلات" },
  { href: "/commands", label: "إدارة الأوامر" }
];

export default function Sidebar({ guildId }: { guildId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/${guildId}`;

  return (
    <nav className="card flex flex-col gap-2">
      {NAV_ITEMS.map((item) => {
        const href = `${base}${item.href}`;
        const active = pathname === href;
        return (
          <Link
            key={item.href}
            href={href}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
              active
                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30"
                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
            }`}
          >
            <span className="whitespace-nowrap">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
