import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/api-utils";
import { success, failure } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const companyName = searchParams.get("companyName") || "";
    const contractNumber = searchParams.get("contractNumber") || "";
    const category = searchParams.get("category") || "";

    const where: {
      category?: string;
      contract?: {
        companyName?: { contains: string };
        contractNumber?: { contains: string };
      };
    } = {};
    if (category) where.category = category;
    if (companyName || contractNumber) {
      where.contract = {
        ...(companyName ? { companyName: { contains: companyName } } : {}),
        ...(contractNumber ? { contractNumber: { contains: contractNumber } } : {}),
      };
    }

    const files = await prisma.uploadedFile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        category: true,
        originalName: true,
        fileSize: true,
        createdAt: true,
        contract: {
          select: { id: true, contractNumber: true, companyName: true },
        },
      },
    });

    return success({ files });
  } catch {
    return failure("파일 목록을 불러올 수 없습니다", 500);
  }
}
