-- Market v3: any signed-in member can open a shop and sell food they cook at home or sealed items bought in Singapore,
-- for meetup collection or seller delivery; buyers pay the seller at handover. QuinTaste never handles money and does not
-- pre-check sellers: automatic listing rules apply, and staff suspend or remove shops and items after reports.
-- Apply with the operations role after a backup, after community/schema.sql. Idempotent.
CREATE SCHEMA IF NOT EXISTS market;

-- v1 (individual pantry resale) tables are retired. Refuse to drop them if anyone has data in them.
DO $$
BEGIN
  IF to_regclass('market.thread') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM market.thread) OR EXISTS (SELECT 1 FROM market.listing) THEN
      RAISE EXCEPTION 'Market v1 tables contain rows; export and remove them before applying Market v2';
    END IF;
    DROP TABLE IF EXISTS market.message, market.thread, market.saved, market.photo, market.listing;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS market.seller (
  user_id text PRIMARY KEY REFERENCES public."user"(id) ON DELETE CASCADE,
  trading_name text NOT NULL DEFAULT '' CHECK (length(trading_name) <= 60),
  about text NOT NULL DEFAULT '' CHECK (length(about) <= 300),
  area text NOT NULL DEFAULT '' CHECK (length(area) <= 60),
  meetup boolean NOT NULL DEFAULT true,
  delivery boolean NOT NULL DEFAULT false,
  delivery_fee_cents integer NOT NULL DEFAULT 0 CHECK (delivery_fee_cents BETWEEN 0 AND 10000),
  delivery_areas text NOT NULL DEFAULT '' CHECK (length(delivery_areas) <= 160),
  pay_cash boolean NOT NULL DEFAULT true,
  pay_paynow boolean NOT NULL DEFAULT false,
  declarations_version integer NOT NULL DEFAULT 0,
  declared_at timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','suspended','removed')),
  status_note text NOT NULL DEFAULT '' CHECK (length(status_note) <= 300),
  opened_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- v2 to v3: staff verification (lanes, licence details, documents, checks) is retired. Refuse if any verification records exist.
DO $$
BEGIN
  -- Nested so a missing table is never referenced: PL/pgSQL prepares each condition as a whole.
  IF to_regclass('market.seller_document') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM market.seller_document) THEN
      RAISE EXCEPTION 'Market seller documents exist; export and remove them before applying Market v3';
    END IF;
    DROP TABLE market.seller_document;
  END IF;
  IF to_regclass('market.seller_check') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM market.seller_check) THEN
      RAISE EXCEPTION 'Market seller checks exist; export and remove them before applying Market v3';
    END IF;
    DROP TABLE market.seller_check;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='market' AND table_name='seller' AND column_name='approved_at') THEN
    ALTER TABLE market.seller RENAME COLUMN approved_at TO opened_at;
  END IF;
END $$;
ALTER TABLE market.seller DROP COLUMN IF EXISTS lane, DROP COLUMN IF EXISTS uen, DROP COLUMN IF EXISTS licence_number, DROP COLUMN IF EXISTS licence_type,
  DROP COLUMN IF EXISTS premises, DROP COLUMN IF EXISTS licence_expiry, DROP COLUMN IF EXISTS residence, DROP COLUMN IF EXISTS identity_checked_at,
  DROP COLUMN IF EXISTS licence_checked_at, DROP COLUMN IF EXISTS safe_grade, DROP COLUMN IF EXISTS licence_suspended, DROP COLUMN IF EXISTS course_checked_at,
  DROP COLUMN IF EXISTS next_check_due, DROP COLUMN IF EXISTS submitted_at;
-- Shops waiting for review, or open on older declarations, reopen when their owner accepts the current declarations.
-- Keep the number in step with declarationsVersion in server/market/rules.mjs (version 3).
UPDATE market.seller SET status='draft' WHERE status NOT IN ('draft','active','suspended','removed') OR (status='active' AND declarations_version < 3);
ALTER TABLE market.seller DROP CONSTRAINT IF EXISTS seller_status_check;
ALTER TABLE market.seller ADD CONSTRAINT seller_status_check CHECK (status IN ('draft','active','suspended','removed'));
CREATE INDEX IF NOT EXISTS market_seller_status ON market.seller(status, opened_at);

CREATE TABLE IF NOT EXISTS market.listing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id text NOT NULL REFERENCES market.seller(user_id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'made' CHECK (kind IN ('made','prepacked')),
  name text NOT NULL DEFAULT '' CHECK (length(name) <= 80),
  category text NOT NULL DEFAULT 'Bakes' CHECK (category IN ('Bakes','Kueh & sweets','Savoury','Frozen','Sauces & pantry','Drinks')),
  price_cents integer NOT NULL DEFAULT 0 CHECK (price_cents BETWEEN 0 AND 100000),
  portion text NOT NULL DEFAULT '' CHECK (length(portion) <= 40),
  description text NOT NULL DEFAULT '' CHECK (length(description) <= 500),
  ingredients text NOT NULL DEFAULT '' CHECK (length(ingredients) <= 5000),
  contains text[] NOT NULL DEFAULT '{}',
  may_contain text[] NOT NULL DEFAULT '{}',
  diets text[] NOT NULL DEFAULT '{}',
  storage text NOT NULL DEFAULT '' CHECK (length(storage) <= 200),
  date_mark date,
  lot text NOT NULL DEFAULT '' CHECK (length(lot) <= 40),
  lead_days integer NOT NULL DEFAULT 1 CHECK (lead_days BETWEEN 0 AND 30),
  max_per_order integer NOT NULL DEFAULT 5 CHECK (max_per_order BETWEEN 1 AND 10),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','removed')),
  removed_reason text NOT NULL DEFAULT '' CHECK (length(removed_reason) <= 300),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS market_listing_browse ON market.listing(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS market_listing_seller ON market.listing(seller_id, updated_at DESC);
CREATE TABLE IF NOT EXISTS market.photo (
  listing_id uuid NOT NULL REFERENCES market.listing(id) ON DELETE CASCADE,
  slot text NOT NULL CHECK (slot IN ('item','detail','label')),
  bytes bytea NOT NULL CHECK (octet_length(bytes) <= 600000),
  digest text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (listing_id, slot)
);
-- One limit for every shop: 10 per order (v2 licensed listings allowed 50).
UPDATE market.listing SET max_per_order=10 WHERE max_per_order > 10;
ALTER TABLE market.listing DROP CONSTRAINT IF EXISTS listing_max_per_order_check;
ALTER TABLE market.listing ADD CONSTRAINT listing_max_per_order_check CHECK (max_per_order BETWEEN 1 AND 10);
CREATE TABLE IF NOT EXISTS market.saved (
  user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES market.listing(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);
-- A collection window the seller opens; orders reserve its capacity.
CREATE TABLE IF NOT EXISTS market.slot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id text NOT NULL REFERENCES market.seller(user_id) ON DELETE CASCADE,
  starts timestamptz NOT NULL,
  ends timestamptz NOT NULL CHECK (ends > starts),
  mode text NOT NULL CHECK (mode IN ('meetup','delivery')),
  place text NOT NULL DEFAULT '' CHECK (length(place) <= 120),
  capacity integer NOT NULL CHECK (capacity BETWEEN 1 AND 20),
  cutoff_hours integer NOT NULL DEFAULT 24 CHECK (cutoff_hours BETWEEN 0 AND 336),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS market_slot_seller ON market.slot(seller_id, starts);
-- One limit for every shop: 20 orders per slot (v2 licensed slots allowed 100). Orders already booked stay booked.
UPDATE market.slot SET capacity=20 WHERE capacity > 20;
ALTER TABLE market.slot DROP CONSTRAINT IF EXISTS slot_capacity_check;
ALTER TABLE market.slot ADD CONSTRAINT slot_capacity_check CHECK (capacity BETWEEN 1 AND 20);
-- Orders outlive either account: the other party keeps the record (names are snapshots). A deleted buyer's contact details are cleared.
CREATE TABLE IF NOT EXISTS market."order" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id text REFERENCES public."user"(id) ON DELETE SET NULL,
  seller_id text REFERENCES market.seller(user_id) ON DELETE SET NULL,
  buyer_name text NOT NULL DEFAULT '' CHECK (length(buyer_name) <= 80),
  seller_name text NOT NULL DEFAULT '' CHECK (length(seller_name) <= 80),
  slot_id uuid REFERENCES market.slot(id) ON DELETE SET NULL,
  starts timestamptz NOT NULL,
  ends timestamptz NOT NULL,
  mode text NOT NULL CHECK (mode IN ('meetup','delivery')),
  place text NOT NULL DEFAULT '' CHECK (length(place) <= 120),
  address text NOT NULL DEFAULT '' CHECK (length(address) <= 200),
  contact text NOT NULL DEFAULT '' CHECK (length(contact) <= 40),
  note text NOT NULL DEFAULT '' CHECK (length(note) <= 300),
  subtotal_cents integer NOT NULL CHECK (subtotal_cents >= 0),
  delivery_fee_cents integer NOT NULL DEFAULT 0 CHECK (delivery_fee_cents >= 0),
  total_cents integer NOT NULL CHECK (total_cents >= 0),
  payment text NOT NULL DEFAULT 'cash' CHECK (payment IN ('cash','paynow')),
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','confirmed','ready','completed','declined','cancelled','no_show','disputed')),
  status_reason text NOT NULL DEFAULT '' CHECK (length(status_reason) <= 200),
  rating integer NOT NULL DEFAULT 0 CHECK (rating BETWEEN 0 AND 5),
  review text NOT NULL DEFAULT '' CHECK (length(review) <= 300),
  diet_matched boolean,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Upgrades the first v2 deployment, whose order rows were removed with either account.
ALTER TABLE market."order" ADD COLUMN IF NOT EXISTS buyer_name text NOT NULL DEFAULT '' CHECK (length(buyer_name) <= 80);
ALTER TABLE market."order" ADD COLUMN IF NOT EXISTS seller_name text NOT NULL DEFAULT '' CHECK (length(seller_name) <= 80);
ALTER TABLE market."order" ALTER COLUMN buyer_id DROP NOT NULL, ALTER COLUMN seller_id DROP NOT NULL;
ALTER TABLE market."order" DROP CONSTRAINT IF EXISTS order_buyer_id_fkey, DROP CONSTRAINT IF EXISTS order_seller_id_fkey;
ALTER TABLE market."order" ADD CONSTRAINT order_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public."user"(id) ON DELETE SET NULL,
  ADD CONSTRAINT order_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES market.seller(user_id) ON DELETE SET NULL;
-- When either side deletes their account the order is kept for the other side's records: the buyer's
-- contact details are erased and any order still open is cancelled.
CREATE OR REPLACE FUNCTION market.order_account_deleted() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.buyer_id IS NULL AND OLD.buyer_id IS NOT NULL THEN
    NEW.address := ''; NEW.contact := ''; NEW.note := ''; NEW.buyer_name := 'Deleted account';
  END IF;
  IF (NEW.buyer_id IS NULL OR NEW.seller_id IS NULL) AND NEW.status IN ('requested','confirmed','ready') THEN
    NEW.status := 'cancelled'; NEW.status_reason := 'The other person deleted their account.'; NEW.updated_at := now();
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS order_forget_buyer ON market."order";
DROP FUNCTION IF EXISTS market.forget_buyer();
DROP TRIGGER IF EXISTS order_account_deleted ON market."order";
CREATE TRIGGER order_account_deleted BEFORE UPDATE OF buyer_id, seller_id ON market."order" FOR EACH ROW EXECUTE FUNCTION market.order_account_deleted();
CREATE INDEX IF NOT EXISTS market_order_buyer ON market."order"(buyer_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS market_order_contact_expiry ON market."order"(updated_at) WHERE address <> '' OR contact <> '';
CREATE INDEX IF NOT EXISTS market_order_seller ON market."order"(seller_id, updated_at DESC);
DROP INDEX IF EXISTS market.market_order_slot;
CREATE INDEX IF NOT EXISTS market_order_slot_status ON market."order"(slot_id, status);
CREATE TABLE IF NOT EXISTS market.order_item (
  order_id uuid NOT NULL REFERENCES market."order"(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES market.listing(id) ON DELETE SET NULL,
  name text NOT NULL,
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 50),
  date_mark date,
  lot text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS market_order_item_order ON market.order_item(order_id);
CREATE INDEX IF NOT EXISTS market_order_item_listing ON market.order_item(listing_id);
-- One conversation per buyer and seller; order updates appear in it as system lines.
CREATE TABLE IF NOT EXISTS market.conversation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  seller_id text NOT NULL REFERENCES market.seller(user_id) ON DELETE CASCADE,
  buyer_read_at timestamptz NOT NULL DEFAULT to_timestamp(0),
  seller_read_at timestamptz NOT NULL DEFAULT to_timestamp(0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (buyer_id, seller_id)
);
CREATE INDEX IF NOT EXISTS market_conversation_seller ON market.conversation(seller_id, updated_at DESC);
CREATE TABLE IF NOT EXISTS market.message (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES market.conversation(id) ON DELETE CASCADE,
  sender_id text REFERENCES public."user"(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'text' CHECK (kind IN ('text','event')),
  order_id uuid REFERENCES market."order"(id) ON DELETE SET NULL,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS market_message_conversation ON market.message(conversation_id, created_at);

-- market: buying and ordering; market_sellers: opening shops and listing food.
INSERT INTO ops.control(key, enabled, notice) VALUES ('market', false, 'Market is coming soon.') ON CONFLICT DO NOTHING;
INSERT INTO ops.control(key, enabled, notice) VALUES ('market_sellers', false, '') ON CONFLICT DO NOTHING;
GRANT USAGE ON SCHEMA market TO quintaste_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA market TO quintaste_app;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'quintaste_admin') THEN
    GRANT USAGE ON SCHEMA market TO quintaste_admin;
    GRANT SELECT ON market.seller, market.listing, market.slot, market."order", market.order_item TO quintaste_admin;
    REVOKE UPDATE ON market.seller FROM quintaste_admin;
    GRANT UPDATE (status, status_note, updated_at) ON market.seller TO quintaste_admin;
    GRANT UPDATE (status, removed_reason, updated_at) ON market.listing TO quintaste_admin;
    GRANT UPDATE (status, status_reason, updated_at) ON market."order" TO quintaste_admin;
    GRANT SELECT, INSERT, UPDATE ON market.conversation TO quintaste_admin;
    GRANT INSERT ON market.message TO quintaste_admin;
    GRANT USAGE ON ALL SEQUENCES IN SCHEMA market TO quintaste_admin;
  END IF;
END $$;
