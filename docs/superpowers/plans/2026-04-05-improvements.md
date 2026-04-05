# Bibliothèque JPG V2.1 Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix image thumbnails (API priority + server re-upload), add item visibility with batch admin management, and add price estimation (Gemini + eBay).

**Architecture:** Modify existing scan flow to re-upload images server-side in the lookup route. Add `visible` and `valeur_estimee` columns to items. Rebuild admin page with 3 tabs (Stats, Articles, Reservations). New eBay Browse API client for price comparison.

**Tech Stack:** Next.js 14, Supabase, Gemini API, eBay Browse API, shadcn/ui Tabs

**Spec:** `docs/superpowers/specs/2026-04-05-improvements-design.md`

---

## File Structure

```
Modified:
├── supabase/schema.sql                              # Add visible + valeur_estimee columns
├── types/index.ts                                   # Add visible + valeur_estimee to Item
├── app/api/scan/lookup/route.ts                     # Re-upload external images server-side
├── app/api/items/route.ts                           # Filter visible=true, add valeur_estimee to POST
├── app/api/public/[slug]/items/route.ts             # Filter visible=true
├── app/(authenticated)/scanner/page.tsx             # Remove auto-capture, simplify image flow
├── components/ScannerView.tsx                       # Revert to simple barcode callback
├── components/ItemForm.tsx                          # Add photo capture button when no image
├── lib/gemini.ts                                    # Add valeur_estimee to enrichWithAI
├── app/api/scan/enrich/route.ts                     # Return valeur_estimee
├── app/(authenticated)/admin/page.tsx               # 3-tab layout with articles tab
├── .env.example                                     # Add EBAY_APP_ID, EBAY_CERT_ID

New:
├── lib/ebay.ts                                      # eBay Browse API client
├── app/api/admin/items/route.ts                     # GET all items for admin
├── app/api/admin/items/[id]/route.ts                # PATCH/DELETE single item
├── app/api/admin/items/batch/route.ts               # Batch actions
├── app/api/admin/ebay-search/route.ts               # eBay search proxy
├── app/api/admin/estimate/route.ts                  # Gemini re-estimate
├── components/AdminItemsTab.tsx                     # Articles tab with list + batch
├── components/AdminItemEditModal.tsx                 # Edit modal for single item
├── components/AdminBatchBar.tsx                      # Batch action bar
├── components/EbayResults.tsx                        # eBay results display
```

---

## Task 1: DB Schema + Types Update

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `types/index.ts`

- [ ] **Step 1: Update SQL schema file**

Add at the end of `supabase/schema.sql`:

```sql
-- V2.1: Visibility and price estimation
ALTER TABLE items ADD COLUMN visible BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE items ADD COLUMN valeur_estimee DECIMAL;
```

- [ ] **Step 2: Run migration in Supabase**

Go to Supabase SQL Editor and run:

```sql
ALTER TABLE items ADD COLUMN visible BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE items ADD COLUMN valeur_estimee DECIMAL;
```

- [ ] **Step 3: Update TypeScript types**

In `types/index.ts`, add to the `Item` interface after `localisation`:

```typescript
  visible: boolean;
  valeur_estimee: number | null;
```

Also update `EnrichResult` — add to `types/index.ts`:

```typescript
export interface EnrichResult {
  categorie: string | null;
  tags: string[];
  valeur_estimee: number | null;
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add supabase/schema.sql types/index.ts
git commit -m "feat: add visible and valeur_estimee columns to items schema and types"
```

---

## Task 2: Image Re-upload in Lookup Route

**Files:**
- Modify: `app/api/scan/lookup/route.ts`

- [ ] **Step 1: Rewrite lookup route with server-side image re-upload**

Replace `app/api/scan/lookup/route.ts` entirely:

```typescript
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
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add app/api/scan/lookup/route.ts
git commit -m "feat: re-upload external images to Supabase in lookup route"
```

---

## Task 3: Simplify Scanner Flow + Photo Capture in Form

**Files:**
- Modify: `components/ScannerView.tsx`
- Modify: `app/(authenticated)/scanner/page.tsx`
- Modify: `components/ItemForm.tsx`

- [ ] **Step 1: Revert ScannerView to simple barcode callback**

Replace `components/ScannerView.tsx`:

```tsx
"use client";

import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import { Camera, ImagePlus } from "lucide-react";
import { useRef, useEffect } from "react";

interface ScannerViewProps {
  onBarcodeDetected: (barcode: string) => void;
  onPhotoCapture: (base64: string) => void;
}

export function ScannerView({ onBarcodeDetected, onPhotoCapture }: ScannerViewProps) {
  const { videoRef, isActive, barcode, error, start, stop, reset } = useBarcodeScanner();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (barcode) {
      onBarcodeDetected(barcode);
      reset();
    }
  }, [barcode, onBarcodeDetected, reset]);

  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const base64 = canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
    stop();
    onPhotoCapture(base64);
  }

  return (
    <div className="relative">
      {!isActive ? (
        <div className="flex flex-col items-center gap-4 py-12">
          <button onClick={start} className="btn-primary flex items-center gap-2">
            <Camera size={20} />
            Ouvrir la caméra
          </button>
        </div>
      ) : (
        <div className="relative">
          <video ref={videoRef as React.RefObject<HTMLVideoElement>} className="w-full rounded-lg" autoPlay playsInline muted />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-40 border-2 border-accent rounded-lg opacity-50" />
          </div>
          <div className="flex gap-3 mt-3 justify-center">
            <button onClick={capturePhoto} className="btn-primary flex items-center gap-2">
              <ImagePlus size={16} />
              Photo (IA)
            </button>
            <button onClick={stop} className="btn-secondary">
              Fermer
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-error text-sm text-center mt-2">{error}</p>}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
```

- [ ] **Step 2: Simplify scanner page**

Replace `app/(authenticated)/scanner/page.tsx`:

```tsx
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
          valeur_estimee: enriched.valeur_estimee,
        };
      }
    } catch { /* ignore */ }
    return metadata;
  }

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
        let data = await res.json();
        data = { ...data, isbn_ean: barcode };

        setStatusMessage("Enrichissement IA (catégorie, tags, estimation)...");
        data = await enrichMetadata(data);

        setLookupData(data);
        setStep("form");
      } else {
        setStep("scan");
        toast.error("Code-barre non trouvé. Essaie de prendre une photo.");
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
        setStatusMessage("Enrichissement IA (tags, estimation)...");
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

  async function handleCaptureForForm(base64: string): Promise<string> {
    const res = await fetch("/api/scan/vision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64, uploadOnly: true }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.image_url;
    }
    throw new Error("Upload échoué");
  }

  async function handleSubmit(formData: ItemFormData) {
    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...formData,
        annee: formData.annee ? parseInt(formData.annee, 10) : null,
        valeur_estimee: formData.valeur_estimee ? parseFloat(formData.valeur_estimee) : null,
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
          onCapturePhoto={handleCaptureForForm}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add photo capture and valeur_estimee to ItemForm**

Replace `components/ItemForm.tsx`:

```tsx
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
      // Wait for video element to render
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch {
      // Camera not available
    }
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

    // Stop camera
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setCapturing(false);

    // Upload
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
      {/* Image or capture */}
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

      {/* Estimation */}
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
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add components/ScannerView.tsx components/ItemForm.tsx "app/(authenticated)/scanner/page.tsx"
git commit -m "feat: prioritize API images, add photo capture in form when no image available"
```

---

## Task 4: Visibility Filter + Gemini Price Estimation

**Files:**
- Modify: `app/api/items/route.ts`
- Modify: `app/api/public/[slug]/items/route.ts`
- Modify: `lib/gemini.ts`
- Modify: `app/api/scan/enrich/route.ts`

- [ ] **Step 1: Add visible filter to items API**

In `app/api/items/route.ts`, add `.eq("visible", true)` to the GET query. Also add `valeur_estimee` to POST insert. Also strip `visible` from public response alongside `localisation`.

Replace `app/api/items/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type");
  const search = searchParams.get("search");
  const categorie = searchParams.get("categorie");

  let query = supabase
    .from("items")
    .select(`
      *,
      reservations (id, prenom, created_at)
    `)
    .eq("visible", true)
    .order("created_at", { ascending: false });

  if (type) query = query.eq("type", type);
  if (categorie) query = query.eq("categorie", categorie);
  if (search) query = query.or(`titre.ilike.%${search}%,auteur_artiste.ilike.%${search}%`);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Strip admin-only fields from public response
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const items = (data || []).map(({ localisation, visible, valeur_estimee, ...item }: Record<string, unknown>) => item);

  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("items")
    .insert({
      titre: body.titre,
      auteur_artiste: body.auteur_artiste,
      type: body.type,
      categorie: body.categorie || null,
      etat: body.etat,
      isbn_ean: body.isbn_ean || null,
      tags: body.tags || [],
      annee: body.annee || null,
      image_url: body.image_url || null,
      localisation: body.localisation || null,
      valeur_estimee: body.valeur_estimee || null,
      visible: false,
      status: "Disponible",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
```

- [ ] **Step 2: Add visible filter to association items API**

In `app/api/public/[slug]/items/route.ts`, the query already filters `.eq("status", "Disponible")`. Add `.eq("visible", true)` right after it. Read the file first, then add the line.

- [ ] **Step 3: Add valeur_estimee to Gemini enrichment**

In `lib/gemini.ts`, update the `EnrichResult` interface and `enrichWithAI` function:

Replace the `EnrichResult` interface and `enrichWithAI` function:

```typescript
export interface EnrichResult {
  categorie: string | null;
  tags: string[];
  valeur_estimee: number | null;
}

export async function enrichWithAI(metadata: {
  titre: string;
  auteur_artiste: string;
  type: string;
  categorie?: string | null;
}): Promise<EnrichResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  const prompt = `Tu es un expert en classification et estimation de livres, CDs et vinyles d'occasion.
Voici un objet :
- Titre : ${metadata.titre}
- Auteur/Artiste : ${metadata.auteur_artiste}
- Type : ${metadata.type}
${metadata.categorie ? `- Catégorie existante : ${metadata.categorie}` : ""}

Retourne UNIQUEMENT un JSON valide avec :
{
  "categorie": "genre principal le plus précis (ex: Roman policier, Jazz vocal, Rock progressif, Bande dessinée, Science-fiction, Classique baroque, etc.)",
  "tags": ["tag1", "tag2", "tag3"],
  "valeur_estimee": 5.00
}
- Les tags doivent être des mots-clés utiles pour filtrer/retrouver l'objet (ex: "poche", "collector", "français", "anglais", "jeunesse", "rare", "coffret", "première édition", etc.). Maximum 3 tags.
- valeur_estimee : estimation du prix de revente d'occasion en euros (nombre décimal). Base-toi sur les prix typiques du marché français d'occasion.
Ne retourne rien d'autre que le JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ text: prompt }],
    });

    const text = response.text?.trim();
    if (!text) return { categorie: metadata.categorie || null, tags: [], valeur_estimee: null };

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { categorie: metadata.categorie || null, tags: [], valeur_estimee: null };

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      categorie: parsed.categorie || metadata.categorie || null,
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 3) : [],
      valeur_estimee: typeof parsed.valeur_estimee === "number" ? parsed.valeur_estimee : null,
    };
  } catch {
    return { categorie: metadata.categorie || null, tags: [], valeur_estimee: null };
  }
}
```

- [ ] **Step 4: Update enrich API route to return valeur_estimee**

Replace `app/api/scan/enrich/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { enrichWithAI } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  const { titre, auteur_artiste, type, categorie } = await request.json();

  if (!titre) {
    return NextResponse.json({ error: "Titre requis" }, { status: 400 });
  }

  const result = await enrichWithAI({ titre, auteur_artiste, type, categorie });

  return NextResponse.json(result);
}
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add app/api/items/route.ts "app/api/public/[slug]/items/route.ts" lib/gemini.ts app/api/scan/enrich/route.ts
git commit -m "feat: filter visible items in gallery, add Gemini price estimation to enrichment"
```

---

## Task 5: Admin API Routes (Items CRUD + Batch)

**Files:**
- Create: `app/api/admin/items/route.ts`
- Create: `app/api/admin/items/[id]/route.ts`
- Create: `app/api/admin/items/batch/route.ts`
- Create: `app/api/admin/estimate/route.ts`

- [ ] **Step 1: Create admin items list route**

Create `app/api/admin/items/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type");
  const search = searchParams.get("search");
  const visible = searchParams.get("visible");

  let query = supabase
    .from("items")
    .select(`*, reservations (id, prenom, created_at)`)
    .order("created_at", { ascending: false });

  if (type) query = query.eq("type", type);
  if (visible === "true") query = query.eq("visible", true);
  if (visible === "false") query = query.eq("visible", false);
  if (search) query = query.or(`titre.ilike.%${search}%,auteur_artiste.ilike.%${search}%`);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
```

- [ ] **Step 2: Create admin item PATCH/DELETE route**

Create `app/api/admin/items/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = await params;
  const body = await request.json();
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("items")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { error } = await supabase.from("items").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Create batch action route**

Create `app/api/admin/items/batch/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  const { ids, action, value } = await request.json();

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "IDs requis" }, { status: 400 });
  }

  const supabase = createServerClient();
  let updateData: Record<string, unknown> = {};

  switch (action) {
    case "show":
      updateData = { visible: true };
      break;
    case "hide":
      updateData = { visible: false };
      break;
    case "localisation":
      if (!value) return NextResponse.json({ error: "Valeur requise" }, { status: 400 });
      updateData = { localisation: value };
      break;
    case "etat":
      if (!value) return NextResponse.json({ error: "Valeur requise" }, { status: 400 });
      updateData = { etat: value };
      break;
    default:
      return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  }

  const { error } = await supabase
    .from("items")
    .update(updateData)
    .in("id", ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updated: ids.length });
}
```

- [ ] **Step 4: Create Gemini re-estimate route**

Create `app/api/admin/estimate/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { enrichWithAI } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  const { titre, auteur_artiste, type, etat } = await request.json();

  if (!titre) {
    return NextResponse.json({ error: "Titre requis" }, { status: 400 });
  }

  const result = await enrichWithAI({ titre, auteur_artiste, type });

  return NextResponse.json({ valeur_estimee: result.valeur_estimee });
}
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add app/api/admin/items/ app/api/admin/estimate/
git commit -m "feat: admin API routes for items CRUD, batch actions, and price re-estimation"
```

---

## Task 6: eBay Browse API Client + Route

**Files:**
- Create: `lib/ebay.ts`
- Create: `app/api/admin/ebay-search/route.ts`
- Modify: `.env.example`

- [ ] **Step 1: Create eBay client**

Create `lib/ebay.ts`:

```typescript
export interface EbayResult {
  titre: string;
  prix: string;
  lien: string;
  image: string | null;
}

async function getEbayAccessToken(): Promise<string> {
  const appId = process.env.EBAY_APP_ID;
  const certId = process.env.EBAY_CERT_ID;

  if (!appId || !certId) {
    throw new Error("eBay credentials not configured");
  }

  const credentials = Buffer.from(`${appId}:${certId}`).toString("base64");

  const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: "grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope",
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`eBay auth failed: ${res.status}`);
  }

  const data = await res.json();
  return data.access_token;
}

export async function searchEbay(
  query: string,
  isbn?: string | null
): Promise<EbayResult[]> {
  const token = await getEbayAccessToken();

  const searchQuery = isbn ? isbn : query;
  const params = new URLSearchParams({
    q: searchQuery,
    limit: "5",
    filter: "buyingOptions:{FIXED_PRICE}",
  });

  const res = await fetch(
    `https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_FR",
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!res.ok) return [];

  const data = await res.json();

  return (data.itemSummaries || []).slice(0, 5).map((item: Record<string, unknown>) => ({
    titre: (item.title as string) || "",
    prix: item.price
      ? `${(item.price as Record<string, string>).value} ${(item.price as Record<string, string>).currency}`
      : "N/A",
    lien: (item.itemWebUrl as string) || "",
    image: item.image ? (item.image as Record<string, string>).imageUrl : null,
  }));
}
```

- [ ] **Step 2: Create eBay search route**

Create `app/api/admin/ebay-search/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { searchEbay } from "@/lib/ebay";

export async function POST(request: NextRequest) {
  const { titre, auteur_artiste, isbn_ean, type } = await request.json();

  if (!titre) {
    return NextResponse.json({ error: "Titre requis" }, { status: 400 });
  }

  try {
    const query = `${titre} ${auteur_artiste || ""} ${type || ""}`.trim();
    const results = await searchEbay(query, isbn_ean);
    return NextResponse.json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur eBay";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Update .env.example**

Add to `.env.example`:

```env
# eBay Browse API (optional, for price comparison in admin)
EBAY_APP_ID=xxx
EBAY_CERT_ID=xxx
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add lib/ebay.ts app/api/admin/ebay-search/ .env.example
git commit -m "feat: eBay Browse API client and search route for price comparison"
```

---

## Task 7: Admin Page — 3 Tabs + Articles Tab Components

**Files:**
- Create: `components/AdminBatchBar.tsx`
- Create: `components/EbayResults.tsx`
- Create: `components/AdminItemEditModal.tsx`
- Create: `components/AdminItemsTab.tsx`
- Modify: `app/(authenticated)/admin/page.tsx`

This is the largest task. The subagent should create all 4 new components, then rewrite the admin page with 3 tabs.

- [ ] **Step 1: Create AdminBatchBar**

Create `components/AdminBatchBar.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Eye, EyeOff, MapPin, Star } from "lucide-react";
import { ItemEtat } from "@/types";

interface AdminBatchBarProps {
  selectedCount: number;
  onBatchAction: (action: string, value?: string) => Promise<void>;
}

const etats: ItemEtat[] = ["Neuf", "Très bon", "Bon", "Acceptable", "Mauvais"];

export function AdminBatchBar({ selectedCount, onBatchAction }: AdminBatchBarProps) {
  const [showLocInput, setShowLocInput] = useState(false);
  const [showEtatSelect, setShowEtatSelect] = useState(false);
  const [locValue, setLocValue] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAction(action: string, value?: string) {
    setLoading(true);
    await onBatchAction(action, value);
    setShowLocInput(false);
    setShowEtatSelect(false);
    setLocValue("");
    setLoading(false);
  }

  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-0 z-10 bg-background-light border border-border rounded-lg p-3 mb-4 flex flex-wrap gap-2 items-center">
      <span className="text-text-secondary text-sm font-semibold">{selectedCount} sélectionné(s)</span>

      <button onClick={() => handleAction("show")} disabled={loading} className="btn-primary text-xs flex items-center gap-1">
        <Eye size={12} /> Rendre visible
      </button>

      <button onClick={() => handleAction("hide")} disabled={loading} className="btn-secondary text-xs flex items-center gap-1">
        <EyeOff size={12} /> Masquer
      </button>

      {showLocInput ? (
        <div className="flex gap-1 items-center">
          <input type="text" value={locValue} onChange={(e) => setLocValue(e.target.value)} className="input-field text-xs py-1 w-48" placeholder="Localisation..." autoFocus />
          <button onClick={() => handleAction("localisation", locValue)} disabled={loading || !locValue} className="btn-primary text-xs">OK</button>
          <button onClick={() => setShowLocInput(false)} className="btn-secondary text-xs">×</button>
        </div>
      ) : (
        <button onClick={() => setShowLocInput(true)} className="btn-secondary text-xs flex items-center gap-1">
          <MapPin size={12} /> Localisation
        </button>
      )}

      {showEtatSelect ? (
        <div className="flex gap-1 items-center">
          <select onChange={(e) => { if (e.target.value) handleAction("etat", e.target.value); }} className="input-field text-xs py-1" defaultValue="">
            <option value="" disabled>Choisir...</option>
            {etats.map((e) => (<option key={e} value={e}>{e}</option>))}
          </select>
          <button onClick={() => setShowEtatSelect(false)} className="btn-secondary text-xs">×</button>
        </div>
      ) : (
        <button onClick={() => setShowEtatSelect(true)} className="btn-secondary text-xs flex items-center gap-1">
          <Star size={12} /> État
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create EbayResults**

Create `components/EbayResults.tsx`:

```tsx
"use client";

interface EbayResult {
  titre: string;
  prix: string;
  lien: string;
  image: string | null;
}

interface EbayResultsProps {
  results: EbayResult[];
  loading: boolean;
}

export function EbayResults({ results, loading }: EbayResultsProps) {
  if (loading) {
    return <p className="text-text-muted text-xs">Recherche eBay...</p>;
  }

  if (results.length === 0) {
    return <p className="text-text-muted text-xs">Aucun résultat eBay</p>;
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-text-secondary">Résultats eBay</h4>
      {results.map((r, i) => (
        <a
          key={i}
          href={r.lien}
          target="_blank"
          rel="noopener noreferrer"
          className="flex gap-2 items-center p-2 bg-background rounded-lg border border-border hover:border-border-light text-xs"
        >
          {r.image && (
            <img src={r.image} alt="" className="w-10 h-10 object-cover rounded" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-text-primary truncate">{r.titre}</p>
            <p className="text-accent font-semibold">{r.prix}</p>
          </div>
        </a>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create AdminItemEditModal**

Create `components/AdminItemEditModal.tsx`:

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EbayResults } from "@/components/EbayResults";
import { Item, ItemType, ItemEtat } from "@/types";
import { Trash2, RefreshCw, Search } from "lucide-react";

const types: ItemType[] = ["Livre", "CD", "Vinyle"];
const etats: ItemEtat[] = ["Neuf", "Très bon", "Bon", "Acceptable", "Mauvais"];

interface AdminItemEditModalProps {
  item: Item | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, data: Partial<Item>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

interface EbayResult { titre: string; prix: string; lien: string; image: string | null; }

export function AdminItemEditModal({ item, open, onClose, onSave, onDelete }: AdminItemEditModalProps) {
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [ebayResults, setEbayResults] = useState<EbayResult[]>([]);
  const [ebayLoading, setEbayLoading] = useState(false);

  // Reset form when item changes
  if (item && Object.keys(form).length === 0) {
    // Will be set on first render via useEffect pattern
  }

  function getField<T>(field: string, fallback: T): T {
    if (field in form) return form[field] as T;
    if (item) return (item as Record<string, unknown>)[field] as T ?? fallback;
    return fallback;
  }

  function setField(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!item) return;
    setLoading(true);
    await onSave(item.id, {
      titre: getField("titre", ""),
      auteur_artiste: getField("auteur_artiste", ""),
      type: getField("type", "Livre") as ItemType,
      categorie: getField("categorie", null),
      etat: getField("etat", "Bon") as ItemEtat,
      annee: getField("annee", null),
      localisation: getField("localisation", null),
      tags: getField("tags", []),
      visible: getField("visible", false),
      valeur_estimee: getField("valeur_estimee", null),
    });
    setForm({});
    setLoading(false);
    onClose();
  }

  async function handleDelete() {
    if (!item || !confirm("Supprimer cet objet ?")) return;
    await onDelete(item.id);
    setForm({});
    onClose();
  }

  async function handleReEstimate() {
    if (!item) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titre: getField("titre", item.titre),
          auteur_artiste: getField("auteur_artiste", item.auteur_artiste),
          type: getField("type", item.type),
          etat: getField("etat", item.etat),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setField("valeur_estimee", data.valeur_estimee);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function handleEbaySearch() {
    if (!item) return;
    setEbayLoading(true);
    try {
      const res = await fetch("/api/admin/ebay-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titre: item.titre,
          auteur_artiste: item.auteur_artiste,
          isbn_ean: item.isbn_ean,
          type: item.type,
        }),
      });
      if (res.ok) {
        setEbayResults(await res.json());
      }
    } catch { /* ignore */ }
    setEbayLoading(false);
  }

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={() => { setForm({}); setEbayResults([]); onClose(); }}>
      <DialogContent className="bg-background-card border-border text-text-primary max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-accent">Modifier — {item.titre}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left: Form */}
          <div className="space-y-3">
            {item.image_url && (
              <div className="relative w-24 h-32 rounded-lg overflow-hidden">
                <Image src={item.image_url} alt={item.titre} fill className="object-cover" />
              </div>
            )}

            <div>
              <label className="text-text-secondary text-xs block mb-1">Titre</label>
              <input type="text" value={getField("titre", item.titre)} onChange={(e) => setField("titre", e.target.value)} className="input-field w-full text-sm" />
            </div>
            <div>
              <label className="text-text-secondary text-xs block mb-1">Auteur/Artiste</label>
              <input type="text" value={getField("auteur_artiste", item.auteur_artiste)} onChange={(e) => setField("auteur_artiste", e.target.value)} className="input-field w-full text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-text-secondary text-xs block mb-1">Type</label>
                <select value={getField("type", item.type)} onChange={(e) => setField("type", e.target.value)} className="input-field w-full text-sm">
                  {types.map((t) => (<option key={t} value={t}>{t}</option>))}
                </select>
              </div>
              <div>
                <label className="text-text-secondary text-xs block mb-1">État</label>
                <select value={getField("etat", item.etat)} onChange={(e) => setField("etat", e.target.value)} className="input-field w-full text-sm">
                  {etats.map((e) => (<option key={e} value={e}>{e}</option>))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-text-secondary text-xs block mb-1">Catégorie</label>
                <input type="text" value={getField("categorie", item.categorie || "")} onChange={(e) => setField("categorie", e.target.value)} className="input-field w-full text-sm" />
              </div>
              <div>
                <label className="text-text-secondary text-xs block mb-1">Année</label>
                <input type="number" value={getField("annee", item.annee || "")} onChange={(e) => setField("annee", e.target.value ? parseInt(e.target.value) : null)} className="input-field w-full text-sm" />
              </div>
            </div>
            <div>
              <label className="text-text-secondary text-xs block mb-1">Localisation</label>
              <input type="text" value={getField("localisation", item.localisation || "")} onChange={(e) => setField("localisation", e.target.value)} className="input-field w-full text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="visible" checked={getField("visible", item.visible)} onChange={(e) => setField("visible", e.target.checked)} />
              <label htmlFor="visible" className="text-text-secondary text-sm">Visible dans la galerie</label>
            </div>
          </div>

          {/* Right: Estimation + eBay */}
          <div className="space-y-4">
            <div>
              <label className="text-text-secondary text-xs block mb-1">Estimation (€)</label>
              <div className="flex gap-2 items-center">
                <input type="number" step="0.01" value={getField("valeur_estimee", item.valeur_estimee || "")} onChange={(e) => setField("valeur_estimee", e.target.value ? parseFloat(e.target.value) : null)} className="input-field flex-1 text-sm" placeholder="0.00" />
                <button type="button" onClick={handleReEstimate} disabled={loading} className="btn-secondary text-xs flex items-center gap-1" title="Recalculer avec IA">
                  <RefreshCw size={12} />
                </button>
              </div>
            </div>

            <button type="button" onClick={handleEbaySearch} disabled={ebayLoading} className="btn-secondary w-full text-xs flex items-center justify-center gap-1">
              <Search size={12} />
              {ebayLoading ? "Recherche..." : "Rechercher sur eBay"}
            </button>

            <EbayResults results={ebayResults} loading={ebayLoading} />
          </div>
        </div>

        <div className="flex gap-2 mt-4 pt-3 border-t border-border">
          <button onClick={handleSave} disabled={loading} className="btn-primary flex-1 disabled:opacity-50">
            {loading ? "..." : "Enregistrer"}
          </button>
          <button onClick={handleDelete} className="btn-secondary text-error flex items-center gap-1">
            <Trash2 size={14} /> Supprimer
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Create AdminItemsTab**

Create `components/AdminItemsTab.tsx`:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { AdminBatchBar } from "@/components/AdminBatchBar";
import { AdminItemEditModal } from "@/components/AdminItemEditModal";
import { Item, ItemType } from "@/types";
import { BookOpen, Disc, Disc3, Eye, EyeOff, Search } from "lucide-react";

const typeIcons: Record<string, typeof BookOpen> = { Livre: BookOpen, CD: Disc, Vinyle: Disc3 };

export function AdminItemsTab() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [visibleFilter, setVisibleFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editItem, setEditItem] = useState<Item | null>(null);

  const fetchItems = useCallback(async () => {
    const params = new URLSearchParams();
    if (typeFilter) params.set("type", typeFilter);
    if (visibleFilter !== "all") params.set("visible", visibleFilter);
    if (search) params.set("search", search);

    const res = await fetch(`/api/admin/items?${params}`);
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }, [typeFilter, visibleFilter, search]);

  useEffect(() => {
    const t = setTimeout(fetchItems, 300);
    return () => clearTimeout(t);
  }, [fetchItems]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((i) => i.id)));
    }
  }

  async function handleBatchAction(action: string, value?: string) {
    const res = await fetch("/api/admin/items/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected), action, value }),
    });
    if (res.ok) {
      setSelected(new Set());
      fetchItems();
    }
  }

  async function handleSave(id: string, data: Partial<Item>) {
    await fetch(`/api/admin/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    fetchItems();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/items/${id}`, { method: "DELETE" });
    fetchItems();
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="input-field w-full pl-8 text-sm" placeholder="Rechercher..." />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input-field text-sm">
          <option value="">Tous types</option>
          <option value="Livre">Livres</option>
          <option value="CD">CDs</option>
          <option value="Vinyle">Vinyles</option>
        </select>
        <select value={visibleFilter} onChange={(e) => setVisibleFilter(e.target.value)} className="input-field text-sm">
          <option value="all">Tous</option>
          <option value="true">Visibles</option>
          <option value="false">Masqués</option>
        </select>
      </div>

      {/* Batch bar */}
      <AdminBatchBar selectedCount={selected.size} onBatchAction={handleBatchAction} />

      {/* Items table */}
      {loading ? (
        <p className="text-text-muted text-center py-8">Chargement...</p>
      ) : items.length === 0 ? (
        <p className="text-text-muted text-center py-8">Aucun article</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-text-secondary text-left">
                <th className="py-2 px-2">
                  <input type="checkbox" checked={selected.size === items.length && items.length > 0} onChange={toggleSelectAll} />
                </th>
                <th className="py-2 px-2"></th>
                <th className="py-2 px-2">Titre</th>
                <th className="py-2 px-2">Auteur</th>
                <th className="py-2 px-2">Type</th>
                <th className="py-2 px-2">État</th>
                <th className="py-2 px-2">Estim.</th>
                <th className="py-2 px-2">Localisation</th>
                <th className="py-2 px-2">Visible</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const Icon = typeIcons[item.type] || BookOpen;
                return (
                  <tr key={item.id} className="border-b border-border/50 hover:bg-background-light/50 cursor-pointer" onClick={() => setEditItem(item)}>
                    <td className="py-2 px-2" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} />
                    </td>
                    <td className="py-2 px-2">
                      <div className="w-8 h-10 bg-background rounded overflow-hidden relative flex-shrink-0">
                        {item.image_url ? (
                          <Image src={item.image_url} alt="" fill className="object-cover" sizes="32px" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Icon size={14} className="text-text-muted" /></div>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-text-primary max-w-[200px] truncate">{item.titre}</td>
                    <td className="py-2 px-2 text-text-secondary max-w-[150px] truncate">{item.auteur_artiste}</td>
                    <td className="py-2 px-2 text-text-secondary">{item.type}</td>
                    <td className="py-2 px-2 text-text-secondary">{item.etat}</td>
                    <td className="py-2 px-2 text-accent">{item.valeur_estimee ? `${Number(item.valeur_estimee).toFixed(0)}€` : "—"}</td>
                    <td className="py-2 px-2 text-text-secondary max-w-[150px] truncate">{item.localisation || "—"}</td>
                    <td className="py-2 px-2">
                      {item.visible ? <Eye size={14} className="text-success" /> : <EyeOff size={14} className="text-text-muted" />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AdminItemEditModal
        item={editItem}
        open={!!editItem}
        onClose={() => setEditItem(null)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}
```

- [ ] **Step 5: Rewrite admin page with 3 tabs**

Replace `app/(authenticated)/admin/page.tsx`:

```tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminReservationTable } from "@/components/AdminReservationTable";
import { AdminItemsTab } from "@/components/AdminItemsTab";
import { Download, BarChart3, Users, Package, BookOpen } from "lucide-react";

interface Stats {
  totalItems: number;
  byType: { Livre: number; CD: number; Vinyle: number };
  byStatus: { Disponible: number; Donné: number };
  totalReservations: number;
  uniqueReservers: string[];
}

export default function AdminPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-text-secondary">Chargement...</p></div>}>
      <AdminPage />
    </Suspense>
  );
}

function AdminPage() {
  const [adminAuth, setAdminAuth] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [reservations, setReservations] = useState<any[]>([]);
  const [selectedPrenom, setSelectedPrenom] = useState<string>("");

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setAdminAuth(true);
    } else {
      setAuthError("Mot de passe admin incorrect");
    }
  }

  async function fetchStats() {
    const res = await fetch("/api/admin/stats");
    if (res.ok) setStats(await res.json());
  }

  async function fetchReservations(prenom?: string) {
    const params = prenom ? `?prenom=${encodeURIComponent(prenom)}` : "";
    const res = await fetch(`/api/admin/reservations${params}`);
    if (res.ok) setReservations(await res.json());
  }

  useEffect(() => {
    if (adminAuth) {
      fetchStats();
      fetchReservations();
    }
  }, [adminAuth]);

  useEffect(() => {
    if (adminAuth) {
      fetchReservations(selectedPrenom || undefined);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPrenom]);

  if (!adminAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card w-full max-w-sm">
          <h1 className="text-xl font-bold text-accent mb-4">Admin</h1>
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field w-full" placeholder="Mot de passe admin" required />
            {authError && <p className="text-error text-sm">{authError}</p>}
            <button type="submit" className="btn-primary w-full">Connexion admin</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 max-w-6xl mx-auto">
      <h1 className="text-xl font-bold text-accent mb-6">Panel Admin</h1>

      <Tabs defaultValue="stats" className="w-full">
        <TabsList className="bg-background-light border border-border mb-6">
          <TabsTrigger value="stats" className="data-[state=active]:bg-accent data-[state=active]:text-background flex items-center gap-1">
            <BarChart3 size={14} /> Stats
          </TabsTrigger>
          <TabsTrigger value="articles" className="data-[state=active]:bg-accent data-[state=active]:text-background flex items-center gap-1">
            <Package size={14} /> Articles
          </TabsTrigger>
          <TabsTrigger value="reservations" className="data-[state=active]:bg-accent data-[state=active]:text-background flex items-center gap-1">
            <BookOpen size={14} /> Réservations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stats">
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="card text-center">
                <BarChart3 size={20} className="text-accent mx-auto mb-1" />
                <div className="text-2xl font-bold text-text-primary">{stats.totalItems}</div>
                <div className="text-xs text-text-secondary">Total objets</div>
              </div>
              <div className="card text-center">
                <div className="text-lg font-bold text-text-primary">{stats.byType.Livre} / {stats.byType.CD} / {stats.byType.Vinyle}</div>
                <div className="text-xs text-text-secondary">Livres / CDs / Vinyles</div>
              </div>
              <div className="card text-center">
                <Users size={20} className="text-accent mx-auto mb-1" />
                <div className="text-2xl font-bold text-text-primary">{stats.totalReservations}</div>
                <div className="text-xs text-text-secondary">Réservations</div>
              </div>
              <div className="card text-center">
                <div className="text-2xl font-bold text-text-primary">{stats.byStatus.Disponible}</div>
                <div className="text-xs text-text-secondary">Disponibles</div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="articles">
          <AdminItemsTab />
        </TabsContent>

        <TabsContent value="reservations">
          <div className="flex flex-wrap gap-3 items-center mb-4">
            <select value={selectedPrenom} onChange={(e) => setSelectedPrenom(e.target.value)} className="input-field">
              <option value="">Toutes les réservations</option>
              {stats?.uniqueReservers.map((p) => (<option key={p} value={p}>{p}</option>))}
            </select>
            <a
              href={selectedPrenom ? `/api/admin/export?prenom=${encodeURIComponent(selectedPrenom)}` : "/api/admin/export"}
              className="btn-primary flex items-center gap-2 text-sm"
              download
            >
              <Download size={14} />
              Export CSV {selectedPrenom ? `(${selectedPrenom})` : "(global)"}
            </a>
          </div>
          <AdminReservationTable reservations={reservations} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 6: Verify build**

```bash
npm run build
```

- [ ] **Step 7: Commit**

```bash
git add components/AdminBatchBar.tsx components/EbayResults.tsx components/AdminItemEditModal.tsx components/AdminItemsTab.tsx "app/(authenticated)/admin/page.tsx"
git commit -m "feat: admin page with 3 tabs, articles management, batch actions, edit modal, eBay search"
```

---

## Summary of Tasks

| # | Task | Key Deliverable |
|---|------|----------------|
| 1 | DB Schema + Types | Add `visible` and `valeur_estimee` columns |
| 2 | Image Re-upload in Lookup | Server-side re-upload of external images |
| 3 | Scanner Flow + Form Photo | API image priority, photo capture in form |
| 4 | Visibility + Gemini Estimation | Filter visible items, price estimation in enrichment |
| 5 | Admin API Routes | Items CRUD, batch actions, re-estimation |
| 6 | eBay Client + Route | eBay Browse API for price comparison |
| 7 | Admin UI Components | 3-tab admin with articles, batch bar, edit modal, eBay results |
