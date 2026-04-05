"use client";

interface EbayResult {
  titre: string;
  prix: string;
  lien: string;
  image: string | null;
}

interface EbayResultsProps {
  results: EbayResult[];
  loading: boolean;
}

export function EbayResults({ results, loading }: EbayResultsProps) {
  if (loading) {
    return <p className="text-text-muted text-xs">Recherche eBay...</p>;
  }
  if (results.length === 0) {
    return <p className="text-text-muted text-xs">Aucun résultat eBay</p>;
  }
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-text-secondary">Résultats eBay</h4>
      {results.map((r, i) => (
        <a key={i} href={r.lien} target="_blank" rel="noopener noreferrer" className="flex gap-2 items-center p-2 bg-background rounded-lg border border-border hover:border-border-light text-xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {r.image && <img src={r.image} alt="" className="w-10 h-10 object-cover rounded" />}
          <div className="flex-1 min-w-0">
            <p className="text-text-primary truncate">{r.titre}</p>
            <p className="text-accent font-semibold">{r.prix}</p>
          </div>
        </a>
      ))}
    </div>
  );
}
