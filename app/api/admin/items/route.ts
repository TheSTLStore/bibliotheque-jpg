import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type");
  const search = searchParams.get("search");
  const visible = searchParams.get("visible");

  let query = supabase
    .from("items")
    .select(`*, reservations (id, prenom, created_at)`)
    .order("created_at", { ascending: false });

  if (type) query = query.eq("type", type);
  if (visible === "true") query = query.eq("visible", true);
  if (visible === "false") query = query.eq("visible", false);
  if (search) query = query.or(`titre.ilike.%${search}%,auteur_artiste.ilike.%${search}%`);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
