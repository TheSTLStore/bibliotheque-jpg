import { LookupResult } from "@/types";

export async function lookupDiscogs(
  ean: string
): Promise<LookupResult | null> {
  const token = process.env.DISCOGS_TOKEN;
  if (!token) return null;

  const res = await fetch(
    `https://api.discogs.com/database/search?barcode=${ean}&token=${token}`,
    {
      headers: { "User-Agent": "BibliothequeJPG/1.0" },
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!res.ok) return null;

  const data = await res.json();
  if (!data.results || data.results.length === 0) return null;

  const item = data.results[0];
  const [artiste, titre] = item.title?.includes(" - ")
    ? item.title.split(" - ", 2)
    : ["Inconnu", item.title || ""];

  return {
    titre: titre.trim(),
    auteur_artiste: artiste.trim(),
    annee: item.year ? parseInt(item.year, 10) : null,
    categorie: item.genre?.[0] || null,
    image_url: item.cover_image || null,
  };
}
