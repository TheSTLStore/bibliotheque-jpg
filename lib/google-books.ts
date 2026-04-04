import { LookupResult } from "@/types";

export async function lookupGoogleBooks(
  isbn: string
): Promise<LookupResult | null> {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  const url = apiKey
    ? `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${apiKey}`
    : `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) return null;

  const data = await res.json();
  if (!data.items || data.items.length === 0) return null;

  const book = data.items[0].volumeInfo;

  return {
    titre: book.title || "",
    auteur_artiste: (book.authors || []).join(", ") || "Inconnu",
    annee: book.publishedDate
      ? parseInt(book.publishedDate.substring(0, 4), 10) || null
      : null,
    categorie: book.categories?.[0] || null,
    image_url: book.imageLinks?.thumbnail || null,
  };
}
