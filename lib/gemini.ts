import { GoogleGenAI } from "@google/genai";
import { VisionResult } from "@/types";

export async function analyzeImage(imageBase64: string): Promise<VisionResult | null> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  const prompt = `Tu es un expert en identification de livres, CDs et vinyles.
Analyse cette image et identifie l'objet.
Retourne UNIQUEMENT un JSON valide avec ces champs :
{
  "titre": "titre de l'oeuvre",
  "auteur_artiste": "auteur ou artiste",
  "type": "Livre" ou "CD" ou "Vinyle",
  "categorie": "genre principal (Roman, Policier, Classique, Pop, Rock, Jazz, etc.)",
  "annee": 2000
}
Si tu ne peux pas identifier un champ, mets null.
Ne retourne rien d'autre que le JSON.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: imageBase64,
            },
          },
        ],
      },
    ],
  });

  const text = response.text?.trim();
  if (!text) return null;

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      titre: parsed.titre || "Inconnu",
      auteur_artiste: parsed.auteur_artiste || "Inconnu",
      type: ["Livre", "CD", "Vinyle"].includes(parsed.type) ? parsed.type : "Livre",
      categorie: parsed.categorie || null,
      annee: typeof parsed.annee === "number" ? parsed.annee : null,
    };
  } catch {
    return null;
  }
}
