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

export default function GiveawaysPage({ params }: { params: { guildId: string } }) {
  const { guild, loading: guildLoading, updateGuild } = useGuild(params.guildId);
  const { success, error: showError } = useToast();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    enabled: false,
    channelId: '',
  });

  useEffect(() => {
    if (guild?.giveaways) {
      setSettings({
        enabled: guild.giveaways.enabled || false,
        channelId: guild.giveaways.channelId || '',
      });
    }
  }, [guild]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await updateGuild({ giveaways: settings });
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
              <h1 className="text-3xl font-bold text-white mb-2">إعدادات الجوائز</h1>
              <p className="text-gray-400">إدارة نظام الجوائز والمسابقات</p>
            </div>
            <Button onClick={saveSettings} isLoading={saving} variant="primary" size="lg">
              حفظ الإعدادات
            </Button>
          </div>

          <Card title="نظام الجوائز">
            <div className="space-y-6">
              <Toggle
                checked={settings.enabled}
                onChange={(checked) => setSettings({ ...settings, enabled: checked })}
                label="تفعيل نظام الجوائز"
                size="md"
              />
              <Input
                label="القناة الافتراضية"
                value={settings.channelId}
                onChange={(e) => setSettings({ ...settings, channelId: e.target.value })}
                placeholder="Channel ID"
                helperText="القناة الافتراضية لإنشاء الجوائز"
              />
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
