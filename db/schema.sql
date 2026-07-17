

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS guestbook_entries CASCADE;
DROP TABLE IF EXISTS saved_items CASCADE;
DROP TABLE IF EXISTS ratings CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS submissions CASCADE;
DROP TABLE IF EXISTS artworks CASCADE;
DROP TABLE IF EXISTS showrooms CASCADE;
DROP TABLE IF EXISTS artist_profiles CASCADE;
DROP TABLE IF EXISTS curator_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS user_account_status CASCADE;
DROP TYPE IF EXISTS artwork_status CASCADE;
DROP TYPE IF EXISTS showroom_status CASCADE;
DROP TYPE IF EXISTS submission_status CASCADE;
DROP TYPE IF EXISTS saved_item_type CASCADE;
DROP TYPE IF EXISTS report_item_type CASCADE;
DROP TYPE IF EXISTS report_status CASCADE;

CREATE TYPE user_role AS ENUM ('visitor', 'artist', 'curator', 'admin');
CREATE TYPE user_account_status AS ENUM ('pending', 'approved', 'suspended');
CREATE TYPE artwork_status AS ENUM ('available', 'sold', 'archived');
CREATE TYPE showroom_status AS ENUM ('active', 'archived');
CREATE TYPE submission_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE saved_item_type AS ENUM ('artwork', 'showroom', 'artist');
CREATE TYPE report_item_type AS ENUM ('artwork', 'comment', 'showroom');
CREATE TYPE report_status AS ENUM ('pending', 'resolved', 'dismissed');

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'visitor',
  status user_account_status NOT NULL DEFAULT 'approved',
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE artworks (
  id SERIAL PRIMARY KEY,
  artist_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  medium VARCHAR(150),
  dimensions VARCHAR(100),
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  image_url TEXT,
  status artwork_status NOT NULL DEFAULT 'available',
  style_tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE showrooms (
  id SERIAL PRIMARY KEY,
  curator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  theme VARCHAR(150) UNIQUE,
  concept_essay TEXT,
  mood_tags TEXT[] NOT NULL DEFAULT '{}',
  cover_image_url TEXT,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 20.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
  status showroom_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE submissions (
  id SERIAL PRIMARY KEY,
  artwork_id INTEGER NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  room_id INTEGER NOT NULL REFERENCES showrooms(id) ON DELETE CASCADE,
  status submission_status NOT NULL DEFAULT 'pending',
  curatorial_note TEXT,
  display_order INTEGER,
  submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  UNIQUE (artwork_id, room_id)
);
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  buyer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  artwork_id INTEGER NOT NULL REFERENCES artworks(id) ON DELETE RESTRICT,
  room_id INTEGER REFERENCES showrooms(id) ON DELETE RESTRICT,
  curator_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
  gross_price NUMERIC(10,2) NOT NULL,
  commission_rate NUMERIC(5,2) NOT NULL,
  commission_amount NUMERIC(10,2) NOT NULL,
  artist_net NUMERIC(10,2) NOT NULL,
  purchased_at TIMESTAMP NOT NULL DEFAULT NOW(),
  payment_data JSONB
);

CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  artwork_id INTEGER NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE ratings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  artwork_id INTEGER NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  score SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, artwork_id)
);

CREATE TABLE saved_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type saved_item_type NOT NULL,
  item_id INTEGER NOT NULL,
  saved_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, item_type, item_id)
);
CREATE TABLE guestbook_entries (
  id SERIAL PRIMARY KEY,
  room_id INTEGER NOT NULL REFERENCES showrooms(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE reports (
  id SERIAL PRIMARY KEY,
  reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type report_item_type NOT NULL,
  item_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status report_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP,
  resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (reporter_id, item_type, item_id)
);

CREATE INDEX idx_artworks_artist ON artworks(artist_id);
CREATE INDEX idx_artworks_status ON artworks(status);
CREATE INDEX idx_artworks_style_tags ON artworks USING GIN (style_tags);
CREATE INDEX idx_showrooms_curator ON showrooms(curator_id);
CREATE INDEX idx_showrooms_mood_tags ON showrooms USING GIN (mood_tags);
CREATE INDEX idx_submissions_room ON submissions(room_id);
CREATE INDEX idx_submissions_artwork ON submissions(artwork_id);
CREATE INDEX idx_orders_buyer ON orders(buyer_id);
CREATE INDEX idx_orders_curator ON orders(curator_id);
CREATE INDEX idx_orders_room ON orders(room_id);
CREATE INDEX idx_comments_artwork ON comments(artwork_id);
CREATE INDEX idx_ratings_artwork ON ratings(artwork_id);
CREATE INDEX idx_saved_items_user ON saved_items(user_id, item_type);
CREATE INDEX idx_guestbook_room ON guestbook_entries(room_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_item ON reports(item_type, item_id);
