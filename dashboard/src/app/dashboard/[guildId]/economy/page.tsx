'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Loading from '@/components/ui/Loading';
import { useToast } from '@/components/ui/Toast';
import { useGuild } from '@/hooks/useGuild';
import { DollarSign, TrendingUp, Users, Award } from 'lucide-react';

export default function EconomyPage({ params }: { params: { guildId: string } }) {
    const { guild, loading: guildLoading } = useGuild(params.guildId);
    const { success, error: showError } = useToast();
    const [stats, setStats] = useState<any>(null);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);

    useEffect(() => {
        // Fetch economy stats
        // This would call your API endpoint
    }, [params.guildId]);

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
                        <h1 className="text-3xl font-bold text-white mb-2">نظام الاقتصاد</h1>
                        <p className="text-gray-400">إدارة اقتصاد السيرفر</p>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <Card className="bg-discord-not-quite-black-hover border-discord-blurple/20">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-discord-blurple/20 rounded-lg">
                                    <DollarSign className="w-6 h-6 text-discord-blurple" />
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm">إجمالي الأموال</p>
                                    <p className="text-2xl font-bold text-white">💰 1,250,000</p>
                                </div>
                            </div>
                        </Card>

                        <Card className="bg-discord-not-quite-black-hover border-discord-green/20">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-discord-green/20 rounded-lg">
                                    <TrendingUp className="w-6 h-6 text-discord-green" />
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm">متوسط الرصيد</p>
                                    <p className="text-2xl font-bold text-white">💰 15,625</p>
                                </div>
                            </div>
                        </Card>

                        <Card className="bg-discord-not-quite-black-hover border-discord-yellow/20">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-discord-yellow/20 rounded-lg">
                                    <Users className="w-6 h-6 text-discord-yellow" />
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm">عدد المستخدمين</p>
                                    <p className="text-2xl font-bold text-white">80</p>
                                </div>
                            </div>
                        </Card>

                        <Card className="bg-discord-not-quite-black-hover border-discord-fuchsia/20">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-discord-fuchsia/20 rounded-lg">
                                    <Award className="w-6 h-6 text-discord-fuchsia" />
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm">أغنى عضو</p>
                                    <p className="text-2xl font-bold text-white">💰 125,000</p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Leaderboard */}
                    <Card title="🏆 لوحة المتصدرين">
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map((rank) => (
                                <div
                                    key={rank}
                                    className="flex items-center gap-4 p-4 bg-discord-not-quite-black rounded-lg"
                                >
                                    <div className="text-2xl">{rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}</div>
                                    <div className="flex-1">
                                        <p className="text-white font-medium">User #{rank}</p>
                                        <p className="text-gray-400 text-sm">💰 {(125000 - rank * 20000).toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Settings */}
                    <Card title="⚙️ الإعدادات" className="mt-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    المكافأة اليومية
                                </label>
                                <input
                                    type="number"
                                    className="w-full px-4 py-2 bg-discord-not-quite-black border border-discord-not-quite-black-hover rounded-lg text-white"
                                    placeholder="100"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    مكافأة Streak
                                </label>
                                <input
                                    type="number"
                                    className="w-full px-4 py-2 bg-discord-not-quite-black border border-discord-not-quite-black-hover rounded-lg text-white"
                                    placeholder="50"
                                />
                            </div>
                            <Button variant="primary" size="lg" className="w-full">
                                حفظ الإعدادات
                            </Button>
                        </div>
                    </Card>
                </main>
            </div>
        </div>
    );
}
