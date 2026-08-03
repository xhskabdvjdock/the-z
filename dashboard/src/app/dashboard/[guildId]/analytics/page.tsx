'use client';

import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Loading from '@/components/ui/Loading';
import { useGuild } from '@/hooks/useGuild';
import { Activity, Users, MessageSquare, Zap } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AnalyticsPage({ params }: { params: { guildId: string } }) {
    const { guild, loading: guildLoading } = useGuild(params.guildId);

    // Mock data - replace with real API calls
    const activityData = [
        { name: 'السبت', messages: 245, members: 12, commands: 45 },
        { name: 'الأحد', messages: 320, members: 15, commands: 67 },
        { name: 'الاثنين', messages: 289, members: 10, commands: 52 },
        { name: 'الثلاثاء', messages: 412, members: 18, commands: 89 },
        { name: 'الأربعاء', messages: 356, members: 14, commands: 71 },
        { name: 'الخميس', messages: 398, members: 16, commands: 78 },
        { name: 'الجمعة', messages: 445, members: 20, commands: 95 },
    ];

    const commandsData = [
        { name: '/balance', uses: 156 },
        { name: '/daily', uses: 134 },
        { name: '/work', uses: 98 },
        { name: '/rank', uses: 87 },
        { name: '/ping', uses: 76 },
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
                        <h1 className="text-3xl font-bold text-white mb-2">تحليلات السيرفر</h1>
                        <p className="text-gray-400">نظرة شاملة على نشاط السيرفر</p>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <Card className="bg-discord-not-quite-black-hover border-discord-blurple/20">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-discord-blurple/20 rounded-lg">
                                    <MessageSquare className="w-6 h-6 text-discord-blurple" />
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm">الرسائل (7 أيام)</p>
                                    <p className="text-2xl font-bold text-white">2,465</p>
                                </div>
                            </div>
                        </Card>

                        <Card className="bg-discord-not-quite-black-hover border-discord-green/20">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-discord-green/20 rounded-lg">
                                    <Users className="w-6 h-6 text-discord-green" />
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm">أعضاء جدد</p>
                                    <p className="text-2xl font-bold text-white">105</p>
                                </div>
                            </div>
                        </Card>

                        <Card className="bg-discord-not-quite-black-hover border-discord-yellow/20">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-discord-yellow/20 rounded-lg">
                                    <Zap className="w-6 h-6 text-discord-yellow" />
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm">الأوامر</p>
                                    <p className="text-2xl font-bold text-white">497</p>
                                </div>
                            </div>
                        </Card>

                        <Card className="bg-discord-not-quite-black-hover border-discord-fuchsia/20">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-discord-fuchsia/20 rounded-lg">
                                    <Activity className="w-6 h-6 text-discord-fuchsia" />
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm">النشاط</p>
                                    <p className="text-2xl font-bold text-white">عالي</p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Activity Chart */}
                    <Card title="📊 نشاط السيرفر (آخر 7 أيام)" className="mb-6">
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={activityData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2C2F33" />
                                <XAxis dataKey="name" stroke="#99AAB5" />
                                <YAxis stroke="#99AAB5" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#2C2F33', border: 'none', borderRadius: '8px' }}
                                    labelStyle={{ color: '#FFFFFF' }}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="messages" stroke="#5865F2" name="الرسائل" strokeWidth={2} />
                                <Line type="monotone" dataKey="members" stroke="#57F287" name="الأعضاء" strokeWidth={2} />
                                <Line type="monotone" dataKey="commands" stroke="#FEE75C" name="الأوامر" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </Card>

                    {/* Popular Commands */}
                    <Card title="⚡ الأوامر الأكثر استخداماً">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={commandsData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2C2F33" />
                                <XAxis dataKey="name" stroke="#99AAB5" />
                                <YAxis stroke="#99AAB5" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#2C2F33', border: 'none', borderRadius: '8px' }}
                                    labelStyle={{ color: '#FFFFFF' }}
                                />
                                <Bar dataKey="uses" fill="#5865F2" name="الاستخدامات" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </main>
            </div>
        </div>
    );
}
