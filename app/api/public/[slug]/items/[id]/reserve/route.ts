import { NextRequest, NextResponse } from 'next/server';
import { validateAssociationSlug, getAssociationName } from '@/lib/auth';
import { reserveItem, getItemById } from '@/lib/notion';
import { ConflictError, InvalidSlugError, ItemNotFoundError } from '@/types';

interface RouteParams {
  params: {
    slug: string;
    id: string;
  };
}

/**
 * POST /api/public/[slug]/items/[id]/reserve
 * Reserve an item for an association
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, id } = params;

    // Validate slug
    try {
      validateAssociationSlug(slug);
    } catch (error) {
      if (error instanceof InvalidSlugError) {
        return NextResponse.json(
          { error: 'Association invalide' },
          { status: 404 }
        );
      }
      throw error;
    }

    // Get association display name
    const associationName = getAssociationName(slug);
    if (!associationName) {
      return NextResponse.json(
        { error: 'Association invalide' },
        { status: 404 }
      );
    }

    // Verify item is available (associations can only reserve available items)
    const currentItem = await getItemById(id);
    if (currentItem.status_dispo !== 'Disponible') {
      return NextResponse.json(
        { error: 'Cet item n\'est plus disponible' },
        { status: 409 }
      );
    }

    // Reserve the item using the association name
    const result = await reserveItem(id, associationName);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error reserving item for association:', error);

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
