import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const { prenom } = await request.json();

  if (!prenom) {
    return NextResponse.json({ error: "Prénom requis" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: item } = await supabase
    .from("items")
    .select("id, status")
    .eq("id", id)
    .single();

  if (!item) {
    return NextResponse.json({ error: "Objet introuvable" }, { status: 404 });
  }

  if (item.status === "Donné") {
    return NextResponse.json({ error: "Cet objet a déjà été donné" }, { status: 409 });
  }

  const { error } = await supabase
    .from("reservations")
    .insert({ item_id: id, prenom });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Tu as déjà réservé cet objet" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const { prenom } = await request.json();

  if (!prenom) {
    return NextResponse.json({ error: "Prénom requis" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { error } = await supabase
    .from("reservations")
    .delete()
    .eq("item_id", id)
    .eq("prenom", prenom);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
