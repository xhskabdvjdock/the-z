'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Toggle from '@/components/ui/Toggle';
import Button from '@/components/ui/Button';
import Loading from '@/components/ui/Loading';
import Badge from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { useGuild } from '@/hooks/useGuild';
import { Trash2, Plus, Shield, X } from 'lucide-react';

export default function TicketsPage({ params }: { params: { guildId: string } }) {
  const { guild, loading: guildLoading, updateGuild } = useGuild(params.guildId);
  const { success, error: showError } = useToast();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>({
    enabled: false,
    categoryId: '',
    supportRoles: [],
    blockedRoles: [],
    types: [],
  });
  const [newType, setNewType] = useState({ name: '', emoji: '', roleId: '', description: '' });
  const [newSupportRole, setNewSupportRole] = useState('');
  const [newBlockedRole, setNewBlockedRole] = useState('');

  useEffect(() => {
    if (guild?.tickets) {
      setSettings({
        enabled: guild.tickets.enabled || false,
        categoryId: guild.tickets.categoryId || '',
        supportRoles: guild.tickets.supportRoles || [],
        blockedRoles: guild.tickets.blockedRoles || [],
        types: guild.tickets.types || [],
      });
    }
  }, [guild]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await updateGuild({
        tickets: settings,
      });
      success('تم حفظ الإعدادات بنجاح!');
    } catch (err: any) {
      showError(err.message || 'حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const addTicketType = () => {
    if (newType.name.trim()) {
      setSettings({
        ...settings,
        types: [...settings.types, { ...newType }],
      });
      setNewType({ name: '', emoji: '', roleId: '', description: '' });
    }
  };

  const removeTicketType = (index: number) => {
    setSettings({
      ...settings,
      types: settings.types.filter((_: any, i: number) => i !== index),
    });
  };

  const addSupportRole = () => {
    if (newSupportRole.trim() && !settings.supportRoles.includes(newSupportRole.trim())) {
      setSettings({
        ...settings,
        supportRoles: [...settings.supportRoles, newSupportRole.trim()],
      });
      setNewSupportRole('');
    }
  };

  const removeSupportRole = (roleId: string) => {
    setSettings({
      ...settings,
      supportRoles: settings.supportRoles.filter((id: string) => id !== roleId),
    });
  };

  const addBlockedRole = () => {
    if (newBlockedRole.trim() && !settings.blockedRoles.includes(newBlockedRole.trim())) {
      setSettings({
        ...settings,
        blockedRoles: [...settings.blockedRoles, newBlockedRole.trim()],
      });
      setNewBlockedRole('');
    }
  };

  const removeBlockedRole = (roleId: string) => {
    setSettings({
      ...settings,
      blockedRoles: settings.blockedRoles.filter((id: string) => id !== roleId),
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
              <h1 className="text-3xl font-bold text-white mb-2">إعدادات التكتات</h1>
              <p className="text-gray-400">إدارة نظام التكتات والدعم</p>
            </div>
            <Button onClick={saveSettings} isLoading={saving} variant="primary" size="lg">
              حفظ الإعدادات
            </Button>
          </div>

          <Card title="نظام التكتات" className="mb-6">
            <div className="space-y-6">
              <Toggle
                checked={settings.enabled}
                onChange={(checked) => setSettings({ ...settings, enabled: checked })}
                label="تفعيل نظام التكتات"
                size="md"
              />

              <Input
                label="Category للتكتات"
                value={settings.categoryId}
                onChange={(e) => setSettings({ ...settings, categoryId: e.target.value })}
                placeholder="أدخل Category ID"
                helperText="Category الذي سيتم إنشاء التكتات فيه"
              />
            </div>
          </Card>

          <Card title="رتب الدعم" className="mb-6">
            <div className="space-y-4">
              <p className="text-gray-400 text-sm">
                الرتب المسموح لها بإغلاق واستلام التذاكر
              </p>
              
              {settings.supportRoles.length > 0 ? (
                <div className="space-y-2">
                  {settings.supportRoles.map((roleId: string, index: number) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-discord-not-quite-black rounded-lg border border-discord-not-quite-black-hover"
                    >
                      <Shield className="w-5 h-5 text-green-500" />
                      <div className="flex-1">
                        <p className="text-white font-mono text-sm">{roleId}</p>
                      </div>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => removeSupportRole(roleId)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-4">لا توجد رتب دعم مضافة</p>
              )}

              <div className="flex gap-2">
                <Input
                  value={newSupportRole}
                  onChange={(e) => setNewSupportRole(e.target.value)}
                  placeholder="أدخل Role ID"
                  className="flex-1"
                />
                <Button onClick={addSupportRole} variant="primary">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>

          <Card title="الرتب المحظورة" className="mb-6">
            <div className="space-y-4">
              <p className="text-gray-400 text-sm">
                الرتب المحظورة من إنشاء التذاكر
              </p>
              
              {settings.blockedRoles.length > 0 ? (
                <div className="space-y-2">
                  {settings.blockedRoles.map((roleId: string, index: number) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-discord-not-quite-black rounded-lg border border-discord-not-quite-black-hover"
                    >
                      <Shield className="w-5 h-5 text-red-500" />
                      <div className="flex-1">
                        <p className="text-white font-mono text-sm">{roleId}</p>
                      </div>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => removeBlockedRole(roleId)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-4">لا توجد رتب محظورة مضافة</p>
              )}

              <div className="flex gap-2">
                <Input
                  value={newBlockedRole}
                  onChange={(e) => setNewBlockedRole(e.target.value)}
                  placeholder="أدخل Role ID"
                  className="flex-1"
                />
                <Button onClick={addBlockedRole} variant="primary">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>

          <Card title="أنواع التكتات">
            <div className="space-y-4">
              {settings.types.length > 0 ? (
                <div className="space-y-2">
                  {settings.types.map((type: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-4 bg-discord-not-quite-black rounded-lg border border-discord-not-quite-black-hover"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xl">{type.emoji || '📝'}</span>
                          <p className="text-white font-medium">{type.name}</p>
                        </div>
                        {type.description && (
                          <p className="text-sm text-gray-400">{type.description}</p>
                        )}
                        {type.roleId && (
                          <Badge variant="info" size="sm" className="mt-2">
                            Role ID: {type.roleId}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => removeTicketType(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">لا توجد أنواع تكتات مضافة</p>
              )}

              <div className="border-t border-discord-not-quite-black pt-4 space-y-4">
                <h3 className="text-lg font-semibold text-white">إضافة نوع تكت جديد</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="اسم النوع"
                    value={newType.name}
                    onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                    placeholder="مثال: دعم، شكوى، اقتراح"
                  />
                  <Input
                    label="Emoji"
                    value={newType.emoji}
                    onChange={(e) => setNewType({ ...newType, emoji: e.target.value })}
                    placeholder="📝"
                  />
                  <Input
                    label="Role ID (اختياري)"
                    value={newType.roleId}
                    onChange={(e) => setNewType({ ...newType, roleId: e.target.value })}
                    placeholder="Role ID للوصول للتكت"
                  />
                  <Input
                    label="الوصف (اختياري)"
                    value={newType.description}
                    onChange={(e) => setNewType({ ...newType, description: e.target.value })}
                    placeholder="وصف مختصر للنوع"
                  />
                </div>
                <Button onClick={addTicketType} variant="primary" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  إضافة نوع
                </Button>
              </div>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
