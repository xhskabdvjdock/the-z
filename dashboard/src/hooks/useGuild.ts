'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

export function useGuild(guildId: string) {
  const [guild, setGuild] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadGuild = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.getGuild(guildId);
        setGuild(data);
      } catch (err: any) {
        setError(err.message || 'فشل تحميل بيانات السيرفر');
      } finally {
        setLoading(false);
      }
    };

    if (guildId) {
      loadGuild();
    }
  }, [guildId]);

  const updateGuild = async (updates: any) => {
    try {
      const updated = await apiClient.updateGuildSettings(guildId, updates);
      setGuild(updated);
      return updated;
    } catch (err: any) {
      setError(err.message || 'فشل تحديث الإعدادات');
      throw err;
    }
  };

  return { guild, loading, error, updateGuild, refetch: () => {
    setLoading(true);
    apiClient.getGuild(guildId).then(setGuild).catch((err) => setError(err.message)).finally(() => setLoading(false));
  } };
}
