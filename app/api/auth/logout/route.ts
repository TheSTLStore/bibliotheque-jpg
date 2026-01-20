import { NextRequest, NextResponse } from 'next/server';
import { clearFamilyNameCookie } from '@/lib/auth';

/**
 * POST /api/auth/logout
 * Family logout endpoint
 */
export async function POST(request: NextRequest) {
  try {
    // Clear cookie
    clearFamilyNameCookie();

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Logout error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Une erreur est survenue lors de la déconnexion',
      },
      { status: 500 }
    );
  }
}
