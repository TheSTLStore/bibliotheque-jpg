import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { analyzeImage } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  const { image, uploadOnly } = await request.json();

  if (!image) {
    return NextResponse.json({ error: "Image requise" }, { status: 400 });
  }

  const supabase = createServerClient();
  const fileName = `scan-${Date.now()}.jpg`;
  const buffer = Buffer.from(image, "base64");

  const { error: uploadError } = await supabase.storage
    .from("item-images")
    .upload(fileName, buffer, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: "Erreur upload image: " + uploadError.message },
      { status: 500 }
    );
  }

  const { data: { publicUrl } } = supabase.storage.from("item-images").getPublicUrl(fileName);

  // Upload only mode — just return the URL without AI analysis
  if (uploadOnly) {
    return NextResponse.json({ image_url: publicUrl });
  }

  let result = null;
  try {
    result = await analyzeImage(image);
  } catch (err) {
    console.error("Gemini API error:", err);
    return NextResponse.json(
      { error: "Erreur lors de l'analyse IA. Vérifiez votre clé Gemini.", image_url: publicUrl },
      { status: 422 }
    );
  }

  if (!result) {
    return NextResponse.json(
      { error: "Impossible d'identifier l'objet", image_url: publicUrl },
      { status: 422 }
    );
  }

  return NextResponse.json({
    ...result,
    image_url: publicUrl,
  });
}
