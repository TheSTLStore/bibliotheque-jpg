import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getItemsByUser } from '@/lib/notion';
import { HeritageItem } from '@/types';

const COOKIE_NAME = 'familyName';

/**
 * Escape CSV field value
 */
function escapeCSV(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  // If the value contains comma, newline, or double quote, wrap it in quotes
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

/**
 * Convert items to CSV format
 */
function itemsToCSV(items: HeritageItem[], includeReservedBy = false): string {
  const headers = [
    'Titre',
    'Auteur/Artiste',
    'Type',
    'État',
    'Année',
    'Tags',
    ...(includeReservedBy ? ['Réservé par', 'Options par'] : ['Options par']),
  ];

  const rows = items.map((item) => [
    escapeCSV(item.titre),
    escapeCSV(item.auteur_artiste),
    escapeCSV(item.type),
    escapeCSV(item.etat),
    item.annee ? String(item.annee) : '',
    escapeCSV(item.tags.join(', ')),
    ...(includeReservedBy
      ? [escapeCSV(item.reserve_par), escapeCSV(item.options_par.join(', '))]
      : [escapeCSV(item.options_par.join(', '))]),
  ]);

  // Add BOM for Excel compatibility with UTF-8
  const BOM = '\uFEFF';
  return BOM + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

/**
 * GET /api/export
 * Export user's reservations as CSV
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const familyName = cookieStore.get(COOKIE_NAME)?.value;

    if (!familyName) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';

    // For now, only support CSV (Excel can open CSV directly)
    if (format !== 'csv') {
      return NextResponse.json(
        { error: 'Format non supporté. Utilisez format=csv' },
        { status: 400 }
      );
    }

    // Fetch user's reservations
    const reservations = await getItemsByUser(familyName);

    if (reservations.length === 0) {
      return NextResponse.json(
        { error: 'Aucune réservation à exporter' },
        { status: 404 }
      );
    }

    // Generate CSV
    const csv = itemsToCSV(reservations);

    // Create filename with user name and date
    const date = new Date().toISOString().split('T')[0];
    const safeUserName = familyName.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `reservations_${safeUserName}_${date}.csv`;

    // Return CSV file
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json(
      { error: "Erreur lors de l'export" },
      { status: 500 }
    );
  }
}
