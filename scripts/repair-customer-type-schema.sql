-- =============================================================================
-- REPAIR: CustomerType schema drift (idempotent, no data deletion)
-- =============================================================================
-- Run manually in Neon SQL Editor or psql AFTER reviewing.
-- DO NOT run prisma migrate reset.
--
-- Safe properties:
--   - Creates enum/columns only when missing
--   - Existing Contract rows get customerType = 'INDIVIDUAL' via DEFAULT
--   - corporateRegistrationNumber stays NULL for existing rows
--   - No DELETE / TRUNCATE / DROP TABLE
-- =============================================================================

BEGIN;

-- 1) CustomerType enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'CustomerType' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "CustomerType" AS ENUM (
      'INDIVIDUAL',
      'SOLE_PROPRIETOR',
      'CORPORATION'
    );
    RAISE NOTICE 'Created enum CustomerType';
  ELSE
    RAISE NOTICE 'Enum CustomerType already exists — skipped';
  END IF;
END
$$;

-- 2) Contract.customerType
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Contract'
      AND column_name = 'customerType'
  ) THEN
    ALTER TABLE "Contract"
      ADD COLUMN "customerType" "CustomerType" NOT NULL DEFAULT 'INDIVIDUAL';
    RAISE NOTICE 'Added column Contract.customerType';
  ELSE
    RAISE NOTICE 'Column Contract.customerType already exists — skipped';
  END IF;
END
$$;

-- 3) Contract.corporateRegistrationNumber
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Contract'
      AND column_name = 'corporateRegistrationNumber'
  ) THEN
    ALTER TABLE "Contract"
      ADD COLUMN "corporateRegistrationNumber" TEXT;
    RAISE NOTICE 'Added column Contract.corporateRegistrationNumber';
  ELSE
    RAISE NOTICE 'Column Contract.corporateRegistrationNumber already exists — skipped';
  END IF;
END
$$;

COMMIT;

-- =============================================================================
-- POST-REPAIR VERIFICATION (read-only)
-- =============================================================================
-- SELECT migration_name, finished_at FROM "_prisma_migrations" ORDER BY finished_at;
--
-- SELECT e.enumlabel
-- FROM pg_type t
-- JOIN pg_enum e ON t.oid = e.enumtypid
-- WHERE t.typname = 'CustomerType'
-- ORDER BY e.enumsortorder;
--
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'Contract'
--   AND column_name IN ('customerType', 'corporateRegistrationNumber', 'businessNumber');
