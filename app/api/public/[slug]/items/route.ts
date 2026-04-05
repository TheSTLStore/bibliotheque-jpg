import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { parseAssociationSlugs } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const slugs = parseAssociationSlugs();
  const { slug } = await params;
  const associationName = slugs.get(slug);

  if (!associationName) {
    return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
  }

  const supabase = createServerClient();
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type");
  const search = searchParams.get("search");

  let query = supabase
    .from("items")
    .select(`
      id, titre, auteur_artiste, type, categorie, etat, annee, image_url, tags, status,
      reservations (id, prenom, created_at)
    `)
    .eq("status", "Disponible")
    .eq("visible", true)
    .order("created_at", { ascending: false });

  if (type) query = query.eq("type", type);
  if (search) query = query.or(`titre.ilike.%${search}%,auteur_artiste.ilike.%${search}%`);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data || [], associationName });
}
