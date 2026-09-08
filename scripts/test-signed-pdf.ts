import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

async function main() {
  const { prisma } = await import("../src/lib/prisma");
  const { generateSignedPdfFromSnapshot } = await import("../src/lib/pdf/pdf-service");

  const contract = await prisma.contract.findFirst({
    where: { status: "COMPLETED" },
    select: { id: true, status: true, contractNumber: true },
  });
  console.log("COMPLETED_CONTRACT", contract);
  if (!contract) return;

  const { buffer } = await generateSignedPdfFromSnapshot(contract.id);
  console.log("SIGNED_PDF_OK", buffer.length);
  await prisma.$disconnect();
}

main().catch(console.error);
