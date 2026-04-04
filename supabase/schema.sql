-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Item type enum
CREATE TYPE item_type AS ENUM ('Livre', 'CD', 'Vinyle');

-- Item condition enum
CREATE TYPE item_etat AS ENUM ('Neuf', 'Très bon', 'Bon', 'Acceptable', 'Mauvais');

-- Item status enum
CREATE TYPE item_status AS ENUM ('Disponible', 'Donné');

-- Items table
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titre TEXT NOT NULL,
  auteur_artiste TEXT NOT NULL,
  type item_type NOT NULL,
  categorie TEXT,
  etat item_etat NOT NULL,
  isbn_ean TEXT,
  tags TEXT[] DEFAULT '{}',
  annee INTEGER,
  image_url TEXT,
  localisation TEXT,
  status item_status NOT NULL DEFAULT 'Disponible',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reservations table
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  prenom TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(item_id, prenom)
);

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prenom TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Auto-update updated_at on items
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX idx_items_type ON items(type);
CREATE INDEX idx_items_status ON items(status);
CREATE INDEX idx_reservations_item_id ON reservations(item_id);
CREATE INDEX idx_reservations_prenom ON reservations(prenom);
CREATE INDEX idx_sessions_token ON sessions(token);

-- Supabase Storage bucket (run this in Supabase dashboard SQL editor)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('item-images', 'item-images', true);
