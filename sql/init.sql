-- Optional reference (already created in your project)
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users
-- CREATE TABLE IF NOT EXISTS users (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   email TEXT UNIQUE NOT NULL,
--   phone TEXT,
--   password_hash TEXT NOT NULL,
--   role TEXT NOT NULL DEFAULT 'admin',
--   created_at TIMESTAMP NOT NULL DEFAULT now()
-- );

-- Classes, class_options, enrollments similar to previous scripts.
