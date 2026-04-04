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

  async function handleBarcodeDetected(barcode: string) {
    setStep("loading");
    setStatusMessage(`Code-barre détecté : ${barcode}. Recherche...`);

    try {
      const res = await fetch("/api/scan/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isbn: barcode }),
      });

      if (res.ok) {
        const data = await res.json();
        setLookupData(data);
        setStep("form");
      } else {
        setStep("scan");
        toast.error("Code-barre non trouvé dans les bases de données");
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
        setLookupData(data);
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
