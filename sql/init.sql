-- Base schema (as used already) + pricing in NIS

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  schedule TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  capacity INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  selected_option TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_provider TEXT DEFAULT 'meshulam',
  payment_tx_id TEXT,
  payment_ref TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS class_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  option_code TEXT NOT NULL,
  option_label TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_class_option ON class_options(class_id, option_code);

CREATE TABLE IF NOT EXISTS payment_events (
  id BIGSERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  tx_id TEXT,
  raw_payload TEXT NOT NULL,
  received_at TIMESTAMP NOT NULL DEFAULT now(),
  approved BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_enrollments_class  ON enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_txid   ON enrollments(payment_tx_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_created ON enrollments(created_at);
