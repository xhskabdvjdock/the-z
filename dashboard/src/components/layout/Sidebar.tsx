'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Ticket,
  UserPlus,
  Shield,
  FileText,
  Music,
  Gift,
  Users,
  MessageSquare,
  Star,
  Settings,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'لوحة التحكم', href: '', icon: LayoutDashboard },
  { name: 'التكتات', href: 'tickets', icon: Ticket },
  { name: 'الترحيب', href: 'welcome', icon: UserPlus },
  { name: 'AutoMod', href: 'automod', icon: Shield },
  { name: 'السجلات', href: 'logs', icon: FileText },
  { name: 'الموسيقى', href: 'music', icon: Music },
  { name: 'الجوائز', href: 'giveaways', icon: Gift },
  { name: 'الرولات', href: 'roles', icon: Users },
  { name: 'Auto Lines', href: 'autolines', icon: MessageSquare },
  { name: 'التقديمات', href: 'applications', icon: FileText },
  { name: 'التقييمات', href: 'rating', icon: Star },
];

interface SidebarProps {
  guildId: string;
}

const Sidebar = ({ guildId }: SidebarProps) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '') {
      return pathname === `/dashboard/${guildId}`;
    }
    return pathname === `/dashboard/${guildId}/${href}`;
  };

  const sidebarContent = (
    <aside className="w-64 bg-discord-not-quite-black-hover border-r border-discord-not-quite-black min-h-screen flex flex-col">
      <div className="p-6 border-b border-discord-not-quite-black">
        <h2 className="text-2xl font-bold text-white">لوحة التحكم</h2>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={`/dashboard/${guildId}${item.href ? `/${item.href}` : ''}`}
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                'text-gray-300 hover:text-white hover:bg-discord-not-quite-black',
                active && 'bg-discord-blurple text-white shadow-lg'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-discord-not-quite-black-hover rounded-lg text-white"
      >
        {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Desktop sidebar */}
      <div className="hidden lg:block">{sidebarContent}</div>

      {/* Mobile sidebar */}
      {isMobileOpen && (
        <>
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            className="lg:hidden fixed inset-y-0 left-0 z-40"
          >
            {sidebarContent}
          </motion.div>
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-30"
            onClick={() => setIsMobileOpen(false)}
          />
        </>
      )}
    </>
  );
};

export default Sidebar;
