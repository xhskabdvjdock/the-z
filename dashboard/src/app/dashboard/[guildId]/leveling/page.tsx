'use client';

import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Toggle from '@/components/ui/Toggle';
import Loading from '@/components/ui/Loading';
import { useGuild } from '@/hooks/useGuild';
import { TrendingUp, Award, Users, Activity } from 'lucide-react';

export default function LevelingPage({ params }: { params: { guildId: string } }) {
    const { guild, loading: guildLoading, updateGuild } = useGuild(params.guildId);
    const [enabled, setEnabled] = useState(false);

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
                        <h1 className="text-3xl font-bold text-white mb-2">نظام المستويات</h1>
                        <p className="text-gray-400">إدارة نظام XP والمستويات</p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <Card className="bg-discord-not-quite-black-hover border-discord-blurple/20">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-discord-blurple/20 rounded-lg">
                                    <TrendingUp className="w-6 h-6 text-discord-blurple" />
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm">أعلى مستوى</p>
                                    <p className="text-2xl font-bold text-white">Level 47</p>
                                </div>
                            </div>
                        </Card>

                        <Card className="bg-discord-not-quite-black-hover border-discord-green/20">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-discord-green/20 rounded-lg">
                                    <Award className="w-6 h-6 text-discord-green" />
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm">متوسط المستوى</p>
                                    <p className="text-2xl font-bold text-white">Level 12</p>
                                </div>
                            </div>
                        </Card>

                        <Card className="bg-discord-not-quite-black-hover border-discord-yellow/20">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-discord-yellow/20 rounded-lg">
                                    <Users className="w-6 h-6 text-discord-yellow" />
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm">مستخدمين نشطين</p>
                                    <p className="text-2xl font-bold text-white">65</p>
                                </div>
                            </div>
                        </Card>

                        <Card className="bg-discord-not-quite-black-hover border-discord-fuchsia/20">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-discord-fuchsia/20 rounded-lg">
                                    <Activity className="w-6 h-6 text-discord-fuchsia" />
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm">إجمالي XP</p>
                                    <p className="text-2xl font-bold text-white">125,450</p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Settings */}
                    <Card title="⚙️ إعدادات النظام" className="mb-6">
                        <div className="space-y-6">
                            <Toggle
                                checked={enabled}
                                onChange={setEnabled}
                                label="تفعيل نظام المستويات"
                                size="md"
                            />

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    XP لكل رسالة (min-max)
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="number"
                                        className="px-4 py-2 bg-discord-not-quite-black border border-discord-not-quite-black-hover rounded-lg text-white"
                                        placeholder="15"
                                    />
                                    <input
                                        type="number"
                                        className="px-4 py-2 bg-discord-not-quite-black border border-discord-not-quite-black-hover rounded-lg text-white"
                                        placeholder="25"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Cooldown (ثواني)
                                </label>
                                <input
                                    type="number"
                                    className="w-full px-4 py-2 bg-discord-not-quite-black border border-discord-not-quite-black-hover rounded-lg text-white"
                                    placeholder="60"
                                />
                            </div>

                            <Button variant="primary" size="lg" className="w-full">
                                حفظ الإعدادات
                            </Button>
                        </div>
                    </Card>

                    {/* Level Rewards */}
                    <Card title="🎁 مكافآت المستويات">
                        <p className="text-gray-400 mb-4">أضف رولات تلقائية عند الوصول لمستويات معينة</p>
                        <Button variant="primary">
                            + إضافة مكافأة
                        </Button>
                    </Card>
                </main>
            </div>
        </div>
    );
}
