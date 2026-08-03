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

export default function MusicPage({ params }: { params: { guildId: string } }) {
  const { guild, loading: guildLoading, updateGuild } = useGuild(params.guildId);
  const { success, error: showError } = useToast();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    enabled: false,
    defaultVolume: 50,
    autoLeave: true,
    leaveTime: 5,
  });

  useEffect(() => {
    if (guild?.music) {
      setSettings({
        enabled: guild.music.enabled || false,
        defaultVolume: guild.music.defaultVolume || 50,
        autoLeave: guild.music.autoLeave !== false,
        leaveTime: guild.music.leaveTime || 5,
      });
    }
  }, [guild]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await updateGuild({ music: settings });
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
              <h1 className="text-3xl font-bold text-white mb-2">إعدادات الموسيقى</h1>
              <p className="text-gray-400">إدارة نظام الموسيقى</p>
            </div>
            <Button onClick={saveSettings} isLoading={saving} variant="primary" size="lg">
              حفظ الإعدادات
            </Button>
          </div>

          <Card title="إعدادات الموسيقى">
            <div className="space-y-6">
              <Toggle
                checked={settings.enabled}
                onChange={(checked) => setSettings({ ...settings, enabled: checked })}
                label="تفعيل نظام الموسيقى"
                size="md"
              />
              <Input
                label="الصوت الافتراضي (0-100)"
                type="number"
                min="0"
                max="100"
                value={settings.defaultVolume}
                onChange={(e) => setSettings({ ...settings, defaultVolume: parseInt(e.target.value) })}
              />
              <Toggle
                checked={settings.autoLeave}
                onChange={(checked) => setSettings({ ...settings, autoLeave: checked })}
                label="مغادرة تلقائية عند عدم الاستخدام"
                size="md"
              />
              {settings.autoLeave && (
                <Input
                  label="وقت المغادرة (بالدقائق)"
                  type="number"
                  min="1"
                  value={settings.leaveTime}
                  onChange={(e) => setSettings({ ...settings, leaveTime: parseInt(e.target.value) })}
                />
              )}
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
