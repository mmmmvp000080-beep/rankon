import { prisma } from "./prisma";

export async function generateContractNumber(): Promise<string> {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const datePart = `${y}${m}${d}`;
  const prefix = `RANKON-${datePart}-`;

  const last = await prisma.contract.findFirst({
    where: { contractNumber: { startsWith: prefix } },
    orderBy: { contractNumber: "desc" },
    select: { contractNumber: true },
  });

  let nextNum = 1;
  if (last) {
    const parts = last.contractNumber.split("-");
    const lastNum = parseInt(parts[2] || "0", 10);
    nextNum = lastNum + 1;
  }

  const contractNumber = `${prefix}${String(nextNum).padStart(4, "0")}`;

  const exists = await prisma.contract.findUnique({ where: { contractNumber } });
  if (exists) {
    return generateContractNumber();
  }

  return contractNumber;
}
