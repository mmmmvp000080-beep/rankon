-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('INDIVIDUAL', 'SOLE_PROPRIETOR', 'CORPORATION');

-- AlterTable
ALTER TABLE "Contract" ADD COLUMN "customerType" "CustomerType" NOT NULL DEFAULT 'INDIVIDUAL';
ALTER TABLE "Contract" ADD COLUMN "corporateRegistrationNumber" TEXT;
