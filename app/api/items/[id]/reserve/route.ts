import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { reserveItem } from '@/lib/notion';
import { ConflictError, ItemNotFoundError } from '@/types';

const COOKIE_NAME = 'familyName';

/**
 * POST /api/items/[id]/reserve
 * Reserve an item for the current user
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

    const result = await reserveItem(id, familyName);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error reserving item:', error);

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
      { error: 'Erreur lors de la réservation' },
      { status: 500 }
    );
  }
}
