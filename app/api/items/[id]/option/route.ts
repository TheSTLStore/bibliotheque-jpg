import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { addOption, removeOption } from '@/lib/notion';
import { ConflictError, ItemNotFoundError } from '@/types';

const COOKIE_NAME = 'familyName';

/**
 * POST /api/items/[id]/option
 * Add an option for the current user
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

    const result = await addOption(id, familyName);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error adding option:', error);

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
      { error: "Erreur lors de l'ajout de l'option" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/items/[id]/option
 * Remove an option for the current user
 */
export async function DELETE(
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

    const result = await removeOption(id, familyName);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error removing option:', error);

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
      { error: "Erreur lors de la suppression de l'option" },
      { status: 500 }
    );
  }
}
