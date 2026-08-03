'use client';

import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Loading from '@/components/ui/Loading';
import { useGuild } from '@/hooks/useGuild';
import { Settings, Bell, Shield, Music, Star, MessageSquare } from 'lucide-react';

export default function SettingsPage({ params }: { params: { guildId: string } }) {
    const { guild, loading: guildLoading } = useGuild(params.guildId);

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
                        <h1 className="text-3xl font-bold text-white mb-2">الإعدادات العامة</h1>
                        <p className="text-gray-400">إدارة إعدادات البوت</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <a href={`/dashboard/${params.guildId}/welcome`} className="block">
                            <Card className="h-full hover:border-discord-blurple/50 transition-colors cursor-pointer">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-discord-blurple/20 rounded-lg">
                                        <Bell className="w-6 h-6 text-discord-blurple" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white mb-1">الترحيب والمغادرة</h3>
                                        <p className="text-gray-400 text-sm">إعدادات رسائل الترحيب</p>
                                    </div>
                                </div>
                            </Card>
                        </a>

                        <a href={`/dashboard/${params.guildId}/automod`} className="block">
                            <Card className="h-full hover:border-discord-blurple/50 transition-colors cursor-pointer">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-discord-red/20 rounded-lg">
                                        <Shield className="w-6 h-6 text-discord-red" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white mb-1">AutoMod</h3>
                                        <p className="text-gray-400 text-sm">الحماية التلقائية</p>
                                    </div>
                                </div>
                            </Card>
                        </a>

                        <a href={`/dashboard/${params.guildId}/music`} className="block">
                            <Card className="h-full hover:border-discord-blurple/50 transition-colors cursor-pointer">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-discord-green/20 rounded-lg">
                                        <Music className="w-6 h-6 text-discord-green" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white mb-1">الموسيقى</h3>
                                        <p className="text-gray-400 text-sm">إعدادات نظام الموسيقى</p>
                                    </div>
                                </div>
                            </Card>
                        </a>

                        <a href={`/dashboard/${params.guildId}/roles`} className="block">
                            <Card className="h-full hover:border-discord-blurple/50 transition-colors cursor-pointer">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-discord-fuchsia/20 rounded-lg">
                                        <Star className="w-6 h-6 text-discord-fuchsia" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white mb-1">الرولات</h3>
                                        <p className="text-gray-400 text-sm">Auto Roles و Button Roles</p>
                                    </div>
                                </div>
                            </Card>
                        </a>

                        <a href={`/dashboard/${params.guildId}/autolines`} className="block">
                            <Card className="h-full hover:border-discord-blurple/50 transition-colors cursor-pointer">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-discord-yellow/20 rounded-lg">
                                        <MessageSquare className="w-6 h-6 text-discord-yellow" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white mb-1">Auto Lines</h3>
                                        <p className="text-gray-400 text-sm">رسائل تلقائية</p>
                                    </div>
                                </div>
                            </Card>
                        </a>

                        <Card className="h-full border-discord-not-quite-black-hover">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-gray-700/20 rounded-lg">
                                    <Settings className="w-6 h-6 text-gray-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-1">إعدادات عامة</h3>
                                    <p className="text-gray-400 text-sm">البريفكس واللغة</p>
                                </div>
                            </div>
                        </Card>
                    </div>
                </main>
            </div>
        </div>
    );
}
