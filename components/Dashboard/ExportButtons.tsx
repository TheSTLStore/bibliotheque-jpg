'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';

interface ExportButtonsProps {
  hasReservations: boolean;
}

export function ExportButtons({ hasReservations }: ExportButtonsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExportCSV = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/export?format=csv');

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de l\'export');
      }

      // Get the filename from Content-Disposition header
      const disposition = response.headers.get('Content-Disposition');
      let filename = 'reservations.csv';
      if (disposition) {
        const match = disposition.match(/filename="(.+)"/);
        if (match) {
          filename = match[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'export');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Exporter mes réservations
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Téléchargez la liste de vos réservations au format CSV (compatible Excel).
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          onClick={handleExportCSV}
          disabled={loading || !hasReservations}
          className="flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Export en cours...
            </>
          ) : (
            <>
              <FileSpreadsheet className="h-4 w-4" />
              Télécharger CSV
            </>
          )}
        </Button>
      </div>

      {!hasReservations && (
        <p className="text-sm text-gray-400">
          Vous devez avoir au moins une réservation pour pouvoir exporter.
        </p>
      )}

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
          <Download className="h-4 w-4" />
          À propos de l&apos;export
        </h4>
        <ul className="text-sm text-gray-500 space-y-1">
          <li>• Le fichier CSV contient toutes vos réservations actuelles</li>
          <li>• Le format est compatible avec Excel, Google Sheets et Numbers</li>
          <li>• Les colonnes incluent: Titre, Auteur, Type, État, Année, Tags</li>
        </ul>
      </div>
    </div>
  );
}
