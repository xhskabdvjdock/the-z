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
import Badge from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { useGuild } from '@/hooks/useGuild';
import { Plus, Trash2 } from 'lucide-react';

export default function AutoLinesPage({ params }: { params: { guildId: string } }) {
  const { guild, loading: guildLoading, updateGuild } = useGuild(params.guildId);
  const { success, error: showError } = useToast();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    enabled: false,
    lines: [] as any[],
  });
  const [newLine, setNewLine] = useState({
    channelId: '',
    message: '',
    interval: 60,
  });

  useEffect(() => {
    if (guild?.autolines) {
      setSettings({
        enabled: guild.autolines.enabled || false,
        lines: guild.autolines.lines || [],
      });
    }
  }, [guild]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await updateGuild({ autolines: settings });
      success('تم حفظ الإعدادات بنجاح!');
    } catch (err: any) {
      showError(err.message || 'حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const addLine = () => {
    if (newLine.channelId && newLine.message) {
      setSettings({
        ...settings,
        lines: [...settings.lines, { ...newLine, embed: null, lastSent: null }],
      });
      setNewLine({ channelId: '', message: '', interval: 60 });
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
              <h1 className="text-3xl font-bold text-white mb-2">إعدادات Auto Lines</h1>
              <p className="text-gray-400">إدارة الرسائل التلقائية</p>
            </div>
            <Button onClick={saveSettings} isLoading={saving} variant="primary" size="lg">
              حفظ الإعدادات
            </Button>
          </div>

          <Card title="Auto Lines" className="mb-6">
            <div className="space-y-6">
              <Toggle
                checked={settings.enabled}
                onChange={(checked) => setSettings({ ...settings, enabled: checked })}
                label="تفعيل Auto Lines"
                size="md"
              />
              {settings.lines.length > 0 && (
                <div className="space-y-2">
                  {settings.lines.map((line, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-discord-not-quite-black rounded-lg border border-discord-not-quite-black-hover">
                      <div className="flex-1">
                        <p className="font-medium text-white">Auto Line #{index + 1}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="info" size="sm">Channel: {line.channelId}</Badge>
                          <Badge variant="info" size="sm">Interval: {line.interval} min</Badge>
                        </div>
                      </div>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setSettings({
                          ...settings,
                          lines: settings.lines.filter((_, i) => i !== index)
                        })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card title="إضافة Auto Line جديد">
            <div className="space-y-4">
              <Input
                label="القناة"
                value={newLine.channelId}
                onChange={(e) => setNewLine({ ...newLine, channelId: e.target.value })}
                placeholder="Channel ID"
              />
              <Textarea
                label="الرسالة"
                value={newLine.message}
                onChange={(e) => setNewLine({ ...newLine, message: e.target.value })}
                placeholder="اكتب الرسالة هنا..."
                rows={5}
              />
              <Input
                label="الفترة (بالدقائق)"
                type="number"
                min="1"
                value={newLine.interval}
                onChange={(e) => setNewLine({ ...newLine, interval: parseInt(e.target.value) })}
              />
              <Button onClick={addLine} variant="primary" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                إضافة Auto Line
              </Button>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
