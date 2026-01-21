import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  getAllItems,
  getFamilyItems,
  getAssociationItems,
} from '@/lib/notion';
import { ItemFilters, SortOptions, ItemType, AvailabilityStatus, SortField, SortDirection } from '@/types';

// Cookie name must match the one in lib/auth.ts
const COOKIE_NAME = 'familyName';

/**
 * GET /api/items
 * Fetch items from Notion based on user type and filters
 *
 * Query params:
 * - type: ItemType (Livre, CD, Vinyle)
 * - status: AvailabilityStatus (Disponible, Réservé, Option, Donné)
 * - search: string (search in title)
 * - tags: string (comma-separated tags)
 * - sortField: SortField (date_ajout, titre, auteur_artiste, annee)
 * - sortDirection: SortDirection (ascending, descending)
 * - userType: 'family' | 'association' (optional, for public routes)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Determine user type
    const cookieStore = cookies();
    const familyName = cookieStore.get(COOKIE_NAME)?.value;
    const userType = searchParams.get('userType') || (familyName ? 'family' : null);

    if (!userType) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Parse filters from query params
    const filters: ItemFilters = {};

    const typeParam = searchParams.get('type');
    if (typeParam && ['Livre', 'CD', 'Vinyle'].includes(typeParam)) {
      filters.type = typeParam as ItemType;
    }

    const statusParam = searchParams.get('status');
    if (statusParam && ['Disponible', 'Réservé', 'Option', 'Donné'].includes(statusParam)) {
      filters.status = statusParam as AvailabilityStatus;
    }

    const searchParam = searchParams.get('search');
    if (searchParam && searchParam.trim()) {
      filters.search = searchParam.trim();
    }

    const tagsParam = searchParams.get('tags');
    if (tagsParam) {
      filters.tags = tagsParam.split(',').map(t => t.trim()).filter(Boolean);
    }

    // Parse sort options
    const sortField = searchParams.get('sortField') as SortField | null;
    const sortDirection = searchParams.get('sortDirection') as SortDirection | null;

    const sort: SortOptions | undefined = sortField
      ? {
          field: sortField,
          direction: sortDirection || 'descending',
        }
      : undefined;

    // Fetch items based on user type
    let items;

    if (userType === 'association') {
      // Associations only see available items (no filters applied, strict query)
      items = await getAssociationItems();

      // Apply client-side filtering for associations
      if (filters.type) {
        items = items.filter(item => item.type === filters.type);
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        items = items.filter(item =>
          item.titre.toLowerCase().includes(searchLower) ||
          item.auteur_artiste.toLowerCase().includes(searchLower)
        );
      }
      if (filters.tags && filters.tags.length > 0) {
        items = items.filter(item =>
          filters.tags!.some(tag => item.tags.includes(tag))
        );
      }
    } else {
      // Family members see all "A donner" items with filters
      if (Object.keys(filters).length > 0 || sort) {
        items = await getAllItems(filters, sort);
      } else {
        items = await getFamilyItems();
      }
    }

    // Apply client-side sorting if not done server-side
    if (sort && userType === 'association') {
      items.sort((a, b) => {
        let comparison = 0;

        switch (sort.field) {
          case 'titre':
            comparison = a.titre.localeCompare(b.titre, 'fr');
            break;
          case 'auteur_artiste':
            comparison = a.auteur_artiste.localeCompare(b.auteur_artiste, 'fr');
            break;
          case 'annee':
            comparison = (a.annee || 0) - (b.annee || 0);
            break;
          case 'date_ajout':
          default:
            comparison = new Date(a.date_ajout).getTime() - new Date(b.date_ajout).getTime();
            break;
        }

        return sort.direction === 'ascending' ? comparison : -comparison;
      });
    }

    return NextResponse.json({
      items,
      total: items.length,
      userType,
    });
  } catch (error) {
    console.error('Error fetching items:', error);

    return NextResponse.json(
      { error: 'Erreur lors de la récupération des items' },
      { status: 500 }
    );
  }
}
