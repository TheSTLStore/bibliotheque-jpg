"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EbayResults } from "@/components/EbayResults";
import { Item, ItemType, ItemEtat } from "@/types";
import { Trash2, RefreshCw, Search } from "lucide-react";

const types: ItemType[] = ["Livre", "CD", "Vinyle"];
const etats: ItemEtat[] = ["Neuf", "Très bon", "Bon", "Acceptable", "Mauvais"];

interface AdminItemEditModalProps {
  item: Item | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, data: Partial<Item>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

interface EbayResult { titre: string; prix: string; lien: string; image: string | null; }

export function AdminItemEditModal({ item, open, onClose, onSave, onDelete }: AdminItemEditModalProps) {
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [ebayResults, setEbayResults] = useState<EbayResult[]>([]);
  const [ebayLoading, setEbayLoading] = useState(false);

  // Reset form when item changes
  useEffect(() => {
    setForm({});
    setEbayResults([]);
  }, [item?.id]);

  function getField<T>(field: string, fallback: T): T {
    if (field in form) return form[field] as T;
    if (item) return (item as unknown as Record<string, unknown>)[field] as T ?? fallback;
    return fallback;
  }

  function setField(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!item) return;
    setLoading(true);
    await onSave(item.id, {
      titre: getField("titre", ""),
      auteur_artiste: getField("auteur_artiste", ""),
      type: getField("type", "Livre") as ItemType,
      categorie: getField("categorie", null),
      etat: getField("etat", "Bon") as ItemEtat,
      annee: getField("annee", null),
      localisation: getField("localisation", null),
      tags: getField("tags", []),
      visible: getField("visible", false),
      valeur_estimee: getField("valeur_estimee", null),
    });
    setForm({});
    setLoading(false);
    onClose();
  }

  async function handleDelete() {
    if (!item || !confirm("Supprimer cet objet ?")) return;
    await onDelete(item.id);
    setForm({});
    onClose();
  }

  async function handleReEstimate() {
    if (!item) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titre: getField("titre", item.titre),
          auteur_artiste: getField("auteur_artiste", item.auteur_artiste),
          type: getField("type", item.type),
          etat: getField("etat", item.etat),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setField("valeur_estimee", data.valeur_estimee);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function handleEbaySearch() {
    if (!item) return;
    setEbayLoading(true);
    try {
      const res = await fetch("/api/admin/ebay-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titre: item.titre,
          auteur_artiste: item.auteur_artiste,
          isbn_ean: item.isbn_ean,
          type: item.type,
        }),
      });
      if (res.ok) {
        setEbayResults(await res.json());
      }
    } catch { /* ignore */ }
    setEbayLoading(false);
  }

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={() => { setForm({}); setEbayResults([]); onClose(); }}>
      <DialogContent className="bg-background-card border-border text-text-primary max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-accent">Modifier — {item.titre}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            {item.image_url && (
              <div className="relative w-24 h-32 rounded-lg overflow-hidden">
                <Image src={item.image_url} alt={item.titre} fill className="object-cover" />
              </div>
            )}
            <div>
              <label className="text-text-secondary text-xs block mb-1">Titre</label>
              <input type="text" value={getField("titre", item.titre)} onChange={(e) => setField("titre", e.target.value)} className="input-field w-full text-sm" />
            </div>
            <div>
              <label className="text-text-secondary text-xs block mb-1">Auteur/Artiste</label>
              <input type="text" value={getField("auteur_artiste", item.auteur_artiste)} onChange={(e) => setField("auteur_artiste", e.target.value)} className="input-field w-full text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-text-secondary text-xs block mb-1">Type</label>
                <select value={getField("type", item.type)} onChange={(e) => setField("type", e.target.value)} className="input-field w-full text-sm">
                  {types.map((t) => (<option key={t} value={t}>{t}</option>))}
                </select>
              </div>
              <div>
                <label className="text-text-secondary text-xs block mb-1">État</label>
                <select value={getField("etat", item.etat)} onChange={(e) => setField("etat", e.target.value)} className="input-field w-full text-sm">
                  {etats.map((e) => (<option key={e} value={e}>{e}</option>))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-text-secondary text-xs block mb-1">Catégorie</label>
                <input type="text" value={getField("categorie", item.categorie || "")} onChange={(e) => setField("categorie", e.target.value)} className="input-field w-full text-sm" />
              </div>
              <div>
                <label className="text-text-secondary text-xs block mb-1">Année</label>
                <input type="number" value={getField("annee", item.annee || "")} onChange={(e) => setField("annee", e.target.value ? parseInt(e.target.value) : null)} className="input-field w-full text-sm" />
              </div>
            </div>
            <div>
              <label className="text-text-secondary text-xs block mb-1">Localisation</label>
              <input type="text" value={getField("localisation", item.localisation || "")} onChange={(e) => setField("localisation", e.target.value)} className="input-field w-full text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="visible" checked={getField("visible", item.visible)} onChange={(e) => setField("visible", e.target.checked)} />
              <label htmlFor="visible" className="text-text-secondary text-sm">Visible dans la galerie</label>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-text-secondary text-xs block mb-1">Estimation (€)</label>
              <div className="flex gap-2 items-center">
                <input type="number" step="0.01" value={getField("valeur_estimee", item.valeur_estimee || "")} onChange={(e) => setField("valeur_estimee", e.target.value ? parseFloat(e.target.value) : null)} className="input-field flex-1 text-sm" placeholder="0.00" />
                <button type="button" onClick={handleReEstimate} disabled={loading} className="btn-secondary text-xs flex items-center gap-1" title="Recalculer avec IA">
                  <RefreshCw size={12} />
                </button>
              </div>
            </div>
            <button type="button" onClick={handleEbaySearch} disabled={ebayLoading} className="btn-secondary w-full text-xs flex items-center justify-center gap-1">
              <Search size={12} />
              {ebayLoading ? "Recherche..." : "Rechercher sur eBay"}
            </button>
            <EbayResults results={ebayResults} loading={ebayLoading} />
          </div>
        </div>

        <div className="flex gap-2 mt-4 pt-3 border-t border-border">
          <button onClick={handleSave} disabled={loading} className="btn-primary flex-1 disabled:opacity-50">
            {loading ? "..." : "Enregistrer"}
          </button>
          <button onClick={handleDelete} className="btn-secondary text-error flex items-center gap-1">
            <Trash2 size={14} /> Supprimer
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
