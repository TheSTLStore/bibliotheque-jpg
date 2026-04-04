"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { ItemCard } from "@/components/ItemCard";
import { ItemModal } from "@/components/ItemModal";
import { FilterBar } from "@/components/FilterBar";
import { ItemWithReservations, ItemType } from "@/types";

export default function AssociationPage() {
  const { slug } = useParams<{ slug: string }>();
  const [items, setItems] = useState<ItemWithReservations[]>([]);
  const [associationName, setAssociationName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ItemType | null>(null);
  const [selectedItem, setSelectedItem] = useState<ItemWithReservations | null>(null);

  const fetchItems = useCallback(async () => {
    const params = new URLSearchParams();
    if (typeFilter) params.set("type", typeFilter);
    if (search) params.set("search", search);

    const res = await fetch(`/api/public/${slug}/items?${params}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
      setAssociationName(data.associationName);
    } else {
      setError("Lien invalide ou expiré");
    }
    setLoading(false);
  }, [slug, typeFilter, search]);

  useEffect(() => {
    const timeout = setTimeout(fetchItems, 300);
    return () => clearTimeout(timeout);
  }, [fetchItems]);

  async function handleReserve(itemId: string) {
    const res = await fetch(`/api/public/${slug}/items/${itemId}/reserve`, {
      method: "POST",
    });
    if (res.ok) await fetchItems();
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-error">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="px-4 py-3 bg-background-light border-b border-border">
        <h1 className="text-accent font-bold">Bibliothèque JPG</h1>
        <p className="text-text-secondary text-sm">{associationName}</p>
      </header>

      <main className="px-4 py-4 max-w-7xl mx-auto">
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          typeFilter={typeFilter}
          onTypeChange={setTypeFilter}
        />

        {loading ? (
          <div className="text-center text-text-muted mt-12">Chargement...</div>
        ) : items.length === 0 ? (
          <div className="text-center text-text-muted mt-12">Aucun objet disponible</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} onClick={() => setSelectedItem(item)} />
            ))}
          </div>
        )}

        <ItemModal
          item={selectedItem}
          open={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          prenom={associationName}
          onReserve={handleReserve}
          onCancelReserve={async () => {}}
        />
      </main>
    </div>
  );
}
