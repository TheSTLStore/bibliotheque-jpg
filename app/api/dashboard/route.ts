import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const prenom = request.nextUrl.searchParams.get("prenom");

  if (!prenom) {
    return NextResponse.json({ error: "Prénom requis" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: reservations, error } = await supabase
    .from("reservations")
    .select(`
      id,
      prenom,
      created_at,
      items (id, titre, auteur_artiste, type, categorie, image_url, status)
    `)
    .eq("prenom", prenom)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(reservations);
}
