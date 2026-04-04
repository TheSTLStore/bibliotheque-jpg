"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ItemWithReservations } from "@/types";
import { formatDate } from "@/lib/utils";

interface ItemModalProps {
  item: ItemWithReservations | null;
  open: boolean;
  onClose: () => void;
  prenom: string;
  onReserve: (itemId: string) => Promise<void>;
  onCancelReserve: (itemId: string) => Promise<void>;
}

export function ItemModal({
  item,
  open,
  onClose,
  prenom,
  onReserve,
  onCancelReserve,
}: ItemModalProps) {
  const [loading, setLoading] = useState(false);

  if (!item) return null;

  const myReservation = item.reservations?.find((r) => r.prenom === prenom);

  async function handleReserve() {
    setLoading(true);
    try {
      await onReserve(item!.id);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    setLoading(true);
    try {
      await onCancelReserve(item!.id);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-background-card border-border text-text-primary max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-accent">{item.titre}</DialogTitle>
        </DialogHeader>

        {item.image_url && (
          <div className="relative aspect-[3/4] w-full max-w-[200px] mx-auto rounded-lg overflow-hidden">
            <Image
              src={item.image_url}
              alt={item.titre}
              fill
              className="object-cover"
            />
          </div>
        )}

        <div className="space-y-2 text-sm">
          <p>
            <span className="text-text-secondary">Auteur/Artiste :</span>{" "}
            {item.auteur_artiste}
          </p>
          <p>
            <span className="text-text-secondary">Type :</span> {item.type}
          </p>
          {item.categorie && (
            <p>
              <span className="text-text-secondary">Cat&eacute;gorie :</span>{" "}
              {item.categorie}
            </p>
          )}
          {item.annee && (
            <p>
              <span className="text-text-secondary">Ann&eacute;e :</span> {item.annee}
            </p>
          )}
          <p>
            <span className="text-text-secondary">&Eacute;tat :</span> {item.etat}
          </p>
          {item.tags.length > 0 && (
            <div className="flex gap-1">
              {item.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="border-border text-accent-muted">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border pt-3 mt-3">
          <h4 className="text-sm font-semibold text-text-secondary mb-2">
            R&eacute;servations ({item.reservations?.length || 0})
          </h4>
          {(item.reservations?.length ?? 0) > 0 ? (
            <ul className="space-y-1">
              {item.reservations!.map((r) => (
                <li key={r.id} className="text-sm flex justify-between">
                  <span className={r.prenom === prenom ? "text-accent font-semibold" : "text-text-primary"}>
                    {r.prenom}
                  </span>
                  <span className="text-text-muted text-xs">
                    {formatDate(r.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-text-muted text-sm">Aucune r&eacute;servation</p>
          )}
        </div>

        <div className="mt-4">
          {myReservation ? (
            <button
              onClick={handleCancel}
              disabled={loading}
              className="btn-secondary w-full disabled:opacity-50"
            >
              {loading ? "..." : "Annuler ma réservation"}
            </button>
          ) : (
            <button
              onClick={handleReserve}
              disabled={loading || item.status === "Donné"}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading ? "..." : "Réserver"}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
