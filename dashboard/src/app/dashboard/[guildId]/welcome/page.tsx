'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Toggle from '@/components/ui/Toggle';
import Button from '@/components/ui/Button';
import Loading from '@/components/ui/Loading';
import { useToast } from '@/components/ui/Toast';
import { useGuild } from '@/hooks/useGuild';

export default function WelcomePage({ params }: { params: { guildId: string } }) {
  const { guild, loading: guildLoading, updateGuild } = useGuild(params.guildId);
  const { success, error: showError } = useToast();
  const [saving, setSaving] = useState(false);
  const [welcomeSettings, setWelcomeSettings] = useState({
    enabled: false,
    channelId: '',
    message: '',
    embed: { enabled: false, title: '', description: '', color: '#5865F2', thumbnail: false, image: '' },
    image: { enabled: false, background: '' },
  });
  const [leaveSettings, setLeaveSettings] = useState({
    enabled: false,
    channelId: '',
    message: '',
    embed: { enabled: false, title: '', description: '', color: '#ED4245' },
  });

  useEffect(() => {
    if (guild?.welcome) {
      setWelcomeSettings({
        enabled: guild.welcome.enabled || false,
        channelId: guild.welcome.channelId || '',
        message: guild.welcome.message || '',
        embed: guild.welcome.embed || { enabled: false, title: '', description: '', color: '#5865F2', thumbnail: false, image: '' },
        image: guild.welcome.image || { enabled: false, background: '' },
      });
    }
    if (guild?.leave) {
      setLeaveSettings({
        enabled: guild.leave.enabled || false,
        channelId: guild.leave.channelId || '',
        message: guild.leave.message || '',
        embed: guild.leave.embed || { enabled: false, title: '', description: '', color: '#ED4245' },
      });
    }
  }, [guild]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await updateGuild({
        welcome: welcomeSettings,
        leave: leaveSettings,
      });
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
              <h1 className="text-3xl font-bold text-white mb-2">إعدادات الترحيب والمغادرة</h1>
              <p className="text-gray-400">إدارة رسائل الترحيب والمغادرة</p>
            </div>
            <Button onClick={saveSettings} isLoading={saving} variant="primary" size="lg">
              حفظ الإعدادات
            </Button>
          </div>

          <div className="space-y-6">
            <Card title="رسالة الترحيب">
              <div className="space-y-6">
                <Toggle
                  checked={welcomeSettings.enabled}
                  onChange={(checked) => setWelcomeSettings({ ...welcomeSettings, enabled: checked })}
                  label="تفعيل رسالة الترحيب"
                  size="md"
                />

                <Input
                  label="القناة"
                  value={welcomeSettings.channelId}
                  onChange={(e) => setWelcomeSettings({ ...welcomeSettings, channelId: e.target.value })}
                  placeholder="Channel ID"
                  helperText="القناة التي سيتم إرسال رسالة الترحيب فيها"
                />

                <Textarea
                  label="الرسالة"
                  value={welcomeSettings.message}
                  onChange={(e) => setWelcomeSettings({ ...welcomeSettings, message: e.target.value })}
                  placeholder="مرحباً {user} في {server}!"
                  helperText="المتغيرات المتاحة: {user}, {username}, {tag}, {mention}, {server}, {memberCount}"
                />

                <div className="space-y-4">
                  <Toggle
                    checked={welcomeSettings.embed.enabled}
                    onChange={(checked) => setWelcomeSettings({
                      ...welcomeSettings,
                      embed: { ...welcomeSettings.embed, enabled: checked }
                    })}
                    label="استخدام Embed"
                    size="md"
                  />

                  {welcomeSettings.embed.enabled && (
                    <div className="space-y-4 pr-6 border-r-2 border-discord-blurple/30">
                      <Input
                        label="عنوان Embed"
                        value={welcomeSettings.embed.title}
                        onChange={(e) => setWelcomeSettings({
                          ...welcomeSettings,
                          embed: { ...welcomeSettings.embed, title: e.target.value }
                        })}
                        placeholder="مرحباً {user}!"
                      />
                      <Textarea
                        label="وصف Embed"
                        value={welcomeSettings.embed.description}
                        onChange={(e) => setWelcomeSettings({
                          ...welcomeSettings,
                          embed: { ...welcomeSettings.embed, description: e.target.value }
                        })}
                        placeholder="مرحباً بك في {server}!"
                      />
                      <Input
                        label="اللون (Hex)"
                        value={welcomeSettings.embed.color}
                        onChange={(e) => setWelcomeSettings({
                          ...welcomeSettings,
                          embed: { ...welcomeSettings.embed, color: e.target.value }
                        })}
                        placeholder="#5865F2"
                        type="color"
                      />
                      <Toggle
                        checked={welcomeSettings.embed.thumbnail}
                        onChange={(checked) => setWelcomeSettings({
                          ...welcomeSettings,
                          embed: { ...welcomeSettings.embed, thumbnail: checked }
                        })}
                        label="عرض صورة المستخدم"
                        size="sm"
                      />
                    </div>
                  )}

                  <Toggle
                    checked={welcomeSettings.image.enabled}
                    onChange={(checked) => setWelcomeSettings({
                      ...welcomeSettings,
                      image: { ...welcomeSettings.image, enabled: checked }
                    })}
                    label="إرسال صورة ترحيب"
                    size="md"
                  />
                </div>
              </div>
            </Card>

            <Card title="رسالة المغادرة">
              <div className="space-y-6">
                <Toggle
                  checked={leaveSettings.enabled}
                  onChange={(checked) => setLeaveSettings({ ...leaveSettings, enabled: checked })}
                  label="تفعيل رسالة المغادرة"
                  size="md"
                />

                <Input
                  label="القناة"
                  value={leaveSettings.channelId}
                  onChange={(e) => setLeaveSettings({ ...leaveSettings, channelId: e.target.value })}
                  placeholder="Channel ID"
                  helperText="القناة التي سيتم إرسال رسالة المغادرة فيها"
                />

                <Textarea
                  label="الرسالة"
                  value={leaveSettings.message}
                  onChange={(e) => setLeaveSettings({ ...leaveSettings, message: e.target.value })}
                  placeholder="وداعاً {user}!"
                  helperText="المتغيرات المتاحة: {user}, {username}, {tag}, {mention}, {server}"
                />

                <Toggle
                  checked={leaveSettings.embed.enabled}
                  onChange={(checked) => setLeaveSettings({
                    ...leaveSettings,
                    embed: { ...leaveSettings.embed, enabled: checked }
                  })}
                  label="استخدام Embed"
                  size="md"
                />

                {leaveSettings.embed.enabled && (
                  <div className="space-y-4 pr-6 border-r-2 border-discord-red/30">
                    <Input
                      label="عنوان Embed"
                      value={leaveSettings.embed.title}
                      onChange={(e) => setLeaveSettings({
                        ...leaveSettings,
                        embed: { ...leaveSettings.embed, title: e.target.value }
                      })}
                      placeholder="وداعاً {user}"
                    />
                    <Textarea
                      label="وصف Embed"
                      value={leaveSettings.embed.description}
                      onChange={(e) => setLeaveSettings({
                        ...leaveSettings,
                        embed: { ...leaveSettings.embed, description: e.target.value }
                      })}
                      placeholder="غادر {user} السيرفر"
                    />
                    <Input
                      label="اللون (Hex)"
                      value={leaveSettings.embed.color}
                      onChange={(e) => setLeaveSettings({
                        ...leaveSettings,
                        embed: { ...leaveSettings.embed, color: e.target.value }
                      })}
                      placeholder="#ED4245"
                      type="color"
                    />
                  </div>
                )}
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
