-- AlterTable: per-type template clauses
ALTER TABLE "ContractTemplateClause"
ADD COLUMN "contractType" "ContractType" NOT NULL DEFAULT 'NAVER_PLACE_MONTHLY_MANAGEMENT';

CREATE INDEX "ContractTemplateClause_contractType_idx" ON "ContractTemplateClause"("contractType");

-- AlterTable: optional guarantee-specific default contract purpose
ALTER TABLE "CompanySettings"
ADD COLUMN "defaultContractPurposeGuarantee" TEXT NOT NULL DEFAULT '';
