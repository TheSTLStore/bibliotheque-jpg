export type ItemType = "Livre" | "CD" | "Vinyle";

export type ItemEtat = "Neuf" | "Très bon" | "Bon" | "Acceptable" | "Mauvais";

export type ItemStatus = "Disponible" | "Donné";

export interface Item {
  id: string;
  titre: string;
  auteur_artiste: string;
  type: ItemType;
  categorie: string | null;
  etat: ItemEtat;
  isbn_ean: string | null;
  tags: string[];
  annee: number | null;
  image_url: string | null;
  localisation: string | null;
  visible: boolean;
  valeur_estimee: number | null;
  status: ItemStatus;
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: string;
  item_id: string;
  prenom: string;
  created_at: string;
}

export interface ItemWithReservations extends Item {
  reservations: Reservation[];
}

export interface Session {
  id: string;
  prenom: string;
  token: string;
  created_at: string;
  expires_at: string;
}

export interface LookupResult {
  titre: string;
  auteur_artiste: string;
  annee: number | null;
  categorie: string | null;
  image_url: string | null;
}

export interface VisionResult {
  titre: string;
  auteur_artiste: string;
  type: ItemType;
  categorie: string | null;
  annee: number | null;
}

export interface EnrichResult {
  categorie: string | null;
  tags: string[];
  valeur_estimee: number | null;
}
