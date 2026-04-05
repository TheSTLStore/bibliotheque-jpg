import { NextRequest, NextResponse } from "next/server";
import { enrichWithAI } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  const { titre, auteur_artiste, type } = await request.json();

  if (!titre) {
    return NextResponse.json({ error: "Titre requis" }, { status: 400 });
  }

  const result = await enrichWithAI({ titre, auteur_artiste, type });

  return NextResponse.json({ valeur_estimee: result.valeur_estimee });
}
