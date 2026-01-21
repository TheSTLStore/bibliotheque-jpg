'use client';

import Image from 'next/image';
import { useState } from 'react';
import { HeritageItem, UserType } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Book, Disc, Disc3, ImageOff } from 'lucide-react';

interface ItemCardProps {
  item: HeritageItem;
  userType: UserType;
  userName: string;
  onReserve?: (itemId: string) => Promise<void>;
  onAddOption?: (itemId: string) => Promise<void>;
  onCancelReservation?: (itemId: string) => Promise<void>;
  onCancelOption?: (itemId: string) => Promise<void>;
  onClick?: (item: HeritageItem) => void;
}

// Map item type to badge variant
const typeBadgeVariant: Record<string, 'livre' | 'cd' | 'vinyle'> = {
  Livre: 'livre',
  CD: 'cd',
  Vinyle: 'vinyle',
};

// Map status to badge variant
const statusBadgeVariant: Record<string, 'disponible' | 'reserve' | 'option' | 'donne'> = {
  Disponible: 'disponible',
  'Réservé': 'reserve',
  Option: 'option',
  'Donné': 'donne',
};

// Type icons
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

export function ItemCard({
  item,
  userType,
  userName,
  onReserve,
  onAddOption,
  onCancelReservation,
  onCancelOption,
  onClick,
}: ItemCardProps) {
  const [loading, setLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isReservedByMe = item.reserve_par === userName;
  const hasMyOption = item.options_par.includes(userName);
  const myOptionPosition = hasMyOption ? item.options_par.indexOf(userName) + 1 : 0;

  const handleAction = async (action: () => Promise<void>) => {
    setLoading(true);
    try {
      await action();
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick(item);
    }
  };

  // Determine action button based on status and user relationship
  const renderActionButton = () => {
    // Associations can only view, not interact
    if (userType === 'association') {
      return null;
    }

    // If I reserved it, show cancel button
    if (isReservedByMe) {
      return (
        <Button
          variant="destructive"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            if (onCancelReservation) handleAction(() => onCancelReservation(item.id));
          }}
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Annulation...' : 'Annuler'}
        </Button>
      );
    }

    // If I have an option, show cancel option button
    if (hasMyOption) {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            if (onCancelOption) handleAction(() => onCancelOption(item.id));
          }}
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Annulation...' : `Annuler option (#${myOptionPosition})`}
        </Button>
      );
    }

    switch (item.status_dispo) {
      case 'Disponible':
        return (
          <Button
            variant="success"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              if (onReserve) handleAction(() => onReserve(item.id));
            }}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Réservation...' : 'Réserver'}
          </Button>
        );

      case 'Réservé':
        return (
          <Button
            variant="warning"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              if (onAddOption) handleAction(() => onAddOption(item.id));
            }}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Ajout...' : 'Prendre option'}
          </Button>
        );

      case 'Donné':
        return (
          <Button
            variant="secondary"
            size="sm"
            disabled
            className="w-full"
          >
            Donné
          </Button>
        );

      default:
        return null;
    }
  };

  // Truncate title if too long
  const truncatedTitle = item.titre.length > 50
    ? `${item.titre.substring(0, 47)}...`
    : item.titre;

  return (
    <div
      className={cn(
        'group relative flex flex-col bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden transition-all hover:shadow-md cursor-pointer',
        loading && 'opacity-75 pointer-events-none'
      )}
      onClick={handleCardClick}
    >
      {/* Image container */}
      <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden">
        {item.image_url && !imageError ? (
          <Image
            src={item.image_url}
            alt={item.titre}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            <ImageOff className="h-12 w-12 mb-2" />
            <span className="text-sm">Pas d&apos;image</span>
          </div>
        )}

        {/* Type badge overlay */}
        <div className="absolute top-2 left-2">
          <Badge variant={typeBadgeVariant[item.type] || 'default'} className="flex items-center gap-1">
            <TypeIcon type={item.type} />
            {item.type}
          </Badge>
        </div>

        {/* Status badge overlay */}
        <div className="absolute top-2 right-2">
          <Badge variant={statusBadgeVariant[item.status_dispo] || 'default'}>
            {item.status_dispo}
            {item.status_dispo === 'Réservé' && item.options_par.length > 0 && (
              <span className="ml-1">+{item.options_par.length}</span>
            )}
          </Badge>
        </div>

        {/* Reserved by badge */}
        {item.status_dispo === 'Réservé' && item.reserve_par && (
          <div className="absolute bottom-2 left-2 right-2">
            <div className="bg-black/70 text-white text-xs px-2 py-1 rounded truncate">
              Par: {item.reserve_par}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-3 flex flex-col">
        <h3 className="font-medium text-gray-900 text-sm leading-tight mb-1" title={item.titre}>
          {truncatedTitle}
        </h3>

        <p className="text-xs text-gray-500 mb-2 truncate" title={item.auteur_artiste}>
          {item.auteur_artiste || 'Auteur inconnu'}
        </p>

        {/* Condition badge */}
        {item.etat && (
          <div className="mb-2">
            <span className="text-xs text-gray-400">
              État: {item.etat}
            </span>
          </div>
        )}

        {/* Year if available */}
        {item.annee && (
          <span className="text-xs text-gray-400 mb-2">
            {item.annee}
          </span>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action button */}
        <div className="mt-2">
          {renderActionButton()}
        </div>
      </div>
    </div>
  );
}
