"use client";

import { useState } from "react";
import { ScannerView } from "@/components/ScannerView";
import { ItemForm, ItemFormData } from "@/components/ItemForm";
import { toast } from "sonner";

type ScanStep = "scan" | "loading" | "form";

export default function ScannerPage() {
  const [step, setStep] = useState<ScanStep>("scan");
  const [lookupData, setLookupData] = useState<Record<string, unknown> | undefined>(undefined);
  const [statusMessage, setStatusMessage] = useState("");

  async function uploadPhoto(base64: string): Promise<string | null> {
    try {
      const res = await fetch("/api/scan/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, uploadOnly: true }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.image_url || null;
      }
    } catch { /* ignore */ }
    return null;
  }

  async function enrichMetadata(metadata: Record<string, unknown>): Promise<Record<string, unknown>> {
    try {
      const res = await fetch("/api/scan/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titre: metadata.titre,
          auteur_artiste: metadata.auteur_artiste,
          type: metadata.type || "Livre",
          categorie: metadata.categorie,
        }),
      });
      if (res.ok) {
        const enriched = await res.json();
        return {
          ...metadata,
          categorie: enriched.categorie || metadata.categorie,
          tags: enriched.tags || [],
        };
      }
    } catch { /* ignore */ }
    return metadata;
  }

  async function handleBarcodeDetected(barcode: string, photo: string | null) {
    setStep("loading");
    setStatusMessage(`Code-barre détecté : ${barcode}. Recherche...`);

    try {
      const res = await fetch("/api/scan/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isbn: barcode }),
      });

      if (res.ok) {
        let data = await res.json();

        // Upload the photo taken during barcode scan
        setStatusMessage("Upload de la photo...");
        let imageUrl = data.image_url;
        if (photo) {
          const uploadedUrl = await uploadPhoto(photo);
          if (uploadedUrl) {
            imageUrl = uploadedUrl;
          }
        }
        data = { ...data, image_url: imageUrl, isbn_ean: barcode };

        // Enrich with AI (categorie + tags)
        setStatusMessage("Enrichissement IA (catégorie, tags)...");
        data = await enrichMetadata(data);

        setLookupData(data);
        setStep("form");
      } else {
        // Lookup failed — try photo + AI if we have a photo
        if (photo) {
          setStatusMessage("Code-barre non trouvé. Analyse par IA...");
          await handlePhotoCapture(photo);
        } else {
          setStep("scan");
          toast.error("Code-barre non trouvé. Essaie de prendre une photo.");
        }
      }
    } catch {
      setStep("scan");
      toast.error("Erreur réseau");
    }
  }

  async function handlePhotoCapture(base64: string) {
    setStep("loading");
    setStatusMessage("Analyse de l'image par IA...");

    try {
      const res = await fetch("/api/scan/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });

      const data = await res.json();

      if (res.ok) {
        // Enrich with tags
        setStatusMessage("Enrichissement IA (tags)...");
        const enriched = await enrichMetadata(data);
        setLookupData(enriched);
        setStep("form");
      } else {
        setLookupData({ image_url: data.image_url });
        setStep("form");
        toast.error("Identification partielle — complète les champs manuellement");
      }
    } catch {
      setStep("scan");
      toast.error("Erreur réseau");
    }
  }

  async function handleSubmit(formData: ItemFormData) {
    let imageUrl = formData.image_url;

    // Re-upload external image to Supabase if needed
    if (imageUrl && !imageUrl.includes("supabase")) {
      try {
        const imgRes = await fetch("/api/scan/upload-external", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: imageUrl }),
        });
        if (imgRes.ok) {
          const { image_url } = await imgRes.json();
          imageUrl = image_url;
        }
      } catch { /* keep original URL */ }
    }

    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...formData,
        image_url: imageUrl,
        annee: formData.annee ? parseInt(formData.annee, 10) : null,
      }),
    });

    if (res.ok) {
      toast.success("Objet enregistré !");
      setLookupData(undefined);
      setStep("scan");
    } else {
      const data = await res.json();
      toast.error(data.error || "Erreur lors de l'enregistrement");
    }
  }

  return (
    <div className="px-4 py-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-accent mb-4">Scanner</h1>

      {step === "scan" && (
        <ScannerView onBarcodeDetected={handleBarcodeDetected} onPhotoCapture={handlePhotoCapture} />
      )}

      {step === "loading" && (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-text-secondary">{statusMessage}</p>
        </div>
      )}

      {step === "form" && (
        <ItemForm
          initialData={lookupData}
          onSubmit={handleSubmit}
          onCancel={() => { setLookupData(undefined); setStep("scan"); }}
        />
      )}
    </div>
  );
}
