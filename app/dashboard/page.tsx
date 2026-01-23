'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ReservationList } from '@/components/Dashboard/ReservationList';
import { OptionsList } from '@/components/Dashboard/OptionsList';
import { ExportButtons } from '@/components/Dashboard/ExportButtons';
import { HeritageItem } from '@/types';
import { ArrowLeft, BookOpen, User, Loader2, AlertCircle, Bookmark, Clock, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DashboardData {
  reservations: HeritageItem[];
  options: Array<HeritageItem & { position: number }>;
  reservationsWithOptions: HeritageItem[];
}

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [data, setData] = useState<DashboardData>({
    reservations: [],
    options: [],
    reservationsWithOptions: [],
  });

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check');
        const authData = await response.json();

        if (!authData.authenticated || authData.user?.type !== 'family') {
          router.push('/');
          return;
        }

        setUserName(authData.user.name);
      } catch {
        router.push('/');
      }
    };

    checkAuth();
  }, [router]);

  // Fetch dashboard data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/dashboard');

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/');
          return;
        }
        throw new Error('Erreur lors du chargement des données');
      }

      const dashboardData: DashboardData = await response.json();
      setData(dashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (userName) {
      fetchData();
    }
  }, [userName, fetchData]);

  // Handle cancel reservation
  const handleCancelReservation = async (itemId: string) => {
    try {
      const response = await fetch(`/api/items/${itemId}/cancel`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de l'annulation");
      }

      const result = await response.json();

      // Show toast for promotion
      if (result.promotedUser) {
        toast({
          title: 'Réservation annulée',
          description: `${result.promotedUser} a été promu(e) à la réservation.`,
        });
      } else {
        toast({
          title: 'Réservation annulée',
          description: "L'objet est à nouveau disponible.",
        });
      }

      // Refresh data
      await fetchData();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : "Erreur lors de l'annulation",
        variant: 'destructive',
      });
    }
  };

  // Handle remove option
  const handleRemoveOption = async (itemId: string) => {
    try {
      const response = await fetch(`/api/items/${itemId}/option`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors du retrait de l'option");
      }

      toast({
        title: 'Option retirée',
        description: 'Votre option a été retirée de la file d\'attente.',
      });

      // Refresh data
      await fetchData();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : "Erreur lors du retrait",
        variant: 'destructive',
      });
    }
  };

  if (loading && !userName) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <BookOpen className="h-8 w-8 text-orange-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Mon tableau de bord
                </h1>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{userName}</span>
              </div>
              <Link href="/gallery">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour à la galerie
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
            <p className="text-red-700 font-medium">{error}</p>
            <Button
              onClick={fetchData}
              variant="outline"
              className="mt-4"
            >
              Réessayer
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="reservations" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="reservations" className="flex items-center gap-2">
                <Bookmark className="h-4 w-4" />
                <span className="hidden sm:inline">Mes réservations</span>
                <span className="sm:hidden">Réservations</span>
                {data.reservations.length > 0 && (
                  <span className="ml-1 bg-orange-100 text-orange-700 text-xs font-medium px-2 py-0.5 rounded-full">
                    {data.reservations.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="options" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Mes options</span>
                <span className="sm:hidden">Options</span>
                {data.options.length > 0 && (
                  <span className="ml-1 bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                    {data.options.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="export" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Exports</span>
                <span className="sm:hidden">Export</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="reservations" className="mt-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                </div>
              ) : (
                <ReservationList
                  reservations={data.reservations}
                  onCancel={handleCancelReservation}
                />
              )}
            </TabsContent>

            <TabsContent value="options" className="mt-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                </div>
              ) : (
                <OptionsList
                  options={data.options}
                  onRemove={handleRemoveOption}
                />
              )}
            </TabsContent>

            <TabsContent value="export" className="mt-0">
              <ExportButtons hasReservations={data.reservations.length > 0} />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
