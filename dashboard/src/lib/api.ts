const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || process.env.BOT_API_URL || 'http://localhost:3001';

export const api = {
  async get(endpoint: string, token?: string) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'x-api-secret': token }),
      },
    });
    return response.json();
  },

  async post(endpoint: string, data: any, token?: string) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'x-api-secret': token }),
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },
};
