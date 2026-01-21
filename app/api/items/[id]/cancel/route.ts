import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { cancelReservation, getItemById } from '@/lib/notion';
import { ConflictError, ItemNotFoundError } from '@/types';

const COOKIE_NAME = 'familyName';

/**
 * POST /api/items/[id]/cancel
 * Cancel a reservation for the current user
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const familyName = cookieStore.get(COOKIE_NAME)?.value;

    if (!familyName) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID item manquant' },
        { status: 400 }
      );
    }

    // Verify the user is the one who reserved the item
    const item = await getItemById(id);

    if (item.reserve_par !== familyName) {
      return NextResponse.json(
        { error: "Vous n'êtes pas le propriétaire de cette réservation" },
        { status: 403 }
      );
    }

    const result = await cancelReservation(id);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error canceling reservation:', error);

    if (error instanceof ItemNotFoundError) {
      return NextResponse.json(
        { error: 'Item non trouvé' },
        { status: 404 }
      );
    }

    if (error instanceof ConflictError) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Erreur lors de l'annulation" },
      { status: 500 }
    );
  }
}
