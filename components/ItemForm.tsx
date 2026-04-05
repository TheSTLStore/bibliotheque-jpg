"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Camera } from "lucide-react";
import { ItemType, ItemEtat } from "@/types";

interface ItemFormProps {
  initialData?: Partial<{
    titre: string;
    auteur_artiste: string;
    type: ItemType;
    categorie: string;
    annee: number | null;
    image_url: string;
    tags: string[];
    isbn_ean: string;
    valeur_estimee: number | null;
  }>;
  onSubmit: (data: ItemFormData) => Promise<void>;
  onCancel: () => void;
  onCapturePhoto?: (base64: string) => Promise<string>;
}

export interface ItemFormData {
  titre: string;
  auteur_artiste: string;
  type: ItemType;
  categorie: string;
  etat: ItemEtat;
  isbn_ean: string;
  tags: string[];
  annee: string;
  image_url: string;
  localisation: string;
  valeur_estimee: string;
}

const types: ItemType[] = ["Livre", "CD", "Vinyle"];
const etats: ItemEtat[] = ["Neuf", "Très bon", "Bon", "Acceptable", "Mauvais"];

export function ItemForm({ initialData, onSubmit, onCancel, onCapturePhoto }: ItemFormProps) {
  const [form, setForm] = useState<ItemFormData>({
    titre: initialData?.titre || "",
    auteur_artiste: initialData?.auteur_artiste || "",
    type: initialData?.type || "Livre",
    categorie: initialData?.categorie || "",
    etat: "Bon",
    isbn_ean: initialData?.isbn_ean || "",
    tags: initialData?.tags || [],
    annee: initialData?.annee?.toString() || "",
    image_url: initialData?.image_url || "",
    localisation: "",
    valeur_estimee: initialData?.valeur_estimee?.toString() || "",
  });
  const [tagInput, setTagInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function updateField(field: keyof ItemFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function addTag() {
    const tag = tagInput.trim();
    if (tag && form.tags.length < 3 && !form.tags.includes(tag)) {
      setForm((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput("");
    }
  }

  function removeTag(tag: string) {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  }

  async function startCapture() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;
      setCapturing(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch { /* Camera not available */ }
  }

  async function takePhoto() {
    if (!videoRef.current || !canvasRef.current || !onCapturePhoto) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const base64 = canvas.toDataURL("image/jpeg", 0.8).split(",")[1];

    streamRef.current?.getTracks().forEach((t) => t.stop());
    setCapturing(false);

    setLoading(true);
    try {
      const url = await onCapturePhoto(base64);
      updateField("image_url", url);
    } catch { /* ignore */ }
    setLoading(false);
  }

  function cancelCapture() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setCapturing(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(form);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {form.image_url ? (
        <div className="relative w-32 h-40 mx-auto rounded-lg overflow-hidden">
          <Image src={form.image_url} alt="Couverture" fill className="object-cover" />
        </div>
      ) : capturing ? (
        <div>
          <video ref={videoRef} className="w-full rounded-lg" autoPlay playsInline muted />
          <div className="flex gap-2 mt-2 justify-center">
            <button type="button" onClick={takePhoto} className="btn-primary text-sm">Capturer</button>
            <button type="button" onClick={cancelCapture} className="btn-secondary text-sm">Annuler</button>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      ) : onCapturePhoto ? (
        <button type="button" onClick={startCapture} className="btn-secondary w-full flex items-center justify-center gap-2">
          <Camera size={16} />
          Ajouter une photo
        </button>
      ) : null}

      {form.valeur_estimee && (
        <div className="text-center text-sm text-accent-muted">
          Estimation IA : ~{parseFloat(form.valeur_estimee).toFixed(2)}€
        </div>
      )}

      <div>
        <label className="text-text-secondary text-sm block mb-1">Titre *</label>
        <input type="text" value={form.titre} onChange={(e) => updateField("titre", e.target.value)} className="input-field w-full" required />
      </div>

      <div>
        <label className="text-text-secondary text-sm block mb-1">Auteur / Artiste *</label>
        <input type="text" value={form.auteur_artiste} onChange={(e) => updateField("auteur_artiste", e.target.value)} className="input-field w-full" required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-text-secondary text-sm block mb-1">Type *</label>
          <select value={form.type} onChange={(e) => updateField("type", e.target.value)} className="input-field w-full">
            {types.map((t) => (<option key={t} value={t}>{t}</option>))}
          </select>
        </div>
        <div>
          <label className="text-text-secondary text-sm block mb-1">État *</label>
          <select value={form.etat} onChange={(e) => updateField("etat", e.target.value)} className="input-field w-full">
            {etats.map((e) => (<option key={e} value={e}>{e}</option>))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-text-secondary text-sm block mb-1">Catégorie</label>
          <input type="text" value={form.categorie} onChange={(e) => updateField("categorie", e.target.value)} className="input-field w-full" placeholder="Roman, Pop, Jazz..." />
        </div>
        <div>
          <label className="text-text-secondary text-sm block mb-1">Année</label>
          <input type="number" value={form.annee} onChange={(e) => updateField("annee", e.target.value)} className="input-field w-full" placeholder="2001" />
        </div>
      </div>

      <div>
        <label className="text-text-secondary text-sm block mb-1">Localisation</label>
        <input type="text" value={form.localisation} onChange={(e) => updateField("localisation", e.target.value)} className="input-field w-full" placeholder="Bureau étagère 1 gauche" />
      </div>

      <div>
        <label className="text-text-secondary text-sm block mb-1">Tags ({form.tags.length}/3)</label>
        <div className="flex gap-2">
          <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} className="input-field flex-1" placeholder="Ajouter un tag" disabled={form.tags.length >= 3} />
          <button type="button" onClick={addTag} className="btn-secondary" disabled={form.tags.length >= 3}>+</button>
        </div>
        {form.tags.length > 0 && (
          <div className="flex gap-1 mt-2">
            {form.tags.map((tag) => (
              <span key={tag} className="bg-background-light text-text-secondary text-xs px-2 py-1 rounded-lg border border-border flex items-center gap-1">
                {tag}
                <button type="button" onClick={() => removeTag(tag)} className="text-text-muted hover:text-error">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading} className="btn-primary flex-1 disabled:opacity-50">
          {loading ? "Enregistrement..." : "Enregistrer"}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">Annuler</button>
      </div>
    </form>
  );
}
