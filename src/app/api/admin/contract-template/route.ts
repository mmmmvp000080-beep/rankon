import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/api-utils";
import { success, failure } from "@/lib/api-response";
import { ensureTemplateClausesInDb, buildTemplatePreview } from "@/lib/contract-template";
import { logServerError } from "@/lib/prisma-error";
import { parseContractTypeQuery, normalizeContractType, isContractType } from "@/lib/contract-type";
import { CONTRACT_TYPE_TITLES } from "@/lib/constants";
import { z } from "zod";

const contractTypeField = z.enum(["NAVER_PLACE_MONTHLY_MANAGEMENT", "NAVER_PLACE_MONTHLY_GUARANTEE"]);

const createClauseSchema = z.object({
  contractType: contractTypeField.default("NAVER_PLACE_MONTHLY_MANAGEMENT"),
  title: z.string().min(1, "조항 제목을 입력하세요"),
  content: z.string().min(1, "조항 내용을 입력하세요"),
});

const updateClauseSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const reorderSchema = z.object({
  contractType: contractTypeField,
  items: z.array(z.object({ id: z.string(), sortOrder: z.number().int().min(0) })).min(1),
});

function resolveContractType(request: NextRequest, bodyType?: string) {
  const fromQuery = parseContractTypeQuery(new URL(request.url).searchParams.get("contractType"));
  if (fromQuery) return fromQuery;
  if (bodyType && isContractType(bodyType)) return bodyType;
  return null;
}

export async function GET(request: NextRequest) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const contractType = resolveContractType(request);
  if (!contractType) {
    return failure("contractType 쿼리가 필요합니다 (NAVER_PLACE_MONTHLY_MANAGEMENT | NAVER_PLACE_MONTHLY_GUARANTEE)", 400);
  }

  try {
    const preview = await buildTemplatePreview(contractType);
    const clauses = await prisma.contractTemplateClause.findMany({
      where: { contractType },
      orderBy: { sortOrder: "asc" },
    });

    return success({
      contractType,
      contractTypeLabel: preview.contractTypeLabel,
      contractTitle: CONTRACT_TYPE_TITLES[contractType],
      templateVersion: preview.templateVersion,
      defaultPurpose: preview.defaultPurpose,
      defaultSpecialTerms: preview.defaultSpecialTerms,
      clauses,
    });
  } catch (err) {
    const detail = logServerError("Contract Template GET Failed", err);
    return failure("계약 템플릿을 불러올 수 없습니다", 500, detail);
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = createClauseSchema.safeParse(body);
    if (!parsed.success) {
      return failure(parsed.error.issues[0]?.message || "입력값이 올바르지 않습니다");
    }

    const contractType = normalizeContractType(parsed.data.contractType);
    const maxOrder = await prisma.contractTemplateClause.aggregate({
      where: { contractType },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const clause = await prisma.contractTemplateClause.create({
      data: {
        contractType,
        title: parsed.data.title,
        content: parsed.data.content,
        sortOrder,
        isActive: true,
      },
    });
    return success({ clause }, 201);
  } catch (err) {
    const detail = logServerError("Contract Template POST Failed", err);
    return failure("조항 추가 중 오류가 발생했습니다", 500, detail);
  }
}

export async function PATCH(request: NextRequest) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const body = await request.json();

    if (body.items) {
      const parsed = reorderSchema.safeParse(body);
      if (!parsed.success) {
        return failure(parsed.error.issues[0]?.message || "입력값이 올바르지 않습니다");
      }
      const contractType = normalizeContractType(parsed.data.contractType);
      await prisma.$transaction(
        parsed.data.items.map((item) =>
          prisma.contractTemplateClause.updateMany({
            where: { id: item.id, contractType },
            data: { sortOrder: item.sortOrder },
          })
        )
      );
      const clauses = await prisma.contractTemplateClause.findMany({
        where: { contractType },
        orderBy: { sortOrder: "asc" },
      });
      return success({ clauses });
    }

    const parsed = updateClauseSchema.safeParse(body);
    if (!parsed.success) {
      return failure(parsed.error.issues[0]?.message || "입력값이 올바르지 않습니다");
    }

    const { id, ...data } = parsed.data;
    const existing = await prisma.contractTemplateClause.findUnique({ where: { id } });
    if (!existing) return failure("조항을 찾을 수 없습니다", 404);

    const clause = await prisma.contractTemplateClause.update({ where: { id }, data });
    return success({ clause });
  } catch (err) {
    const detail = logServerError("Contract Template PATCH Failed", err);
    return failure("조항 수정 중 오류가 발생했습니다", 500, detail);
  }
}

export async function DELETE(request: NextRequest) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const params = new URL(request.url).searchParams;
    const id = params.get("id");
    const contractType = parseContractTypeQuery(params.get("contractType"));
    if (!id) return failure("조항 ID가 필요합니다");
    if (!contractType) return failure("contractType 쿼리가 필요합니다");

    const deleted = await prisma.contractTemplateClause.deleteMany({
      where: { id, contractType },
    });
    if (deleted.count === 0) return failure("조항을 찾을 수 없습니다", 404);

    return success({ deleted: true });
  } catch (err) {
    const detail = logServerError("Contract Template DELETE Failed", err);
    return failure("조항 삭제 중 오류가 발생했습니다", 500, detail);
  }
}
