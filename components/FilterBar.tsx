'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ItemType, AvailabilityStatus, SortField, SortDirection } from '@/types';
import { Search, X, SlidersHorizontal, ArrowUpDown } from 'lucide-react';

interface FilterBarProps {
  onFiltersChange: (filters: FilterState) => void;
  showStatusFilter?: boolean; // Only for family users
  availableTags?: string[];
}

export interface FilterState {
  type: ItemType | 'all';
  status: AvailabilityStatus | 'all';
  search: string;
  tags: string[];
  sortField: SortField;
  sortDirection: SortDirection;
}

const defaultFilters: FilterState = {
  type: 'all',
  status: 'all',
  search: '',
  tags: [],
  sortField: 'date_ajout',
  sortDirection: 'descending',
};

export function FilterBar({
  onFiltersChange,
  showStatusFilter = true,
  availableTags = [],
}: FilterBarProps) {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [searchInput, setSearchInput] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilters = useCallback(
    (updates: Partial<FilterState>) => {
      const newFilters = { ...filters, ...updates };
      setFilters(newFilters);
      onFiltersChange(newFilters);
    },
    [filters, onFiltersChange]
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchInput.trim() });
  };

  const handleSearchClear = () => {
    setSearchInput('');
    updateFilters({ search: '' });
  };

  const handleReset = () => {
    setFilters(defaultFilters);
    setSearchInput('');
    onFiltersChange(defaultFilters);
  };

  const hasActiveFilters =
    filters.type !== 'all' ||
    filters.status !== 'all' ||
    filters.search !== '' ||
    filters.tags.length > 0;

  return (
    <div className="bg-white border-b border-gray-200 sticky top-16 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Main filter row */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par titre ou auteur..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={handleSearchClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>

          {/* Type filter */}
          <Select
            value={filters.type}
            onValueChange={(value) => updateFilters({ type: value as ItemType | 'all' })}
          >
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous types</SelectItem>
              <SelectItem value="Livre">Livres</SelectItem>
              <SelectItem value="CD">CDs</SelectItem>
              <SelectItem value="Vinyle">Vinyles</SelectItem>
            </SelectContent>
          </Select>

          {/* Status filter (family only) */}
          {showStatusFilter && (
            <Select
              value={filters.status}
              onValueChange={(value) =>
                updateFilters({ status: value as AvailabilityStatus | 'all' })
              }
            >
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="Disponible">Disponible</SelectItem>
                <SelectItem value="Réservé">Réservé</SelectItem>
                <SelectItem value="Donné">Donné</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Sort */}
          <Select
            value={`${filters.sortField}-${filters.sortDirection}`}
            onValueChange={(value) => {
              const [field, direction] = value.split('-') as [SortField, SortDirection];
              updateFilters({ sortField: field, sortDirection: direction });
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Trier par" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_ajout-descending">Plus récents</SelectItem>
              <SelectItem value="date_ajout-ascending">Plus anciens</SelectItem>
              <SelectItem value="titre-ascending">Titre A-Z</SelectItem>
              <SelectItem value="titre-descending">Titre Z-A</SelectItem>
              <SelectItem value="auteur_artiste-ascending">Auteur A-Z</SelectItem>
              <SelectItem value="auteur_artiste-descending">Auteur Z-A</SelectItem>
              <SelectItem value="annee-descending">Année (récent)</SelectItem>
              <SelectItem value="annee-ascending">Année (ancien)</SelectItem>
            </SelectContent>
          </Select>

          {/* Advanced toggle */}
          {availableTags.length > 0 && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={showAdvanced ? 'bg-gray-100' : ''}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Advanced filters (tags) */}
        {showAdvanced && availableTags.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-500 mr-2">Tags:</span>
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    const newTags = filters.tags.includes(tag)
                      ? filters.tags.filter((t) => t !== tag)
                      : [...filters.tags, tag];
                    updateFilters({ tags: newTags });
                  }}
                  className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                    filters.tags.includes(tag)
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-orange-500'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active filters indicator */}
        {hasActiveFilters && (
          <div className="mt-3 flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {filters.type !== 'all' && (
                <span className="inline-flex items-center px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded">
                  Type: {filters.type}
                  <button
                    onClick={() => updateFilters({ type: 'all' })}
                    className="ml-1 hover:text-orange-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.status !== 'all' && (
                <span className="inline-flex items-center px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded">
                  Statut: {filters.status}
                  <button
                    onClick={() => updateFilters({ status: 'all' })}
                    className="ml-1 hover:text-orange-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.search && (
                <span className="inline-flex items-center px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded">
                  Recherche: &quot;{filters.search}&quot;
                  <button
                    onClick={handleSearchClear}
                    className="ml-1 hover:text-orange-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded"
                >
                  {tag}
                  <button
                    onClick={() =>
                      updateFilters({ tags: filters.tags.filter((t) => t !== tag) })
                    }
                    className="ml-1 hover:text-orange-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              Réinitialiser
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
