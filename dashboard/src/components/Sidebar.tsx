"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Database
} from "lucide-react";

const NAV_ITEMS = [
  { href: "", label: "نظرة عامة", icon: LayoutDashboard },
  { href: "/members", label: "إدارة الأعضاء", icon: Users },
  { href: "/tickets", label: "نظام التذاكر", icon: Ticket },
  { href: "/voice", label: "الرومات الصوتية", icon: Mic },
  { href: "/welcome", label: "الترحيب والمغادرة", icon: MessageSquare },
  { href: "/autoresponse", label: "الردود التلقائية", icon: Bot },
  { href: "/roles", label: "الرولات والألوان", icon: User },
  { href: "/leveling", label: "المستويات والخبرة", icon: Zap },
  { href: "/automod", label: "الرقابة التلقائية", icon: Shield },
  { href: "/antinuke", label: "مكافحة الغزو", icon: ShieldAlert },
  { href: "/jail", label: "نظام السجن", icon: UserX },
  { href: "/captcha", label: "نظام التحقق", icon: Lock },
  { href: "/logging", label: "السجلات", icon: FileText },
  { href: "/backup", label: "النسخ الاحتياطي", icon: Database },
  { href: "/commands", label: "إدارة الأوامر", icon: Settings }
];

export default function Sidebar({ guildId }: { guildId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/${guildId}`;

  return (
    <nav className="card flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const href = `${base}${item.href}`;
        const active = pathname === href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={href}
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
  );
}
