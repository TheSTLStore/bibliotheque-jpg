import { NextRequest, NextResponse } from 'next/server';
import { validateAssociationSlug, getAssociationName } from '@/lib/auth';
import { getAssociationItems } from '@/lib/notion';
import { InvalidSlugError } from '@/types';

interface RouteParams {
  params: {
    slug: string;
  };
}

/**
 * GET /api/public/[slug]/items
 * List available items for association
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug } = params;

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

    // Get association name
    const associationName = getAssociationName(slug);

    // Get items for association (only available items)
    const items = await getAssociationItems();

    return NextResponse.json({ items, associationName }, { status: 200 });
  } catch (error) {
    console.error('Association items error:', error);

    return NextResponse.json(
      { error: 'Une erreur est survenue lors de la récupération des items' },
      { status: 500 }
    );
  }
}
