import { NextRequest, NextResponse } from "next/server";
import { searchEbay } from "@/lib/ebay";

export async function POST(request: NextRequest) {
  const { titre, auteur_artiste, isbn_ean, type } = await request.json();

  if (!titre) {
    return NextResponse.json({ error: "Titre requis" }, { status: 400 });
  }

  try {
    const query = `${titre} ${auteur_artiste || ""} ${type || ""}`.trim();
    const results = await searchEbay(query, isbn_ean);
    return NextResponse.json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur eBay";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
