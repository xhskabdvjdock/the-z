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
import { useToast } from '@/components/ui/Toast';
import { useGuild } from '@/hooks/useGuild';
import { apiClient } from '@/lib/api-client';
import { Trash2, Plus } from 'lucide-react';

export default function ApplicationsPage({ params }: { params: { guildId: string } }) {
  const { guild, loading: guildLoading, updateGuild } = useGuild(params.guildId);
  const { success, error: showError } = useToast();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    enabled: false,
    channelId: '',
    questions: [] as any[],
    ticketCategory: '',
  });
  const [newQuestion, setNewQuestion] = useState({ question: '', type: 'text', required: true });

  useEffect(() => {
    if (guild?.applications) {
      setSettings({
        enabled: guild.applications.enabled || false,
        channelId: guild.applications.channelId || '',
        questions: guild.applications.questions || [],
        ticketCategory: guild.applications.ticketCategory || '',
      });
    }
  }, [guild]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await updateGuild({
        applications: settings,
      });
      success('تم حفظ الإعدادات بنجاح!');
    } catch (err: any) {
      showError(err.message || 'حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = () => {
    if (newQuestion.question.trim()) {
      setSettings({
        ...settings,
        questions: [...settings.questions, { ...newQuestion, options: [] }],
      });
      setNewQuestion({ question: '', type: 'text', required: true });
    }
  };

  const removeQuestion = (index: number) => {
    setSettings({
      ...settings,
      questions: settings.questions.filter((_, i) => i !== index),
    });
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
              <h1 className="text-3xl font-bold text-white mb-2">إعدادات التقديمات</h1>
              <p className="text-gray-400">إدارة نظام التقديمات والاستمارات</p>
            </div>
            <Button onClick={saveSettings} isLoading={saving} variant="primary" size="lg">
              حفظ الإعدادات
            </Button>
          </div>

          <Card title="نظام التقديمات" className="mb-6">
            <div className="space-y-6">
              <Toggle
                checked={settings.enabled}
                onChange={(checked) => setSettings({ ...settings, enabled: checked })}
                label="تفعيل نظام التقديمات"
                size="md"
              />

              <Input
                label="قناة التقديمات"
                value={settings.channelId}
                onChange={(e) => setSettings({ ...settings, channelId: e.target.value })}
                placeholder="أدخل Channel ID"
                helperText="القناة التي سيتم إرسال التقديمات فيها"
              />

              <Input
                label="Category للتكتات"
                value={settings.ticketCategory}
                onChange={(e) => setSettings({ ...settings, ticketCategory: e.target.value })}
                placeholder="أدخل Category ID"
                helperText="Category الذي سيتم إنشاء تكتات التقديمات فيه"
              />
            </div>
          </Card>

          <Card title="أسئلة التقديم" className="mb-6">
            <div className="space-y-4">
              {settings.questions.length > 0 ? (
                <div className="space-y-2">
                  {settings.questions.map((q, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-4 bg-discord-not-quite-black rounded-lg border border-discord-not-quite-black-hover"
                    >
                      <div className="flex-1">
                        <p className="text-white font-medium">{q.question}</p>
                        <p className="text-sm text-gray-400 mt-1">
                          النوع: {q.type === 'text' ? 'نص' : q.type === 'number' ? 'رقم' : 'اختيار'} |{' '}
                          {q.required ? 'مطلوب' : 'اختياري'}
                        </p>
                      </div>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => removeQuestion(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">لا توجد أسئلة مضافة</p>
              )}

              <div className="border-t border-discord-not-quite-black pt-4 space-y-4">
                <h3 className="text-lg font-semibold text-white">إضافة سؤال جديد</h3>
                <Input
                  label="السؤال"
                  value={newQuestion.question}
                  onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                  placeholder="أدخل السؤال"
                />
                <Select
                  label="نوع السؤال"
                  value={newQuestion.type}
                  onChange={(e) => setNewQuestion({ ...newQuestion, type: e.target.value })}
                  options={[
                    { value: 'text', label: 'نص' },
                    { value: 'number', label: 'رقم' },
                    { value: 'select', label: 'اختيار' },
                  ]}
                />
                <Toggle
                  checked={newQuestion.required}
                  onChange={(checked) => setNewQuestion({ ...newQuestion, required: checked })}
                  label="السؤال مطلوب"
                />
                <Button onClick={addQuestion} variant="primary" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  إضافة سؤال
                </Button>
              </div>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
