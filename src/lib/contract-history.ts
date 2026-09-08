import { HistoryActorType } from "@/generated/prisma/client";
import { prisma } from "./prisma";

export async function addContractHistory(
  contractId: string,
  action: string,
  description: string,
  actorType: HistoryActorType = "ADMIN"
) {
  return prisma.contractHistory.create({
    data: { contractId, action, description, actorType },
  });
}

export function isContractLocked(status: string, lockedAt: Date | null): boolean {
  return status === "COMPLETED" || lockedAt !== null;
}
