import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { parseAssociationSlugs } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  const slugs = parseAssociationSlugs();
  const { slug, id } = await params;
  const associationName = slugs.get(slug);

  if (!associationName) {
    return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
  }

  const supabase = createServerClient();

  const { data: item } = await supabase
    .from("items")
    .select("id, status")
    .eq("id", id)
    .eq("status", "Disponible")
    .single();

  if (!item) {
    return NextResponse.json({ error: "Objet non disponible" }, { status: 404 });
  }

  const { error } = await supabase
    .from("reservations")
    .insert({ item_id: id, prenom: associationName });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Déjà réservé par votre association" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
