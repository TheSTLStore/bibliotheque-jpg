"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { AdminBatchBar } from "@/components/AdminBatchBar";
import { AdminItemEditModal } from "@/components/AdminItemEditModal";
import { Item } from "@/types";
import { BookOpen, Disc, Disc3, Eye, EyeOff, Search } from "lucide-react";

const typeIcons: Record<string, typeof BookOpen> = { Livre: BookOpen, CD: Disc, Vinyle: Disc3 };

export function AdminItemsTab() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [visibleFilter, setVisibleFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editItem, setEditItem] = useState<Item | null>(null);

  const fetchItems = useCallback(async () => {
    const params = new URLSearchParams();
    if (typeFilter) params.set("type", typeFilter);
    if (visibleFilter !== "all") params.set("visible", visibleFilter);
    if (search) params.set("search", search);

    const res = await fetch(`/api/admin/items?${params}`);
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }, [typeFilter, visibleFilter, search]);

  useEffect(() => {
    const t = setTimeout(fetchItems, 300);
    return () => clearTimeout(t);
  }, [fetchItems]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((i) => i.id)));
    }
  }

  async function handleBatchAction(action: string, value?: string) {
    const res = await fetch("/api/admin/items/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected), action, value }),
    });
    if (res.ok) {
      setSelected(new Set());
      fetchItems();
    }
  }

  async function handleSave(id: string, data: Partial<Item>) {
    await fetch(`/api/admin/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    fetchItems();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/items/${id}`, { method: "DELETE" });
    fetchItems();
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="input-field w-full pl-8 text-sm" placeholder="Rechercher..." />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input-field text-sm">
          <option value="">Tous types</option>
          <option value="Livre">Livres</option>
          <option value="CD">CDs</option>
          <option value="Vinyle">Vinyles</option>
        </select>
        <select value={visibleFilter} onChange={(e) => setVisibleFilter(e.target.value)} className="input-field text-sm">
          <option value="all">Tous</option>
          <option value="true">Visibles</option>
          <option value="false">Masqués</option>
        </select>
      </div>

      <AdminBatchBar selectedCount={selected.size} onBatchAction={handleBatchAction} />

      {loading ? (
        <p className="text-text-muted text-center py-8">Chargement...</p>
      ) : items.length === 0 ? (
        <p className="text-text-muted text-center py-8">Aucun article</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-text-secondary text-left">
                <th className="py-2 px-2"><input type="checkbox" checked={selected.size === items.length && items.length > 0} onChange={toggleSelectAll} /></th>
                <th className="py-2 px-2"></th>
                <th className="py-2 px-2">Titre</th>
                <th className="py-2 px-2">Auteur</th>
                <th className="py-2 px-2">Type</th>
                <th className="py-2 px-2">État</th>
                <th className="py-2 px-2">Estim.</th>
                <th className="py-2 px-2">Localisation</th>
                <th className="py-2 px-2">Visible</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const Icon = typeIcons[item.type] || BookOpen;
                return (
                  <tr key={item.id} className="border-b border-border/50 hover:bg-background-light/50 cursor-pointer" onClick={() => setEditItem(item)}>
                    <td className="py-2 px-2" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} />
                    </td>
                    <td className="py-2 px-2">
                      <div className="w-8 h-10 bg-background rounded overflow-hidden relative flex-shrink-0">
                        {item.image_url ? (
                          <Image src={item.image_url} alt="" fill className="object-cover" sizes="32px" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Icon size={14} className="text-text-muted" /></div>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-text-primary max-w-[200px] truncate">{item.titre}</td>
                    <td className="py-2 px-2 text-text-secondary max-w-[150px] truncate">{item.auteur_artiste}</td>
                    <td className="py-2 px-2 text-text-secondary">{item.type}</td>
                    <td className="py-2 px-2 text-text-secondary">{item.etat}</td>
                    <td className="py-2 px-2 text-accent">{item.valeur_estimee ? `${Number(item.valeur_estimee).toFixed(0)}€` : "—"}</td>
                    <td className="py-2 px-2 text-text-secondary max-w-[150px] truncate">{item.localisation || "—"}</td>
                    <td className="py-2 px-2">
                      {item.visible ? <Eye size={14} className="text-success" /> : <EyeOff size={14} className="text-text-muted" />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AdminItemEditModal item={editItem} open={!!editItem} onClose={() => setEditItem(null)} onSave={handleSave} onDelete={handleDelete} />
    </div>
  );
}
