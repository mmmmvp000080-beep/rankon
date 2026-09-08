import { prisma } from "@/lib/prisma";

function canLoadClauses() {
  return "contractClause" in prisma && Boolean(prisma.contractClause);
}

const contractShareInclude = {
  contract: {
    include: {
      items: { orderBy: { sortOrder: "asc" as const } },
      ...(canLoadClauses() ? { clauses: { orderBy: { sortOrder: "asc" as const } } } : {}),
    },
  },
} as const;

export async function loadContractClauses(contractId: string) {
  if (!canLoadClauses()) {
    console.warn("[loadContractClauses] contractClause delegate unavailable");
    return [];
  }
  return prisma.contractClause.findMany({
    where: { contractId },
    orderBy: { sortOrder: "asc" },
  });
}

export async function loadContractWithItemsAndClauses(contractId: string) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      ...(canLoadClauses() ? { clauses: { orderBy: { sortOrder: "asc" } } } : {}),
    },
  });
  if (!contract) return null;
  if ("clauses" in contract && Array.isArray(contract.clauses)) {
    return contract;
  }
  const clauses = await loadContractClauses(contractId);
  return { ...contract, clauses };
}

export async function loadAdminContractDetail(contractId: string) {
  const includeGenerated = "generatedPdf" in prisma && Boolean(prisma.generatedPdf);
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      ...(canLoadClauses() ? { clauses: { orderBy: { sortOrder: "asc" } } } : {}),
      shareTokens: true,
      uploadedFiles: { orderBy: { createdAt: "desc" } },
      ...(includeGenerated ? { generatedPdfs: { orderBy: { createdAt: "desc" as const } } } : {}),
      history: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!contract) return null;

  const withClauses =
    "clauses" in contract && Array.isArray(contract.clauses)
      ? contract
      : { ...contract, clauses: await loadContractClauses(contractId) };

  if ("generatedPdfs" in withClauses && Array.isArray(withClauses.generatedPdfs)) {
    return withClauses;
  }
  return { ...withClauses, generatedPdfs: [] };
}

/** Active CONTRACT_SIGN token — used by customer contract page and shared PDF APIs. */
export async function loadActiveContractShareToken(token: string) {
  const shareToken = await prisma.shareToken.findUnique({
    where: { token },
    include: contractShareInclude,
  });

  if (!shareToken?.contract) return null;
  if (shareToken.type !== "CONTRACT_SIGN" || !shareToken.isActive) return null;
  if (shareToken.expiresAt && shareToken.expiresAt <= new Date()) return null;

  const contract = shareToken.contract as typeof shareToken.contract & { clauses?: unknown[] };
  if (Array.isArray(contract.clauses)) {
    return { ...shareToken, contract };
  }

  const clauses = await loadContractClauses(shareToken.contract.id);
  return {
    ...shareToken,
    contract: { ...shareToken.contract, clauses },
  };
}

/** Lookup by token value (any active state) — signing API, legacy callers. */
export async function loadShareTokenContract(token: string) {
  const shareToken = await prisma.shareToken.findUnique({
    where: { token },
    include: contractShareInclude,
  });
  if (!shareToken?.contract) return shareToken ?? null;
  const contract = shareToken.contract as typeof shareToken.contract & { clauses?: unknown[] };
  if (Array.isArray(contract.clauses)) {
    return { ...shareToken, contract };
  }
  const clauses = await loadContractClauses(shareToken.contract.id);
  return {
    ...shareToken,
    contract: { ...shareToken.contract, clauses },
  };
}
