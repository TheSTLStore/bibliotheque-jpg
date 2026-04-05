import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  const { ids, action, value } = await request.json();

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "IDs requis" }, { status: 400 });
  }

  const supabase = createServerClient();
  let updateData: Record<string, unknown> = {};

  switch (action) {
    case "show":
      updateData = { visible: true };
      break;
    case "hide":
      updateData = { visible: false };
      break;
    case "localisation":
      if (!value) return NextResponse.json({ error: "Valeur requise" }, { status: 400 });
      updateData = { localisation: value };
      break;
    case "etat":
      if (!value) return NextResponse.json({ error: "Valeur requise" }, { status: 400 });
      updateData = { etat: value };
      break;
    default:
      return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  }

  const { error } = await supabase
    .from("items")
    .update(updateData)
    .in("id", ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updated: ids.length });
}
