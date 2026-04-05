import { NextRequest, NextResponse } from "next/server";
import { lookupGoogleBooks } from "@/lib/google-books";
import { lookupDiscogs } from "@/lib/discogs";
import { createServerClient } from "@/lib/supabase-server";

async function reuploadImage(imageUrl: string): Promise<string | null> {
  try {
    // Force HTTPS
    const url = imageUrl.replace(/^http:\/\//, "https://");
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    const supabase = createServerClient();
    const fileName = `cover-${Date.now()}.jpg`;

    const { error } = await supabase.storage
      .from("item-images")
      .upload(fileName, buffer, { contentType: "image/jpeg", upsert: false });

    if (error) return null;

    const { data: { publicUrl } } = supabase.storage
      .from("item-images")
      .getPublicUrl(fileName);

    return publicUrl;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const { isbn } = await request.json();

  if (!isbn) {
    return NextResponse.json({ error: "Code-barre requis" }, { status: 400 });
  }

  // Try both APIs in parallel to detect the right type
  const [booksResult, discogsResult] = await Promise.all([
    lookupGoogleBooks(isbn),
    lookupDiscogs(isbn),
  ]);

  let result = null;
  let detectedType: "Livre" | "CD" | "Vinyle" = "Livre";

  if (discogsResult && booksResult) {
    // Both found — Discogs is more specific for music, prefer it for type detection
    result = discogsResult;
    detectedType = discogsResult.format;
  } else if (discogsResult) {
    // Only Discogs found it — it's music
    result = discogsResult;
    detectedType = discogsResult.format;
  } else if (booksResult) {
    // Only Google Books found it — it's a book
    result = booksResult;
    detectedType = "Livre";
  }

  if (!result) {
    return NextResponse.json(
      { error: "Aucun résultat trouvé pour ce code-barre" },
      { status: 404 }
    );
  }

  // Re-upload external image to Supabase Storage
  let imageUrl = result.image_url;
  if (imageUrl) {
    const supabaseUrl = await reuploadImage(imageUrl);
    imageUrl = supabaseUrl;
  }

  return NextResponse.json({
    ...result,
    image_url: imageUrl,
    type: detectedType,
  });
}
