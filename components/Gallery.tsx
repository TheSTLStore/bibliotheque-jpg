'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { HeritageItem, UserType } from '@/types';
import { ItemCard } from '@/components/ItemCard';
import { FilterBar, FilterState } from '@/components/FilterBar';
import { ItemModal } from '@/components/ItemModal';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast, toastSuccess, toastError } from '@/hooks/use-toast';
import { Package } from 'lucide-react';

interface GalleryProps {
  initialItems: HeritageItem[];
  userType: UserType;
  userName: string;
  availableTags?: string[];
}

export function Gallery({
  initialItems,
  userType,
  userName,
  availableTags = [],
}: GalleryProps) {
  const [items, setItems] = useState<HeritageItem[]>(initialItems);
  const [filteredItems, setFilteredItems] = useState<HeritageItem[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<HeritageItem | null>(null);
  const { toast } = useToast();

  // Apply client-side filtering
  const applyFilters = useCallback(
    (filters: FilterState) => {
      let result = [...items];

      // Type filter
      if (filters.type !== 'all') {
        result = result.filter((item) => item.type === filters.type);
      }

      // Status filter
      if (filters.status !== 'all') {
        result = result.filter((item) => item.status_dispo === filters.status);
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
            comparison = new Date(a.date_ajout).getTime() - new Date(b.date_ajout).getTime();
            break;
        }

        return filters.sortDirection === 'ascending' ? comparison : -comparison;
      });

      setFilteredItems(result);
    },
    [items]
  );

  // Optimistic update helper
  const updateItemOptimistically = useCallback(
    (itemId: string, updates: Partial<HeritageItem>) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, ...updates } : item
        )
      );
    },
    []
  );

  // Revert optimistic update
  const revertItem = useCallback((originalItem: HeritageItem) => {
    setItems((prev) =>
      prev.map((item) => (item.id === originalItem.id ? originalItem : item))
    );
  }, []);

  // Reserve item
  const handleReserve = useCallback(
    async (itemId: string) => {
      const originalItem = items.find((item) => item.id === itemId);
      if (!originalItem) return;

      // Optimistic update
      updateItemOptimistically(itemId, {
        status_dispo: 'Réservé',
        reserve_par: userName,
      });

      try {
        const response = await fetch(`/api/items/${itemId}/reserve`, {
          method: 'POST',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Erreur lors de la réservation');
        }

        const { item: updatedItem } = await response.json();
        updateItemOptimistically(itemId, updatedItem);
        toastSuccess('Réservation confirmée');
      } catch (error) {
        revertItem(originalItem);
        toastError(
          error instanceof Error
            ? error.message
            : 'Erreur lors de la réservation'
        );
      }
    },
    [items, userName, updateItemOptimistically, revertItem]
  );

  // Add option
  const handleAddOption = useCallback(
    async (itemId: string) => {
      const originalItem = items.find((item) => item.id === itemId);
      if (!originalItem) return;

      // Optimistic update
      updateItemOptimistically(itemId, {
        options_par: [...originalItem.options_par, userName],
      });

      try {
        const response = await fetch(`/api/items/${itemId}/option`, {
          method: 'POST',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Erreur lors de l'ajout de l'option");
        }

        const { item: updatedItem, position } = await response.json();
        updateItemOptimistically(itemId, updatedItem);
        toastSuccess(`Option prise (position #${position})`);
      } catch (error) {
        revertItem(originalItem);
        toastError(
          error instanceof Error
            ? error.message
            : "Erreur lors de l'ajout de l'option"
        );
      }
    },
    [items, userName, updateItemOptimistically, revertItem]
  );

  // Cancel reservation
  const handleCancelReservation = useCallback(
    async (itemId: string) => {
      const originalItem = items.find((item) => item.id === itemId);
      if (!originalItem) return;

      // Optimistic update
      const { promoted, remaining } = promoteFirstInQueue(originalItem.options_par);
      updateItemOptimistically(itemId, {
        status_dispo: promoted ? 'Réservé' : 'Disponible',
        reserve_par: promoted || null,
        options_par: remaining,
      });

      try {
        const response = await fetch(`/api/items/${itemId}/cancel`, {
          method: 'POST',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Erreur lors de l'annulation");
        }

        const { item: updatedItem, promotedUser } = await response.json();
        updateItemOptimistically(itemId, updatedItem);

        if (promotedUser) {
          toastSuccess(`Réservation annulée. ${promotedUser} a été promu`);
        } else {
          toastSuccess('Réservation annulée');
        }
      } catch (error) {
        revertItem(originalItem);
        toastError(
          error instanceof Error
            ? error.message
            : "Erreur lors de l'annulation"
        );
      }
    },
    [items, updateItemOptimistically, revertItem]
  );

  // Cancel option
  const handleCancelOption = useCallback(
    async (itemId: string) => {
      const originalItem = items.find((item) => item.id === itemId);
      if (!originalItem) return;

      // Optimistic update
      updateItemOptimistically(itemId, {
        options_par: originalItem.options_par.filter((name) => name !== userName),
      });

      try {
        const response = await fetch(`/api/items/${itemId}/option`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Erreur lors de l'annulation de l'option");
        }

        const { item: updatedItem } = await response.json();
        updateItemOptimistically(itemId, updatedItem);
        toastSuccess('Option annulée');
      } catch (error) {
        revertItem(originalItem);
        toastError(
          error instanceof Error
            ? error.message
            : "Erreur lors de l'annulation de l'option"
        );
      }
    },
    [items, userName, updateItemOptimistically, revertItem]
  );

  // Handle item click for modal
  const handleItemClick = useCallback((item: HeritageItem) => {
    setSelectedItem(item);
  }, []);

  // Close modal
  const handleCloseModal = useCallback(() => {
    setSelectedItem(null);
  }, []);

  // Update selected item when items change
  useEffect(() => {
    if (selectedItem) {
      const updated = items.find((item) => item.id === selectedItem.id);
      if (updated) {
        setSelectedItem(updated);
      }
    }
  }, [items, selectedItem]);

  // Re-apply filters when items change
  useEffect(() => {
    setFilteredItems(items);
  }, [items]);

  // Extract unique tags from items
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    items.forEach((item) => item.tags.forEach((tag) => tags.add(tag)));
    return Array.from(tags).sort();
  }, [items]);

  return (
    <div className="min-h-screen bg-gray-50">
      <FilterBar
        onFiltersChange={applyFilters}
        showStatusFilter={userType === 'family'}
        availableTags={allTags.length > 0 ? allTags : availableTags}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Results count */}
        <div className="mb-4 text-sm text-gray-500">
          {filteredItems.length} {filteredItems.length === 1 ? 'résultat' : 'résultats'}
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[3/4] w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <Package className="h-16 w-16 mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">Aucun item trouvé</h3>
            <p className="text-sm">
              Essayez de modifier vos filtres ou votre recherche
            </p>
          </div>
        ) : (
          /* Items grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                userType={userType}
                userName={userName}
                onReserve={handleReserve}
                onAddOption={handleAddOption}
                onCancelReservation={handleCancelReservation}
                onCancelOption={handleCancelOption}
                onClick={handleItemClick}
              />
            ))}
          </div>
        )}
      </main>

      {/* Item modal */}
      {selectedItem && (
        <ItemModal
          item={selectedItem}
          userType={userType}
          userName={userName}
          isOpen={!!selectedItem}
          onClose={handleCloseModal}
          onReserve={handleReserve}
          onAddOption={handleAddOption}
          onCancelReservation={handleCancelReservation}
          onCancelOption={handleCancelOption}
        />
      )}
    </div>
  );
}

// Helper function for queue operations
function promoteFirstInQueue(queue: string[]): {
  promoted: string | null;
  remaining: string[];
} {
  if (queue.length === 0) {
    return { promoted: null, remaining: [] };
  }
  const [promoted, ...remaining] = queue;
  return { promoted, remaining };
}
