'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Toggle from '@/components/ui/Toggle';
import Button from '@/components/ui/Button';
import Loading from '@/components/ui/Loading';
import { useToast } from '@/components/ui/Toast';
import { useGuild } from '@/hooks/useGuild';

export default function RatingPage({ params }: { params: { guildId: string } }) {
  const { guild, loading: guildLoading, updateGuild } = useGuild(params.guildId);
  const { success, error: showError } = useToast();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    enabled: false,
    channelId: '',
    cooldown: 60,
  });

  useEffect(() => {
    if (guild?.rating) {
      setSettings({
        enabled: guild.rating.enabled || false,
        channelId: guild.rating.channelId || '',
        cooldown: guild.rating.cooldown || 60,
      });
    }
  }, [guild]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await updateGuild({ rating: settings });
      success('تم حفظ الإعدادات بنجاح!');
    } catch (err: any) {
      showError(err.message || 'حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

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
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">إعدادات التقييمات</h1>
              <p className="text-gray-400">إدارة نظام التقييمات</p>
            </div>
            <Button onClick={saveSettings} isLoading={saving} variant="primary" size="lg">
              حفظ الإعدادات
            </Button>
          </div>

          <Card title="نظام التقييمات">
            <div className="space-y-6">
              <Toggle
                checked={settings.enabled}
                onChange={(checked) => setSettings({ ...settings, enabled: checked })}
                label="تفعيل نظام التقييمات"
                size="md"
              />
              <Input
                label="القناة"
                value={settings.channelId}
                onChange={(e) => setSettings({ ...settings, channelId: e.target.value })}
                placeholder="Channel ID"
                helperText="القناة التي سيتم إرسال التقييمات فيها"
              />
              <Input
                label="Cooldown (بالثواني)"
                type="number"
                min="0"
                value={settings.cooldown}
                onChange={(e) => setSettings({ ...settings, cooldown: parseInt(e.target.value) })}
                helperText="الوقت بين كل تقييم"
              />
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
