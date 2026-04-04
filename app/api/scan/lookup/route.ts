import { NextRequest, NextResponse } from "next/server";
import { lookupGoogleBooks } from "@/lib/google-books";
import { lookupDiscogs } from "@/lib/discogs";

export async function POST(request: NextRequest) {
  const { isbn, type } = await request.json();

  if (!isbn) {
    return NextResponse.json({ error: "Code-barre requis" }, { status: 400 });
  }

  let result = null;

  if (type === "Livre" || !type) {
    result = await lookupGoogleBooks(isbn);
  }

  if (!result && (type === "CD" || type === "Vinyle" || !type)) {
    result = await lookupDiscogs(isbn);
  }

  if (!result && type === "Livre") {
    result = await lookupDiscogs(isbn);
  }

  if (!result) {
    return NextResponse.json(
      { error: "Aucun résultat trouvé pour ce code-barre" },
      { status: 404 }
    );
  }

  return NextResponse.json(result);
}
