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
