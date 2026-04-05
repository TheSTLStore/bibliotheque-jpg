"use client";

import { useState } from "react";
import { Eye, EyeOff, MapPin, Star } from "lucide-react";
import { ItemEtat } from "@/types";

interface AdminBatchBarProps {
  selectedCount: number;
  onBatchAction: (action: string, value?: string) => Promise<void>;
}

const etats: ItemEtat[] = ["Neuf", "Très bon", "Bon", "Acceptable", "Mauvais"];

export function AdminBatchBar({ selectedCount, onBatchAction }: AdminBatchBarProps) {
  const [showLocInput, setShowLocInput] = useState(false);
  const [showEtatSelect, setShowEtatSelect] = useState(false);
  const [locValue, setLocValue] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAction(action: string, value?: string) {
    setLoading(true);
    await onBatchAction(action, value);
    setShowLocInput(false);
    setShowEtatSelect(false);
    setLocValue("");
    setLoading(false);
  }

  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-0 z-10 bg-background-light border border-border rounded-lg p-3 mb-4 flex flex-wrap gap-2 items-center">
      <span className="text-text-secondary text-sm font-semibold">{selectedCount} sélectionné(s)</span>
      <button onClick={() => handleAction("show")} disabled={loading} className="btn-primary text-xs flex items-center gap-1">
        <Eye size={12} /> Rendre visible
      </button>
      <button onClick={() => handleAction("hide")} disabled={loading} className="btn-secondary text-xs flex items-center gap-1">
        <EyeOff size={12} /> Masquer
      </button>
      {showLocInput ? (
        <div className="flex gap-1 items-center">
          <input type="text" value={locValue} onChange={(e) => setLocValue(e.target.value)} className="input-field text-xs py-1 w-48" placeholder="Localisation..." autoFocus />
          <button onClick={() => handleAction("localisation", locValue)} disabled={loading || !locValue} className="btn-primary text-xs">OK</button>
          <button onClick={() => setShowLocInput(false)} className="btn-secondary text-xs">×</button>
        </div>
      ) : (
        <button onClick={() => setShowLocInput(true)} className="btn-secondary text-xs flex items-center gap-1">
          <MapPin size={12} /> Localisation
        </button>
      )}
      {showEtatSelect ? (
        <div className="flex gap-1 items-center">
          <select onChange={(e) => { if (e.target.value) handleAction("etat", e.target.value); }} className="input-field text-xs py-1" defaultValue="">
            <option value="" disabled>Choisir...</option>
            {etats.map((e) => (<option key={e} value={e}>{e}</option>))}
          </select>
          <button onClick={() => setShowEtatSelect(false)} className="btn-secondary text-xs">×</button>
        </div>
      ) : (
        <button onClick={() => setShowEtatSelect(true)} className="btn-secondary text-xs flex items-center gap-1">
          <Star size={12} /> État
        </button>
      )}
    </div>
  );
}
