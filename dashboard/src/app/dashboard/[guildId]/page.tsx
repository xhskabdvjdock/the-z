import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '../../api/auth/[...nextauth]/route';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import StatsCard from '@/components/data/StatsCard';
import { Ticket, AlertTriangle, FileText, Star, Gift, FileCheck, TrendingUp } from 'lucide-react';

// Server-side API client
const API_URL = process.env.BOT_API_URL || 'http://localhost:3001';
const API_SECRET = process.env.BOT_API_SECRET || '';

async function getGuildStats(guildId: string) {
  try {
    const response = await fetch(`${API_URL}/api/guild/${guildId}/stats`, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-secret': API_SECRET,
      },
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    return null;
  }
}

async function getGuild(guildId: string) {
  try {
    const response = await fetch(`${API_URL}/api/guild/${guildId}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-secret': API_SECRET,
      },
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    return null;
  }
}

export default async function GuildDashboardPage({
  params,
}: {
  params: { guildId: string };
}) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/');
  }

  const [stats, guild] = await Promise.all([
    getGuildStats(params.guildId),
    getGuild(params.guildId),
  ]);

  return (
    <div className="min-h-screen bg-discord-not-quite-black flex">
      <Sidebar guildId={params.guildId} />
      <div className="flex-1 flex flex-col">
        <Header guildId={params.guildId} guildName={guild?.name} />
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">لوحة التحكم الرئيسية</h1>
            <p className="text-gray-400">نظرة عامة على إحصائيات وإعدادات السيرفر</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <StatsCard
              title="التكتات"
              value={stats?.tickets || 0}
              description="إجمالي التكتات"
              icon={<Ticket className="w-6 h-6 text-discord-blurple" />}
              color="blue"
            />
            <StatsCard
              title="التحذيرات"
              value={stats?.warnings || 0}
              description="تحذيرات نشطة"
              icon={<AlertTriangle className="w-6 h-6 text-discord-yellow" />}
              color="yellow"
            />
            <StatsCard
              title="التقديمات"
              value={stats?.applications || 0}
              description="تقديمات معلقة"
              icon={<FileText className="w-6 h-6 text-discord-green" />}
              color="green"
            />
            <StatsCard
              title="التقييمات"
              value={stats?.ratings || 0}
              description="إجمالي التقييمات"
              icon={<Star className="w-6 h-6 text-discord-fuchsia" />}
              color="pink"
            />
            <StatsCard
              title="الجوائز"
              value={stats?.giveaways || 0}
              description="جوائز نشطة"
              icon={<Gift className="w-6 h-6 text-discord-green" />}
              color="green"
            />
            <StatsCard
              title="السجلات"
              value={stats?.logs || 0}
              description="إجمالي السجلات"
              icon={<FileCheck className="w-6 h-6 text-discord-blurple" />}
              color="blue"
            />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-discord-not-quite-black-hover rounded-lg p-6 border border-discord-not-quite-black">
              <h2 className="text-xl font-semibold text-white mb-4">إجراءات سريعة</h2>
              <div className="space-y-2">
                <a
                  href={`/dashboard/${params.guildId}/tickets`}
                  className="block p-3 rounded-lg bg-discord-not-quite-black hover:bg-discord-blurple/20 transition-colors text-gray-300 hover:text-white"
                >
                  إدارة التكتات
                </a>
                <a
                  href={`/dashboard/${params.guildId}/automod`}
                  className="block p-3 rounded-lg bg-discord-not-quite-black hover:bg-discord-blurple/20 transition-colors text-gray-300 hover:text-white"
                >
                  إعدادات AutoMod
                </a>
                <a
                  href={`/dashboard/${params.guildId}/logs`}
                  className="block p-3 rounded-lg bg-discord-not-quite-black hover:bg-discord-blurple/20 transition-colors text-gray-300 hover:text-white"
                >
                  عرض السجلات
                </a>
              </div>
            </div>

            <div className="bg-discord-not-quite-black-hover rounded-lg p-6 border border-discord-not-quite-black">
              <h2 className="text-xl font-semibold text-white mb-4">حالة النظام</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">حالة البوت</span>
                  <span className="px-3 py-1 rounded-full bg-discord-green/20 text-discord-green text-sm font-medium">
                    متصل
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">قاعدة البيانات</span>
                  <span className="px-3 py-1 rounded-full bg-discord-green/20 text-discord-green text-sm font-medium">
                    متصل
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">API</span>
                  <span className="px-3 py-1 rounded-full bg-discord-green/20 text-discord-green text-sm font-medium">
                    نشط
                  </span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
