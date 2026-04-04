"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Trash2, BookOpen, Disc, Disc3 } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface DashboardReservation {
  id: string;
  prenom: string;
  created_at: string;
  items: {
    id: string;
    titre: string;
    auteur_artiste: string;
    type: string;
    categorie: string | null;
    image_url: string | null;
    status: string;
  };
}

const typeIcons: Record<string, typeof BookOpen> = {
  Livre: BookOpen,
  CD: Disc,
  Vinyle: Disc3,
};

export default function DashboardPage() {
  const { prenom } = useAuth();
  const [reservations, setReservations] = useState<DashboardReservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReservations() {
      if (!prenom) {
        setLoading(false);
        return;
      }
      const res = await fetch(`/api/dashboard?prenom=${encodeURIComponent(prenom)}`);
      if (res.ok) {
        setReservations(await res.json());
      }
      setLoading(false);
    }
    fetchReservations();
  }, [prenom]);

  async function handleCancel(itemId: string) {
    const res = await fetch(`/api/items/${itemId}/reserve`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prenom }),
    });
    if (res.ok) {
      setReservations((prev) => prev.filter((r) => r.items.id !== itemId));
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-8 text-center text-text-muted">Chargement...</div>
    );
  }

  return (
    <div className="px-4 py-4 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-accent mb-4">
        Mes réservations ({reservations.length})
      </h1>

      {reservations.length === 0 ? (
        <p className="text-text-muted text-center mt-12">
          Aucune réservation pour le moment
        </p>
      ) : (
        <div className="space-y-3">
          {reservations.map((r) => {
            const Icon = typeIcons[r.items.type] || BookOpen;
            return (
              <div key={r.id} className="card flex items-center gap-4">
                <div className="w-12 h-16 bg-background rounded-lg overflow-hidden flex-shrink-0 relative">
                  {r.items.image_url ? (
                    <Image
                      src={r.items.image_url}
                      alt={r.items.titre}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Icon size={20} className="text-text-muted" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-text-primary truncate">
                    {r.items.titre}
                  </h3>
                  <p className="text-xs text-text-secondary truncate">
                    {r.items.auteur_artiste}
                  </p>
                  <div className="flex gap-2 mt-1 items-center">
                    <Badge
                      variant="outline"
                      className="text-[10px] border-border text-accent-muted"
                    >
                      {r.items.type}
                    </Badge>
                    <span className="text-[10px] text-text-muted">
                      {formatDate(r.created_at)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleCancel(r.items.id)}
                  className="text-text-muted hover:text-error transition-colors p-2"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
