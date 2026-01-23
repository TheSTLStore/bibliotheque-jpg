'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, notFound } from 'next/navigation';
import Image from 'next/image';
import { HeritageItem } from '@/types';
import { FilterBar, FilterState } from '@/components/FilterBar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  BookOpen,
  Package,
  Book,
  Disc,
  Disc3,
  ImageOff,
  Loader2,
  AlertCircle,
} from 'lucide-react';

// Map item type to badge variant
const typeBadgeVariant: Record<string, 'livre' | 'cd' | 'vinyle'> = {
  Livre: 'livre',
  CD: 'cd',
  Vinyle: 'vinyle',
};

const TypeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'CD':
      return <Disc className="h-3 w-3" />;
    case 'Vinyle':
      return <Disc3 className="h-3 w-3" />;
    default:
      return <Book className="h-3 w-3" />;
  }
};

export default function AssociationPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { toast } = useToast();

  const [associationName, setAssociationName] = useState<string | null>(null);
  const [items, setItems] = useState<HeritageItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<HeritageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reservingId, setReservingId] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Fetch association info and items
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/public/${slug}/items`);

        if (response.status === 404) {
          setError('Association non trouvée');
          return;
        }

        if (!response.ok) {
          throw new Error('Erreur lors du chargement');
        }

        const data = await response.json();
        setItems(data.items);
        setFilteredItems(data.items);
        setAssociationName(data.associationName || slug);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  // Apply client-side filtering
  const applyFilters = useCallback(
    (filters: FilterState) => {
      let result = [...items];

      // Type filter
      if (filters.type !== 'all') {
        result = result.filter((item) => item.type === filters.type);
      }

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        result = result.filter(
          (item) =>
            item.titre.toLowerCase().includes(searchLower) ||
            item.auteur_artiste.toLowerCase().includes(searchLower)
        );
      }

      // Tags filter
      if (filters.tags.length > 0) {
        result = result.filter((item) =>
          filters.tags.some((tag) => item.tags.includes(tag))
        );
      }

      // Sorting
      result.sort((a, b) => {
        let comparison = 0;

        switch (filters.sortField) {
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
            comparison =
              new Date(a.date_ajout).getTime() - new Date(b.date_ajout).getTime();
            break;
        }

        return filters.sortDirection === 'ascending' ? comparison : -comparison;
      });

      setFilteredItems(result);
    },
    [items]
  );

  // Handle reservation for association
  const handleReserve = async (itemId: string) => {
    setReservingId(itemId);

    try {
      const response = await fetch(`/api/public/${slug}/items/${itemId}/reserve`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la réservation');
      }

      const { item: updatedItem } = await response.json();

      // Remove the reserved item from the list (associations only see available items)
      setItems((prev) => prev.filter((item) => item.id !== itemId));
      setFilteredItems((prev) => prev.filter((item) => item.id !== itemId));

      toast({
        title: 'Réservation confirmée',
        description: `"${updatedItem.titre}" a été réservé pour ${associationName}.`,
      });
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Erreur lors de la réservation',
        variant: 'destructive',
      });
    } finally {
      setReservingId(null);
    }
  };

  // Extract unique tags from items
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    items.forEach((item) => item.tags.forEach((tag) => tags.add(tag)));
    return Array.from(tags).sort();
  }, [items]);

  // Error state
  if (error === 'Association non trouvée') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 mx-auto text-red-400 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Association non trouvée</h1>
          <p className="text-gray-500">Cette URL n&apos;est pas valide.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <BookOpen className="h-8 w-8 text-orange-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Bibliothèque JPG</h1>
                {associationName && (
                  <p className="text-sm text-gray-500">{associationName}</p>
                )}
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Catalogue des items disponibles
            </div>
          </div>
        </div>
      </header>

      {/* Filter bar - no status filter for associations (all items are available) */}
      <FilterBar
        onFiltersChange={applyFilters}
        showStatusFilter={false}
        availableTags={allTags}
      />

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <>
            <div className="mb-4">
              <Skeleton className="h-5 w-24" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-[3/4] w-full rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          </>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="h-16 w-16 text-red-400 mb-4" />
            <p className="text-red-600 font-medium">{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Réessayer
            </Button>
          </div>
        ) : (
          <>
            {/* Results count */}
            <div className="mb-4 text-sm text-gray-500">
              {filteredItems.length} {filteredItems.length === 1 ? 'item disponible' : 'items disponibles'}
            </div>

            {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <Package className="h-16 w-16 mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">Aucun item disponible</h3>
                <p className="text-sm">
                  {items.length === 0
                    ? 'Tous les items ont été réservés.'
                    : 'Essayez de modifier vos filtres ou votre recherche.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="group relative flex flex-col bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden transition-all hover:shadow-md"
                  >
                    {/* Image */}
                    <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden">
                      {item.image_url && !imageErrors[item.id] ? (
                        <Image
                          src={item.image_url}
                          alt={item.titre}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                          onError={() =>
                            setImageErrors((prev) => ({ ...prev, [item.id]: true }))
                          }
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                          <ImageOff className="h-12 w-12 mb-2" />
                          <span className="text-sm">Pas d&apos;image</span>
                        </div>
                      )}

                      {/* Type badge */}
                      <div className="absolute top-2 left-2">
                        <Badge
                          variant={typeBadgeVariant[item.type] || 'default'}
                          className="flex items-center gap-1"
                        >
                          <TypeIcon type={item.type} />
                          {item.type}
                        </Badge>
                      </div>

                      {/* Status badge - always available for associations */}
                      <div className="absolute top-2 right-2">
                        <Badge variant="disponible">Disponible</Badge>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-3 flex flex-col">
                      <h3
                        className="font-medium text-gray-900 text-sm leading-tight mb-1 line-clamp-2"
                        title={item.titre}
                      >
                        {item.titre}
                      </h3>

                      <p className="text-xs text-gray-500 mb-2 truncate" title={item.auteur_artiste}>
                        {item.auteur_artiste || 'Auteur inconnu'}
                      </p>

                      {item.etat && (
                        <span className="text-xs text-gray-400 mb-2">
                          État: {item.etat}
                        </span>
                      )}

                      {item.annee && (
                        <span className="text-xs text-gray-400 mb-2">{item.annee}</span>
                      )}

                      <div className="flex-1" />

                      {/* Reserve button */}
                      <div className="mt-2">
                        <Button
                          variant="success"
                          size="sm"
                          className="w-full"
                          onClick={() => handleReserve(item.id)}
                          disabled={reservingId === item.id}
                        >
                          {reservingId === item.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Réservation...
                            </>
                          ) : (
                            'Réserver'
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            Bibliothèque JPG - Succession culturelle familiale
          </p>
        </div>
      </footer>
    </div>
  );
}
