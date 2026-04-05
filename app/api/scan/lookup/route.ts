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
  const { isbn, type } = await request.json();

  if (!isbn) {
    return NextResponse.json({ error: "Code-barre requis" }, { status: 400 });
  }

  let result = null;

  if (type === "Livre" || !type) {
    result = await lookupGoogleBooks(isbn);
  }

  if (!result && (type === "CD" || type === "Vinyle" || !type)) {
    result = await lookupDiscogs(isbn);
  }

  if (!result && type === "Livre") {
    result = await lookupDiscogs(isbn);
  }

  if (!result) {
    return NextResponse.json(
      { error: "Aucun résultat trouvé pour ce code-barre" },
      { status: 404 }
    );
  }

  // Re-upload external image to Supabase Storage
  if (result.image_url) {
    const supabaseUrl = await reuploadImage(result.image_url);
    if (supabaseUrl) {
      result = { ...result, image_url: supabaseUrl };
    } else {
      result = { ...result, image_url: null };
    }
  }

  return NextResponse.json(result);
}
