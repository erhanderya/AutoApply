-- Optional Postgres init script for docker-entrypoint-initdb.d mounts.
-- Keeps initialization idempotent.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
