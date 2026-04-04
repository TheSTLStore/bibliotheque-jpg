"use client";

import { useState, useEffect, useCallback } from "react";
import { ItemCard } from "@/components/ItemCard";
import { ItemModal } from "@/components/ItemModal";
import { FilterBar } from "@/components/FilterBar";
import { useAuth } from "@/hooks/use-auth";
import { ItemWithReservations, ItemType } from "@/types";

export default function GaleriePage() {
  const { prenom } = useAuth();
  const [items, setItems] = useState<ItemWithReservations[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ItemType | null>(null);
  const [selectedItem, setSelectedItem] = useState<ItemWithReservations | null>(null);

  const fetchItems = useCallback(async () => {
    const params = new URLSearchParams();
    if (typeFilter) params.set("type", typeFilter);
    if (search) params.set("search", search);

    const res = await fetch(`/api/items?${params}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data);
    }
    setLoading(false);
  }, [typeFilter, search]);

  useEffect(() => {
    const timeout = setTimeout(fetchItems, 300);
    return () => clearTimeout(timeout);
  }, [fetchItems]);

  async function handleReserve(itemId: string) {
    const res = await fetch(`/api/items/${itemId}/reserve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prenom }),
    });
    if (res.ok) {
      await fetchItems();
      const updated = items.find((i) => i.id === itemId);
      if (updated) setSelectedItem({ ...updated });
    }
  }

  async function handleCancelReserve(itemId: string) {
    const res = await fetch(`/api/items/${itemId}/reserve`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prenom }),
    });
    if (res.ok) {
      await fetchItems();
    }
  }

  return (
    <div className="px-4 py-4 max-w-7xl mx-auto">
      <h1 className="text-xl font-bold text-accent mb-4">Catalogue</h1>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        typeFilter={typeFilter}
        onTypeChange={setTypeFilter}
      />

      {loading ? (
        <div className="text-center text-text-muted mt-12">Chargement...</div>
      ) : items.length === 0 ? (
        <div className="text-center text-text-muted mt-12">
          Aucun objet trouvé
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onClick={() => setSelectedItem(item)}
            />
          ))}
        </div>
      )}

      <ItemModal
        item={selectedItem}
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        prenom={prenom || ""}
        onReserve={handleReserve}
        onCancelReserve={handleCancelReserve}
      />
    </div>
  );
}
