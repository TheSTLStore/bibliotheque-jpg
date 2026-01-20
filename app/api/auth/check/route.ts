import { NextRequest, NextResponse } from 'next/server';
import { getFamilyNameFromCookie } from '@/lib/auth';
import { AuthCheckResponse } from '@/types';

/**
 * GET /api/auth/check
 * Check if user is authenticated
 */
export async function GET(request: NextRequest) {
  try {
    const familyName = getFamilyNameFromCookie();

    const response: AuthCheckResponse = {
      authenticated: !!familyName,
      user: familyName
        ? {
            name: familyName,
            type: 'family',
          }
        : null,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Auth check error:', error);

    const response: AuthCheckResponse = {
      authenticated: false,
      user: null,
    };

    return NextResponse.json(response, { status: 200 });
  }
}
