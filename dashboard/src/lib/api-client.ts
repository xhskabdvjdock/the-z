// Use Next.js API routes instead of direct bot API calls
// This allows us to keep BOT_API_SECRET secure on the server

export const apiClient = {
  async get(endpoint: string) {
    const response = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.statusText} - ${errorText}`);
    }
    return response.json();
  },

  async post(endpoint: string, data: any) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.statusText} - ${errorText}`);
    }
    return response.json();
  },

  // Guild specific methods - use Next.js API routes
  async getGuild(guildId: string) {
    return this.get(`/api/guild/${guildId}`);
  },

  async updateGuildSettings(guildId: string, settings: any) {
    return this.post(`/api/guild/${guildId}`, settings);
  },

  async getGuildStats(guildId: string) {
    return this.get(`/api/guild/${guildId}/stats`);
  },
};
