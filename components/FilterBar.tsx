"use client";

import { Search } from "lucide-react";
import { ItemType } from "@/types";

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  typeFilter: ItemType | null;
  onTypeChange: (value: ItemType | null) => void;
}

const types: (ItemType | null)[] = [null, "Livre", "CD", "Vinyle"];
const typeLabels: Record<string, string> = {
  "": "Tous",
  Livre: "Livres",
  CD: "CDs",
  Vinyle: "Vinyles",
};

export function FilterBar({
  search,
  onSearchChange,
  typeFilter,
  onTypeChange,
}: FilterBarProps) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher titre ou auteur..."
          className="input-field w-full pl-9"
        />
      </div>
      <div className="flex gap-2">
        {types.map((t) => (
          <button
            key={t ?? "all"}
            onClick={() => onTypeChange(t)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              typeFilter === t
                ? "bg-accent text-background font-semibold"
                : "bg-background-light text-text-secondary border border-border hover:border-border-light"
            }`}
          >
            {typeLabels[t ?? ""]}
          </button>
        ))}
      </div>
    </div>
  );
}
