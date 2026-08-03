'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Toggle from '@/components/ui/Toggle';
import Button from '@/components/ui/Button';
import Loading from '@/components/ui/Loading';
import Badge from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { useGuild } from '@/hooks/useGuild';
import { Plus, X } from 'lucide-react';

export default function AutoModPage({ params }: { params: { guildId: string } }) {
  const { guild, loading: guildLoading, updateGuild } = useGuild(params.guildId);
  const { success, error: showError } = useToast();
  const [saving, setSaving] = useState(false);
  const [automod, setAutomod] = useState({
    enabled: false,
    antiSpam: { enabled: false, maxMessages: 5, timeWindow: 5 },
    antiLinks: { enabled: false, whitelist: [] as string[], channels: [] as string[] },
    antiRaid: { enabled: false, maxJoins: 5, timeWindow: 10 },
    antiCaps: { enabled: false, maxPercentage: 70, minLength: 10 },
    badWords: { enabled: false, words: [] as string[], action: 'warn' },
    punishment: 'warn' as 'warn' | 'mute' | 'kick' | 'ban',
  });
  const [newBadWord, setNewBadWord] = useState('');
  const [newWhitelist, setNewWhitelist] = useState('');

  useEffect(() => {
    if (guild?.automod) {
      setAutomod(guild.automod);
    }
  }, [guild]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await updateGuild({ automod });
      success('تم حفظ الإعدادات بنجاح!');
    } catch (err: any) {
      showError(err.message || 'حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const addBadWord = () => {
    if (newBadWord && !automod.badWords.words.includes(newBadWord)) {
      setAutomod({
        ...automod,
        badWords: { ...automod.badWords, words: [...automod.badWords.words, newBadWord] },
      });
      setNewBadWord('');
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
              <h1 className="text-3xl font-bold text-white mb-2">إعدادات AutoMod</h1>
              <p className="text-gray-400">إدارة الحماية التلقائية</p>
            </div>
            <Button onClick={saveSettings} isLoading={saving} variant="primary" size="lg">
              حفظ الإعدادات
            </Button>
          </div>

          <Card title="AutoMod" className="mb-6">
            <Toggle
              checked={automod.enabled}
              onChange={(checked) => setAutomod({ ...automod, enabled: checked })}
              label="تفعيل AutoMod"
              size="md"
            />
          </Card>

          <Card title="Anti Spam" className="mb-6">
            <div className="space-y-4">
              <Toggle
                checked={automod.antiSpam.enabled}
                onChange={(checked) => setAutomod({
                  ...automod,
                  antiSpam: { ...automod.antiSpam, enabled: checked }
                })}
                label="تفعيل Anti Spam"
              />
              {automod.antiSpam.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="الحد الأقصى للرسائل"
                    type="number"
                    value={automod.antiSpam.maxMessages}
                    onChange={(e) => setAutomod({
                      ...automod,
                      antiSpam: { ...automod.antiSpam, maxMessages: parseInt(e.target.value) }
                    })}
                  />
                  <Input
                    label="نافذة الوقت (بالثواني)"
                    type="number"
                    value={automod.antiSpam.timeWindow}
                    onChange={(e) => setAutomod({
                      ...automod,
                      antiSpam: { ...automod.antiSpam, timeWindow: parseInt(e.target.value) }
                    })}
                  />
                </div>
              )}
            </div>
          </Card>

          <Card title="Anti Links" className="mb-6">
            <Toggle
              checked={automod.antiLinks.enabled}
              onChange={(checked) => setAutomod({
                ...automod,
                antiLinks: { ...automod.antiLinks, enabled: checked }
              })}
              label="تفعيل Anti Links"
            />
          </Card>

          <Card title="Anti Caps" className="mb-6">
            <div className="space-y-4">
              <Toggle
                checked={automod.antiCaps.enabled}
                onChange={(checked) => setAutomod({
                  ...automod,
                  antiCaps: { ...automod.antiCaps, enabled: checked }
                })}
                label="تفعيل Anti Caps"
              />
              {automod.antiCaps.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="النسبة القصوى (%)"
                    type="number"
                    value={automod.antiCaps.maxPercentage}
                    onChange={(e) => setAutomod({
                      ...automod,
                      antiCaps: { ...automod.antiCaps, maxPercentage: parseInt(e.target.value) }
                    })}
                  />
                  <Input
                    label="الحد الأدنى للطول"
                    type="number"
                    value={automod.antiCaps.minLength}
                    onChange={(e) => setAutomod({
                      ...automod,
                      antiCaps: { ...automod.antiCaps, minLength: parseInt(e.target.value) }
                    })}
                  />
                </div>
              )}
            </div>
          </Card>

          <Card title="Bad Words" className="mb-6">
            <div className="space-y-4">
              <Toggle
                checked={automod.badWords.enabled}
                onChange={(checked) => setAutomod({
                  ...automod,
                  badWords: { ...automod.badWords, enabled: checked }
                })}
                label="تفعيل فلترة الكلمات السيئة"
              />
              {automod.badWords.enabled && (
                <>
                  <div className="flex gap-2">
                    <Input
                      value={newBadWord}
                      onChange={(e) => setNewBadWord(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addBadWord()}
                      placeholder="أضف كلمة سيئة"
                    />
                    <Button onClick={addBadWord} variant="primary">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {automod.badWords.words.map((word, index) => (
                      <Badge key={index} variant="danger" className="flex items-center gap-2">
                        {word}
                        <button
                          onClick={() => setAutomod({
                            ...automod,
                            badWords: {
                              ...automod.badWords,
                              words: automod.badWords.words.filter((_, i) => i !== index)
                            }
                          })}
                          className="hover:opacity-70"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </>
              )}
            </div>
          </Card>

          <Card title="العقوبة">
            <Select
              label="نوع العقوبة"
              value={automod.punishment}
              onChange={(e) => setAutomod({ ...automod, punishment: e.target.value as any })}
              options={[
                { value: 'warn', label: 'تحذير' },
                { value: 'mute', label: 'ميوت' },
                { value: 'kick', label: 'طرد' },
                { value: 'ban', label: 'حظر' },
              ]}
            />
          </Card>
        </main>
      </div>
    </div>
  );
}
