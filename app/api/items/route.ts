import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type");
  const search = searchParams.get("search");
  const categorie = searchParams.get("categorie");

  let query = supabase
    .from("items")
    .select(`
      *,
      reservations (id, prenom, created_at)
    `)
    .eq("visible", true)
    .order("created_at", { ascending: false });

  if (type) query = query.eq("type", type);
  if (categorie) query = query.eq("categorie", categorie);
  if (search) query = query.or(`titre.ilike.%${search}%,auteur_artiste.ilike.%${search}%`);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const items = (data || []).map(({ localisation, visible, valeur_estimee, ...item }: Record<string, unknown>) => item);

  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("items")
    .insert({
      titre: body.titre,
      auteur_artiste: body.auteur_artiste,
      type: body.type,
      categorie: body.categorie || null,
      etat: body.etat,
      isbn_ean: body.isbn_ean || null,
      tags: body.tags || [],
      annee: body.annee || null,
      image_url: body.image_url || null,
      localisation: body.localisation || null,
      valeur_estimee: body.valeur_estimee || null,
      visible: false,
      status: "Disponible",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
