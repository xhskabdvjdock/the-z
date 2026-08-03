import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '../api/auth/[...nextauth]/route';
import Link from 'next/link';

async function getGuilds(accessToken: string) {
  try {
    const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching guilds:', error);
    return [];
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/');
  }

  const accessToken = (session as any).accessToken;
  const guilds = await getGuilds(accessToken);

  return (
    <div className="min-h-screen bg-gradient-to-br from-discord-not-quite-black via-discord-not-quite-black to-discord-blurple/20 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">اختر السيرفر</h1>
          <p className="text-gray-400">اختر السيرفر الذي تريد إدارته</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {guilds.map((guild: any) => (
            <div
              key={guild.id}
              className="transition-all duration-300 hover:scale-105"
            >
              <Link
                href={`/dashboard/${guild.id}`}
                className="block bg-discord-not-quite-black-hover p-6 rounded-lg border border-discord-not-quite-black hover:border-discord-blurple/50 transition-all duration-200 hover:shadow-lg"
              >
                <div className="flex items-center gap-4">
                  {guild.icon ? (
                    <img
                      src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                      alt={guild.name}
                      className="w-16 h-16 rounded-full"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-discord-blurple flex items-center justify-center text-2xl font-bold text-white">
                      {guild.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-white mb-1">{guild.name}</h2>
                    <p className="text-gray-400 text-sm">
                      {guild.owner ? 'المالك' : 'عضو'}
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
        {guilds.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">لا توجد سيرفرات متاحة</p>
            <p className="text-gray-500 text-sm mt-2">تأكد من تسجيل الدخول بحساب Discord الصحيح</p>
          </div>
        )}
      </div>
    </div>
  );
}
