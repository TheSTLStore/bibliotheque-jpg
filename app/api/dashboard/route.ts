import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getItemsByUser, getItemsWithUserOption } from '@/lib/notion';
import { HeritageItem } from '@/types';

const COOKIE_NAME = 'familyName';

export interface DashboardData {
  reservations: HeritageItem[];
  options: Array<HeritageItem & { position: number }>;
  reservationsWithOptions: HeritageItem[];
}

/**
 * GET /api/dashboard
 * Get user's reservations, options, and reservations with pending options
 */
export async function GET() {
  try {
    const cookieStore = cookies();
    const familyName = cookieStore.get(COOKIE_NAME)?.value;

    if (!familyName) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Fetch user's reservations and options in parallel
    const [reservations, itemsWithOption] = await Promise.all([
      getItemsByUser(familyName),
      getItemsWithUserOption(familyName),
    ]);

    // Add position information to options
    const options = itemsWithOption.map((item) => ({
      ...item,
      position: item.options_par.indexOf(familyName) + 1,
    }));

    // Filter reservations that have options from others
    const reservationsWithOptions = reservations.filter(
      (item) => item.options_par.length > 0
    );

    const dashboardData: DashboardData = {
      reservations,
      options,
      reservationsWithOptions,
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des données' },
      { status: 500 }
    );
  }
}
