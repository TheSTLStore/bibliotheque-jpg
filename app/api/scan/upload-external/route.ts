import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  const { url } = await request.json();

  if (!url) {
    return NextResponse.json({ error: "URL requise" }, { status: 400 });
  }

  try {
    const imgRes = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!imgRes.ok) throw new Error("Fetch failed");

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const supabase = createServerClient();
    const fileName = `ext-${Date.now()}.jpg`;

    const { error } = await supabase.storage
      .from("item-images")
      .upload(fileName, buffer, { contentType: "image/jpeg", upsert: false });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage.from("item-images").getPublicUrl(fileName);

    return NextResponse.json({ image_url: publicUrl });
  } catch {
    return NextResponse.json({ error: "Impossible de télécharger l'image" }, { status: 500 });
  }
}
