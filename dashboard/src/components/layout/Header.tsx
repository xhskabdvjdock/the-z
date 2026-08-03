'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderProps {
  guildId: string;
  guildName?: string;
}

const Header = ({ guildId, guildName }: HeaderProps) => {
  const pathname = usePathname();
  const paths = pathname.split('/').filter(Boolean);
  
  const breadcrumbs = paths.map((path, index) => {
    const href = '/' + paths.slice(0, index + 1).join('/');
    const isLast = index === paths.length - 1;
    const label = path === 'dashboard' ? 'لوحة التحكم' :
                  path === guildId ? (guildName || 'السيرفر') :
                  path === 'tickets' ? 'التكتات' :
                  path === 'welcome' ? 'الترحيب' :
                  path === 'automod' ? 'AutoMod' :
                  path === 'logs' ? 'السجلات' :
                  path === 'music' ? 'الموسيقى' :
                  path === 'giveaways' ? 'الجوائز' :
                  path === 'roles' ? 'الرولات' :
                  path === 'autolines' ? 'Auto Lines' :
                  path === 'applications' ? 'التقديمات' :
                  path === 'rating' ? 'التقييمات' : path;

    return { href, label, isLast };
  });

  return (
    <header className="bg-discord-not-quite-black-hover border-b border-discord-not-quite-black px-6 py-4">
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/dashboard"
          className="text-gray-400 hover:text-white transition-colors"
        >
          <Home className="w-4 h-4" />
        </Link>
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.href} className="flex items-center gap-2">
            <ChevronLeft className="w-4 h-4 text-gray-500" />
            {crumb.isLast ? (
              <span className="text-white font-medium">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="text-gray-400 hover:text-white transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </div>
        ))}
      </div>
    </header>
  );
};

export default Header;
