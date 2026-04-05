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
            <a href={selectedPrenom ? `/api/admin/export?prenom=${encodeURIComponent(selectedPrenom)}` : "/api/admin/export"} className="btn-primary flex items-center gap-2 text-sm" download>
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
