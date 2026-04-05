import { GoogleGenAI } from "@google/genai";
import { VisionResult } from "@/types";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

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
    model: MODEL,
    contents: [
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64,
        },
      },
      { text: prompt },
    ],
  });

  const text = response.text?.trim();
  if (!text) return null;

  return parseVisionResponse(text);
}

export interface EnrichResult {
  categorie: string | null;
  tags: string[];
}

export async function enrichWithAI(metadata: {
  titre: string;
  auteur_artiste: string;
  type: string;
  categorie?: string | null;
}): Promise<EnrichResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  const prompt = `Tu es un expert en classification de livres, CDs et vinyles.
Voici un objet :
- Titre : ${metadata.titre}
- Auteur/Artiste : ${metadata.auteur_artiste}
- Type : ${metadata.type}
${metadata.categorie ? `- Catégorie existante : ${metadata.categorie}` : ""}

Retourne UNIQUEMENT un JSON valide avec :
{
  "categorie": "genre principal le plus précis (ex: Roman policier, Jazz vocal, Rock progressif, Bande dessinée, Science-fiction, Classique baroque, etc.)",
  "tags": ["tag1", "tag2", "tag3"]
}
Les tags doivent être des mots-clés utiles pour filtrer/retrouver l'objet (ex: "poche", "collector", "français", "anglais", "jeunesse", "rare", "coffret", "première édition", etc.).
Maximum 3 tags. Ne retourne rien d'autre que le JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ text: prompt }],
    });

    const text = response.text?.trim();
    if (!text) return { categorie: metadata.categorie || null, tags: [] };

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { categorie: metadata.categorie || null, tags: [] };

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      categorie: parsed.categorie || metadata.categorie || null,
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 3) : [],
    };
  } catch {
    return { categorie: metadata.categorie || null, tags: [] };
  }
}

function parseVisionResponse(text: string): VisionResult | null {
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