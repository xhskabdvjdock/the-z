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
import { Plus, X } from 'lucide-react';

export default function RolesPage({ params }: { params: { guildId: string } }) {
  const { guild, loading: guildLoading, updateGuild } = useGuild(params.guildId);
  const { success, error: showError } = useToast();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    enabled: false,
    roles: [] as string[],
    reactionRoles: [] as any[],
    buttonRoles: [] as any[],
    timeRoles: [] as any[],
  });
  const [newRole, setNewRole] = useState('');

  useEffect(() => {
    if (guild?.autoroles) {
      setSettings({
        enabled: guild.autoroles.enabled || false,
        roles: guild.autoroles.roles || [],
        reactionRoles: guild.autoroles.reactionRoles || [],
        buttonRoles: guild.autoroles.buttonRoles || [],
        timeRoles: guild.autoroles.timeRoles || [],
      });
    }
  }, [guild]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await updateGuild({ autoroles: settings });
      success('تم حفظ الإعدادات بنجاح!');
    } catch (err: any) {
      showError(err.message || 'حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const addAutoRole = () => {
    if (newRole && !settings.roles.includes(newRole)) {
      setSettings({
        ...settings,
        roles: [...settings.roles, newRole],
      });
      setNewRole('');
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
              <h1 className="text-3xl font-bold text-white mb-2">إعدادات الرولات</h1>
              <p className="text-gray-400">إدارة الرولات التلقائية</p>
            </div>
            <Button onClick={saveSettings} isLoading={saving} variant="primary" size="lg">
              حفظ الإعدادات
            </Button>
          </div>

          <Card title="نظام الرولات التلقائية" className="mb-6">
            <Toggle
              checked={settings.enabled}
              onChange={(checked) => setSettings({ ...settings, enabled: checked })}
              label="تفعيل نظام الرولات التلقائية"
              size="md"
            />
          </Card>

          <Card title="Auto Role" className="mb-6">
            <div className="space-y-4">
              {settings.roles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {settings.roles.map((roleId, index) => (
                    <Badge key={index} variant="info" className="flex items-center gap-2">
                      {roleId}
                      <button
                        onClick={() => setSettings({
                          ...settings,
                          roles: settings.roles.filter((_, i) => i !== index)
                        })}
                        className="hover:opacity-70"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addAutoRole()}
                  placeholder="Role ID"
                />
                <Button onClick={addAutoRole} variant="primary">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>

          <Card title="Reaction Roles">
            <p className="text-gray-400 text-sm">استخدم الأمر في Discord لإعداد Reaction Roles</p>
          </Card>
        </main>
      </div>
    </div>
  );
}
