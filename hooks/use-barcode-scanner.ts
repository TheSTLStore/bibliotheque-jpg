"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface UseBarcodeScanner {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isActive: boolean;
  barcode: string | null;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

export function useBarcodeScanner(): UseBarcodeScanner {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [barcode, setBarcode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsActive(false);
  }, []);

  const start = useCallback(async () => {
    try {
      setError(null);
      setBarcode(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;
      // Set isActive FIRST so the <video> element renders
      setIsActive(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      if (msg.includes("NotAllowedError") || msg.includes("Permission")) {
        setError("Accès caméra refusé. Autorisez la caméra dans les paramètres du navigateur.");
      } else if (msg.includes("NotFoundError")) {
        setError("Aucune caméra détectée sur cet appareil.");
      } else {
        setError("Impossible d'accéder à la caméra : " + msg);
      }
    }
  }, []);

  const reset = useCallback(() => {
    setBarcode(null);
    setError(null);
  }, []);

  // Attach stream to video element once both are available
  useEffect(() => {
    if (isActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {
        // autoplay attribute handles it on mobile
      });
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive || barcode) return;

    let cancelled = false;

    async function detectLoop() {
      const hasNative = "BarcodeDetector" in window;

      if (hasNative) {
        const detector = new (window as any).BarcodeDetector({
          formats: ["ean_13", "ean_8"],
        });
        while (!cancelled && videoRef.current && !barcode) {
          try {
            const results = await detector.detect(videoRef.current);
            if (results.length > 0) {
              if (navigator.vibrate) navigator.vibrate(100);
              setBarcode(results[0].rawValue);
              return;
            }
          } catch {
            /* continue */
          }
          await new Promise((r) => setTimeout(r, 500));
        }
      } else {
        // zxing fallback
        const { BrowserMultiFormatReader } = await import("@zxing/library");
        const reader = new BrowserMultiFormatReader();
        try {
          const result = await reader.decodeFromVideoElement(
            videoRef.current!
          );
          if (result && !cancelled) {
            if (navigator.vibrate) navigator.vibrate(100);
            setBarcode(result.getText());
          }
        } catch {
          /* no barcode found */
        }
      }
    }

    detectLoop();
    return () => {
      cancelled = true;
    };
  }, [isActive, barcode]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { videoRef, isActive, barcode, error, start, stop, reset };
}
