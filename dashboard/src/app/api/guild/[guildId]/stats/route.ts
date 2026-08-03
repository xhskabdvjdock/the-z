import { NextRequest, NextResponse } from 'next/server';

const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:3001';
const BOT_API_SECRET = process.env.BOT_API_SECRET || '';

export async function GET(
  request: NextRequest,
  { params }: { params: { guildId: string } }
) {
  try {
    const response = await fetch(`${BOT_API_URL}/api/guild/${params.guildId}/stats`, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-secret': BOT_API_SECRET,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch stats' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
