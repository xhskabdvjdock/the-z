'use client';

import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Card from '@/components/ui/Card';
import Loading from '@/components/ui/Loading';
import Badge from '@/components/ui/Badge';
import { useGuild } from '@/hooks/useGuild';
import { Users, Crown, Calendar, Shield } from 'lucide-react';

export default function MembersPage({ params }: { params: { guildId: string } }) {
    const { guild, loading: guildLoading } = useGuild(params.guildId);

    // Mock data - replace with real API calls
    const members = [
        { id: '1', name: 'User 1', role: 'Owner', joinedAt: '2024-01-15', status: 'online' },
        { id: '2', name: 'User 2', role: 'Admin', joinedAt: '2024-02-20', status: 'idle' },
        { id: '3', name: 'User 3', role: 'Moderator', joinedAt: '2024-03-10', status: 'dnd' },
        { id: '4', name: 'User 4', role: 'Member', joinedAt: '2024-04-05', status: 'offline' },
    ];

    if (guildLoading) {
        return (
            <div className="min-h-screen bg-discord-not-quite-black flex">
                <Sidebar guildId={params.guildId} />
                <div className="flex-1 flex items-center justify-center">
                    <Loading text="جاري التحميل..." />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-discord-not-quite-black flex">
            <Sidebar guildId={params.guildId} />
            <div className="flex-1 flex flex-col">
                <Header guildId={params.guildId} guildName={guild?.name} />
                <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2">الأعضاء</h1>
                        <p className="text-gray-400">إدارة أعضاء السيرفر</p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <Card className="bg-discord-not-quite-black-hover">
                            <div className="flex items-center gap-4">
                                <Users className="w-8 h-8 text-discord-blurple" />
                                <div>
                                    <p className="text-gray-400 text-sm">المجموع</p>
                                    <p className="text-2xl font-bold text-white">1,234</p>
                                </div>
                            </div>
                        </Card>

                        <Card className="bg-discord-not-quite-black-hover">
                            <div className="flex items-center gap-4">
                                <Crown className="w-8 h-8 text-discord-yellow" />
                                <div>
                                    <p className="text-gray-400 text-sm">إداريين</p>
                                    <p className="text-2xl font-bold text-white">15</p>
                                </div>
                            </div>
                        </Card>

                        <Card className="bg-discord-not-quite-black-hover">
                            <div className="flex items-center gap-4">
                                <Calendar className="w-8 h-8 text-discord-green" />
                                <div>
                                    <p className="text-gray-400 text-sm">هذا الشهر</p>
                                    <p className="text-2xl font-bold text-white">+89</p>
                                </div>
                            </div>
                        </Card>

                        <Card className="bg-discord-not-quite-black-hover">
                            <div className="flex items-center gap-4">
                                <Shield className="w-8 h-8 text-discord-red" />
                                <div>
                                    <p className="text-gray-400 text-sm">محظورين</p>
                                    <p className="text-2xl font-bold text-white">23</p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Members List */}
                    <Card title="👥 قائمة الأعضاء">
                        <div className="space-y-3">
                            {members.map((member) => (
                                <div
                                    key={member.id}
                                    className="flex items-center justify-between p-4 bg-discord-not-quite-black rounded-lg"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-discord-blurple flex items-center justify-center text-white font-bold">
                                            {member.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">{member.name}</p>
                                            <p className="text-gray-400 text-sm">انضم {member.joinedAt}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge variant="info">{member.role}</Badge>
                                        <div className={`w-3 h-3 rounded-full ${member.status === 'online' ? 'bg-discord-green' :
                                                member.status === 'idle' ? 'bg-discord-yellow' :
                                                    member.status === 'dnd' ? 'bg-discord-red' : 'bg-gray-500'
                                            }`} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </main>
            </div>
        </div>
    );
}
