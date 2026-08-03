import { NextRequest, NextResponse } from 'next/server';

const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:3001';
const BOT_API_SECRET = process.env.BOT_API_SECRET || '';

export async function GET(
  request: NextRequest,
  { params }: { params: { guildId: string } }
) {
  try {
    const response = await fetch(`${BOT_API_URL}/api/guild/${params.guildId}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-secret': BOT_API_SECRET,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch guild' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching guild:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { guildId: string } }
) {
  try {
    const body = await request.json();

    const response = await fetch(`${BOT_API_URL}/api/guild/${params.guildId}/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-secret': BOT_API_SECRET,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
