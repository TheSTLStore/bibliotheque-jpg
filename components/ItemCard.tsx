"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { ItemWithReservations } from "@/types";
import { BookOpen, Disc, Disc3 } from "lucide-react";

const typeIcons = {
  Livre: BookOpen,
  CD: Disc,
  Vinyle: Disc3,
};

interface ItemCardProps {
  item: ItemWithReservations;
  onClick: () => void;
}

export function ItemCard({ item, onClick }: ItemCardProps) {
  const Icon = typeIcons[item.type];
  const reservationCount = item.reservations?.length || 0;

  return (
    <button
      onClick={onClick}
      className="card text-left w-full hover:scale-[1.02] transition-transform cursor-pointer"
    >
      <div className="aspect-[3/4] bg-background rounded-lg mb-3 overflow-hidden relative">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.titre}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon size={48} className="text-text-muted" />
          </div>
        )}
        {reservationCount > 0 && (
          <div className="absolute top-2 right-2 bg-accent text-background text-xs font-bold px-2 py-0.5 rounded-full">
            {reservationCount}
          </div>
        )}
      </div>
      <h3 className="text-sm font-semibold text-text-primary truncate">
        {item.titre}
      </h3>
      <p className="text-xs text-text-secondary truncate">
        {item.auteur_artiste}
      </p>
      <div className="flex gap-1.5 mt-2">
        <Badge variant="outline" className="text-[10px] border-border text-accent-muted">
          {item.type}
        </Badge>
        {item.categorie && (
          <Badge variant="outline" className="text-[10px] border-border text-accent-muted">
            {item.categorie}
          </Badge>
        )}
      </div>
    </button>
  );
}
