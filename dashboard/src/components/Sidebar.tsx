"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useMemo } from "react";
import { 
  LayoutDashboard, 
  Ticket, 
  Mic, 
  MessageSquare, 
  Bot, 
  Shield, 
  User, 
  Users, 
  Zap, 
  ShieldAlert, 
  Lock, 
  FileText, 
  Settings,
  UserX,
  Database,
  ScrollText,
  BarChart3,
  History,
  Hash,
  Smile,
  CalendarClock,
  LayoutTemplate,
  BookOpen,
  Image,
  Lightbulb,
  KeyRound
} from "lucide-react";

const NAV_ITEMS = [
  { href: "", label: "نظرة عامة", icon: LayoutDashboard },
  { href: "/stats", label: "لوحة الإحصائيات", icon: BarChart3 },
  { href: "/members", label: "إدارة الأعضاء", icon: Users },
  { href: "/tickets", label: "نظام التذاكر", icon: Ticket },
  { href: "/voice", label: "الرومات الصوتية", icon: Mic },
  { href: "/member-counter", label: "عداد الأعضاء", icon: Hash },
  { href: "/welcome", label: "الترحيب والمغادرة", icon: MessageSquare },
  { href: "/autoresponse", label: "الردود التلقائية", icon: Bot },
  { href: "/schedules", label: "الرسائل المجدولة", icon: CalendarClock },
  { href: "/islamic", label: "الأذكار والمحتوى الإسلامي", icon: BookOpen },
  { href: "/gifblock", label: "حظر GIFs", icon: Image },
  { href: "/suggestions", label: "الاقتراحات", icon: Lightbulb },
  { href: "/notifications", label: "الإشعارات", icon: MessageSquare },
  { href: "/advanced", label: "متقدم", icon: Settings },
  { href: "/access", label: "إدارة الوصول", icon: KeyRound },
  { href: "/roles", label: "الرولات والألوان", icon: User },
  { href: "/reaction-roles", label: "رولات الرياكشن", icon: Smile },
  { href: "/leveling", label: "المستويات والخبرة", icon: Zap },
  { href: "/automod", label: "الرقابة التلقائية", icon: Shield },
  { href: "/antinuke", label: "مكافحة الغزو", icon: ShieldAlert },
  { href: "/jail", label: "نظام السجن", icon: UserX },
  { href: "/moderation", label: "سجل الإشراف", icon: ScrollText },
  { href: "/captcha", label: "نظام التحقق", icon: Lock },
  { href: "/logging", label: "السجلات", icon: FileText },
  { href: "/logs", label: "سجل الإجراءات", icon: History },
  { href: "/backup", label: "النسخ الاحتياطي", icon: Database },
  { href: "/templates", label: "قوالب السيرفر", icon: LayoutTemplate },
  { href: "/commands", label: "إدارة الأوامر", icon: Settings }
];

export default function Sidebar({ guildId }: { guildId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/${guildId}`;
  const [open, setOpen] = useState(false);

  const nav = useMemo(() => NAV_ITEMS, []);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[#2A2D37] bg-[#1A1C23] px-4 py-2.5 text-sm font-medium text-[#F0F0F0] lg:hidden"
      >
        {open ? "إخفاء القائمة" : "القائمة"}
      </button>
      <nav className={`card flex-col gap-1 ${open ? "flex" : "hidden lg:flex"}`}>
        {nav.map((item) => {
        const href = `${base}${item.href}`;
        const active = pathname === href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-150 ${
              active
                ? "bg-[#5865F2] text-white"
                : "text-[#9CA3AF] hover:bg-[#1A1C23] hover:text-[#F0F0F0]"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="whitespace-nowrap">{item.label}</span>
          </Link>
        );
        })}
      </nav>
    </>
  );
}
