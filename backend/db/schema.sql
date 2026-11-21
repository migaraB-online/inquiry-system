CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  name          VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inquiries (
  id               SERIAL PRIMARY KEY,
  customer_name    VARCHAR(100) NOT NULL,
  customer_contact VARCHAR(255) NOT NULL,
  subject          VARCHAR(200) NOT NULL,
  description      TEXT NOT NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'New'
                   CHECK (status IN ('New', 'In Progress', 'Resolved')),
  owner_id         INTEGER NOT NULL REFERENCES users(id),
  created_at       TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ(3) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inquiries_owner ON inquiries(owner_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);