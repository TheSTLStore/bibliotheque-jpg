'use client';

import Image from 'next/image';
import { useState } from 'react';
import { HeritageItem } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Book, Disc, Disc3, ImageOff, X, Clock } from 'lucide-react';

interface OptionItem extends HeritageItem {
  position: number;
}

interface OptionsListProps {
  options: OptionItem[];
  onRemove: (itemId: string) => Promise<void>;
}

const TypeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'CD':
      return <Disc className="h-4 w-4" />;
    case 'Vinyle':
      return <Disc3 className="h-4 w-4" />;
    default:
      return <Book className="h-4 w-4" />;
  }
};

// Map item type to badge variant
const typeBadgeVariant: Record<string, 'livre' | 'cd' | 'vinyle'> = {
  Livre: 'livre',
  CD: 'cd',
  Vinyle: 'vinyle',
};

// Get position suffix in French
function getPositionLabel(position: number): string {
  if (position === 1) return '1er';
  return `${position}ème`;
}

export function OptionsList({ options, onRemove }: OptionsListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const handleRemove = async (itemId: string) => {
    setLoadingId(itemId);
    try {
      await onRemove(itemId);
    } finally {
      setLoadingId(null);
    }
  };

  if (options.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="h-12 w-12 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">Vous n&apos;avez aucune option en attente.</p>
        <p className="text-sm text-gray-400 mt-2">
          Vous pouvez prendre une option sur un objet déjà réservé.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 mb-4">
        {options.length} option{options.length > 1 ? 's' : ''} en attente
      </p>

      {options.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
        >
          {/* Image */}
          <div className="relative h-20 w-16 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
            {item.image_url && !imageErrors[item.id] ? (
              <Image
                src={item.image_url}
                alt={item.titre}
                fill
                className="object-cover"
                sizes="64px"
                onError={() => setImageErrors((prev) => ({ ...prev, [item.id]: true }))}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <ImageOff className="h-6 w-6 text-gray-300" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={typeBadgeVariant[item.type] || 'default'} className="flex items-center gap-1">
                <TypeIcon type={item.type} />
                {item.type}
              </Badge>
              <Badge variant="option" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {getPositionLabel(item.position)} en file
              </Badge>
            </div>
            <h3 className="font-medium text-gray-900 truncate" title={item.titre}>
              {item.titre}
            </h3>
            <p className="text-sm text-gray-500 truncate">
              {item.auteur_artiste || 'Auteur inconnu'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Réservé par: {item.reserve_par}
            </p>
          </div>

          {/* Action */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRemove(item.id)}
            disabled={loadingId === item.id}
            className="flex-shrink-0"
          >
            {loadingId === item.id ? (
              'Retrait...'
            ) : (
              <>
                <X className="h-4 w-4 mr-2" />
                Retirer
              </>
            )}
          </Button>
        </div>
      ))}
    </div>
  );
}
