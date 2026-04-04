import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { generateCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const prenom = request.nextUrl.searchParams.get("prenom");
  const supabase = createServerClient();

  if (prenom) {
    const { data } = await supabase
      .from("reservations")
      .select(`prenom, items (titre, auteur_artiste, type, categorie, localisation)`)
      .eq("prenom", prenom);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (data || []).map((r: any) => ({
      titre: r.items.titre,
      auteur_artiste: r.items.auteur_artiste,
      type: r.items.type,
      categorie: r.items.categorie,
      localisation: r.items.localisation,
    }));

    const csv = generateCsv(rows, ["titre", "auteur_artiste", "type", "categorie", "localisation"]);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="reservations-${prenom}.csv"`,
      },
    });
  }

  const { data } = await supabase
    .from("items")
    .select(`titre, auteur_artiste, type, categorie, localisation, status, reservations (prenom)`)
    .order("titre");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data || []).map((item: any) => ({
    titre: item.titre,
    auteur_artiste: item.auteur_artiste,
    type: item.type,
    categorie: item.categorie,
    localisation: item.localisation,
    status: item.status,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reservations: (item.reservations || []).map((r: any) => r.prenom).join(", "),
  }));

  const csv = generateCsv(rows, ["titre", "auteur_artiste", "type", "categorie", "localisation", "status", "reservations"]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="catalogue-complet.csv"`,
    },
  });
}
