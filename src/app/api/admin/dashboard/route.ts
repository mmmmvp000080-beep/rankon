import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/api-utils";
import { success, failure } from "@/lib/api-response";
import { logServerError } from "@/lib/prisma-error";

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const [statusGroups, recentContracts, contractsWithoutFiles] = await Promise.all([
      prisma.contract.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      prisma.contract.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          contractNumber: true,
          companyName: true,
          status: true,
          totalAmount: true,
          createdAt: true,
        },
      }),
      prisma.contract.count({
        where: { uploadedFiles: { none: {} } },
      }),
    ]);

    const countByStatus = Object.fromEntries(
      statusGroups.map((row) => [row.status, row._count.id])
    ) as Record<string, number>;
    const total = statusGroups.reduce((sum, row) => sum + row._count.id, 0);

    return success({
      stats: {
        total,
        draft: countByStatus.DRAFT ?? 0,
        customerPending: countByStatus.CUSTOMER_PENDING ?? 0,
        completed: countByStatus.COMPLETED ?? 0,
        contractsWithoutFiles,
      },
      recentContracts,
    });
  } catch (err) {
    const detail = logServerError("Dashboard Failed", err);
    return failure("대시보드 데이터를 불러올 수 없습니다", 500, detail);
  }
}
