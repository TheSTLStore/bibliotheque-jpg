import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const prenom = request.nextUrl.searchParams.get("prenom");
  const supabase = createServerClient();

  let query = supabase
    .from("reservations")
    .select(`id, prenom, created_at, items (id, titre, auteur_artiste, type, categorie, localisation, image_url, status)`)
    .order("created_at", { ascending: false });

  if (prenom) {
    query = query.eq("prenom", prenom);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
