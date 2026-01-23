'use client';

import Image from 'next/image';
import { useState } from 'react';
import { HeritageItem } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Book, Disc, Disc3, ImageOff, Trash2, Users } from 'lucide-react';

interface ReservationListProps {
  reservations: HeritageItem[];
  onCancel: (itemId: string) => Promise<void>;
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

export function ReservationList({ reservations, onCancel }: ReservationListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const handleCancel = async (itemId: string) => {
    setLoadingId(itemId);
    try {
      await onCancel(itemId);
    } finally {
      setLoadingId(null);
    }
  };

  if (reservations.length === 0) {
    return (
      <div className="text-center py-12">
        <Book className="h-12 w-12 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">Vous n&apos;avez aucune réservation pour le moment.</p>
        <p className="text-sm text-gray-400 mt-2">
          Parcourez la galerie pour réserver des objets.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 mb-4">
        {reservations.length} objet{reservations.length > 1 ? 's' : ''} réservé{reservations.length > 1 ? 's' : ''}
      </p>

      {reservations.map((item) => (
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
              {item.options_par.length > 0 && (
                <Badge variant="warning" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {item.options_par.length} option{item.options_par.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <h3 className="font-medium text-gray-900 truncate" title={item.titre}>
              {item.titre}
            </h3>
            <p className="text-sm text-gray-500 truncate">
              {item.auteur_artiste || 'Auteur inconnu'}
            </p>
            {item.options_par.length > 0 && (
              <p className="text-xs text-orange-600 mt-1">
                En attente: {item.options_par.join(', ')}
              </p>
            )}
          </div>

          {/* Action */}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleCancel(item.id)}
            disabled={loadingId === item.id}
            className="flex-shrink-0"
          >
            {loadingId === item.id ? (
              'Annulation...'
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Annuler
              </>
            )}
          </Button>
        </div>
      ))}
    </div>
  );
}
