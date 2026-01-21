'use client';

import Image from 'next/image';
import { useState } from 'react';
import { HeritageItem, UserType } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Book,
  Disc,
  Disc3,
  ImageOff,
  Calendar,
  Tag,
  User,
  Users,
  Barcode,
  Star,
} from 'lucide-react';

interface ItemModalProps {
  item: HeritageItem;
  userType: UserType;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
  onReserve?: (itemId: string) => Promise<void>;
  onAddOption?: (itemId: string) => Promise<void>;
  onCancelReservation?: (itemId: string) => Promise<void>;
  onCancelOption?: (itemId: string) => Promise<void>;
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
const TypeIcon = ({ type, size = 'md' }: { type: string; size?: 'sm' | 'md' }) => {
  const className = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  switch (type) {
    case 'CD':
      return <Disc className={className} />;
    case 'Vinyle':
      return <Disc3 className={className} />;
    default:
      return <Book className={className} />;
  }
};

export function ItemModal({
  item,
  userType,
  userName,
  isOpen,
  onClose,
  onReserve,
  onAddOption,
  onCancelReservation,
  onCancelOption,
}: ItemModalProps) {
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

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Render action buttons based on status and user relationship
  const renderActionButtons = () => {
    if (userType === 'association') {
      return null;
    }

    // If I reserved it
    if (isReservedByMe) {
      return (
        <Button
          variant="destructive"
          onClick={() => {
            if (onCancelReservation) handleAction(() => onCancelReservation(item.id));
          }}
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Annulation...' : 'Annuler ma réservation'}
        </Button>
      );
    }

    // If I have an option
    if (hasMyOption) {
      return (
        <Button
          variant="outline"
          onClick={() => {
            if (onCancelOption) handleAction(() => onCancelOption(item.id));
          }}
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Annulation...' : `Annuler mon option (position #${myOptionPosition})`}
        </Button>
      );
    }

    switch (item.status_dispo) {
      case 'Disponible':
        return (
          <Button
            variant="success"
            onClick={() => {
              if (onReserve) handleAction(() => onReserve(item.id));
            }}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Réservation...' : 'Réserver cet item'}
          </Button>
        );

      case 'Réservé':
        return (
          <Button
            variant="warning"
            onClick={() => {
              if (onAddOption) handleAction(() => onAddOption(item.id));
            }}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Ajout...' : 'Prendre une option'}
          </Button>
        );

      case 'Donné':
        return (
          <Button variant="secondary" disabled className="w-full">
            Cet item a été donné
          </Button>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <TypeIcon type={item.type} />
            {item.titre}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-[200px,1fr]">
          {/* Image */}
          <div className="relative aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden">
            {item.image_url && !imageError ? (
              <Image
                src={item.image_url}
                alt={item.titre}
                fill
                className="object-cover"
                sizes="200px"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                <ImageOff className="h-12 w-12 mb-2" />
                <span className="text-sm">Pas d&apos;image</span>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-4">
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant={typeBadgeVariant[item.type] || 'default'} className="flex items-center gap-1">
                <TypeIcon type={item.type} size="sm" />
                {item.type}
              </Badge>
              <Badge variant={statusBadgeVariant[item.status_dispo] || 'default'}>
                {item.status_dispo}
              </Badge>
              {item.etat && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  {item.etat}
                </Badge>
              )}
            </div>

            {/* Author */}
            {item.auteur_artiste && (
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 mt-0.5 text-gray-400 flex-shrink-0" />
                <div>
                  <span className="text-xs text-gray-500 block">Auteur / Artiste</span>
                  <span className="text-gray-900">{item.auteur_artiste}</span>
                </div>
              </div>
            )}

            {/* Year */}
            {item.annee && (
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 mt-0.5 text-gray-400 flex-shrink-0" />
                <div>
                  <span className="text-xs text-gray-500 block">Année</span>
                  <span className="text-gray-900">{item.annee}</span>
                </div>
              </div>
            )}

            {/* ISBN/EAN */}
            {item.isbn_ean && (
              <div className="flex items-start gap-2">
                <Barcode className="h-4 w-4 mt-0.5 text-gray-400 flex-shrink-0" />
                <div>
                  <span className="text-xs text-gray-500 block">ISBN / EAN</span>
                  <span className="text-gray-900 font-mono text-sm">{item.isbn_ean}</span>
                </div>
              </div>
            )}

            {/* Tags */}
            {item.tags.length > 0 && (
              <div className="flex items-start gap-2">
                <Tag className="h-4 w-4 mt-0.5 text-gray-400 flex-shrink-0" />
                <div>
                  <span className="text-xs text-gray-500 block">Tags</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Reserved by */}
            {item.reserve_par && (
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 mt-0.5 text-orange-500 flex-shrink-0" />
                <div>
                  <span className="text-xs text-gray-500 block">Réservé par</span>
                  <span className="text-orange-600 font-medium">
                    {item.reserve_par}
                    {isReservedByMe && ' (vous)'}
                  </span>
                </div>
              </div>
            )}

            {/* Options queue */}
            {item.options_par.length > 0 && (
              <div className="flex items-start gap-2">
                <Users className="h-4 w-4 mt-0.5 text-blue-500 flex-shrink-0" />
                <div>
                  <span className="text-xs text-gray-500 block">
                    File d&apos;attente ({item.options_par.length} personne{item.options_par.length > 1 ? 's' : ''})
                  </span>
                  <ol className="list-decimal list-inside text-gray-700 text-sm">
                    {item.options_par.map((name, index) => (
                      <li key={index} className={name === userName ? 'text-blue-600 font-medium' : ''}>
                        {name}
                        {name === userName && ' (vous)'}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}

            {/* Date added */}
            <div className="pt-2 border-t border-gray-100">
              <span className="text-xs text-gray-400">
                Ajouté le {formatDate(item.date_ajout)}
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          {renderActionButtons()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
