-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Contract" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contractNumber" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactTitle" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "businessNumber" TEXT,
    "address" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "vatIncluded" BOOLEAN NOT NULL DEFAULT true,
    "paymentTerms" TEXT,
    "specialTerms" TEXT,
    "internalMemo" TEXT,
    "contractPurpose" TEXT,
    "contractType" TEXT NOT NULL DEFAULT 'NAVER_PLACE_MONTHLY_MANAGEMENT',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "providerSignerName" TEXT,
    "providerSignerTitle" TEXT,
    "providerSignaturePath" TEXT,
    "providerSignedAt" DATETIME,
    "customerSignerName" TEXT,
    "customerSignerTitle" TEXT,
    "customerSignaturePath" TEXT,
    "customerSignedAt" DATETIME,
    "signedSnapshot" TEXT,
    "signedContentHash" TEXT,
    "lockedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Contract" ("address", "businessNumber", "companyName", "contactName", "contactTitle", "contractNumber", "contractPurpose", "contractType", "createdAt", "customerSignaturePath", "customerSignedAt", "customerSignerName", "customerSignerTitle", "email", "endDate", "id", "internalMemo", "lockedAt", "paymentTerms", "phone", "providerSignaturePath", "providerSignedAt", "providerSignerName", "providerSignerTitle", "signedContentHash", "signedSnapshot", "specialTerms", "startDate", "status", "totalAmount", "updatedAt", "vatIncluded") SELECT "address", "businessNumber", "companyName", "contactName", "contactTitle", "contractNumber", "contractPurpose", "contractType", "createdAt", "customerSignaturePath", "customerSignedAt", "customerSignerName", "customerSignerTitle", "email", "endDate", "id", "internalMemo", "lockedAt", "paymentTerms", "phone", "providerSignaturePath", "providerSignedAt", "providerSignerName", "providerSignerTitle", "signedContentHash", "signedSnapshot", "specialTerms", "startDate", "status", "totalAmount", "updatedAt", "vatIncluded" FROM "Contract";
DROP TABLE "Contract";
ALTER TABLE "new_Contract" RENAME TO "Contract";
CREATE UNIQUE INDEX "Contract_contractNumber_key" ON "Contract"("contractNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
