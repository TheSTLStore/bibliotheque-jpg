import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createServerClient();

  const [itemsRes, reservationsRes] = await Promise.all([
    supabase.from("items").select("type, status"),
    supabase.from("reservations").select("prenom"),
  ]);

  const items = itemsRes.data || [];
  const reservations = reservationsRes.data || [];

  const stats = {
    totalItems: items.length,
    byType: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Livre: items.filter((i: any) => i.type === "Livre").length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      CD: items.filter((i: any) => i.type === "CD").length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Vinyle: items.filter((i: any) => i.type === "Vinyle").length,
    },
    byStatus: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Disponible: items.filter((i: any) => i.status === "Disponible").length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Donné: items.filter((i: any) => i.status === "Donné").length,
    },
    totalReservations: reservations.length,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    uniqueReservers: Array.from(new Set(reservations.map((r: any) => r.prenom))),
  };

  return NextResponse.json(stats);
}
