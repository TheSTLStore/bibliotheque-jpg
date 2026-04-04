"use client";

interface AdminReservation {
  id: string;
  prenom: string;
  created_at: string;
  items: {
    id: string;
    titre: string;
    auteur_artiste: string;
    type: string;
    categorie: string | null;
    localisation: string | null;
  };
}

interface Props {
  reservations: AdminReservation[];
}

export function AdminReservationTable({ reservations }: Props) {
  if (reservations.length === 0) {
    return <p className="text-text-muted text-sm">Aucune réservation</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-text-secondary text-left">
            <th className="py-2 px-3">Titre</th>
            <th className="py-2 px-3">Auteur</th>
            <th className="py-2 px-3">Type</th>
            <th className="py-2 px-3">Catégorie</th>
            <th className="py-2 px-3">Localisation</th>
            <th className="py-2 px-3">Réservé par</th>
          </tr>
        </thead>
        <tbody>
          {reservations.map((r) => (
            <tr key={r.id} className="border-b border-border/50">
              <td className="py-2 px-3 text-text-primary">{r.items.titre}</td>
              <td className="py-2 px-3 text-text-secondary">{r.items.auteur_artiste}</td>
              <td className="py-2 px-3 text-text-secondary">{r.items.type}</td>
              <td className="py-2 px-3 text-text-secondary">{r.items.categorie || "—"}</td>
              <td className="py-2 px-3 text-accent">{r.items.localisation || "—"}</td>
              <td className="py-2 px-3 text-text-primary">{r.prenom}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
