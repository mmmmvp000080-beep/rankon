import { ContractType } from "@/generated/prisma/client";
import { prisma } from "./prisma";
import { DEFAULT_CONTRACT_TYPE, normalizeContractType } from "./contract-type";
import { CONTRACT_TYPE_LABELS } from "./constants";
import {
  containsLegacyProviderBrand,
  displayProviderCompanyInText,
  PROVIDER_COMPANY_DISPLAY_NAME,
} from "./provider-company-display";

export interface ClauseInput {
  title: string;
  content: string;
  sortOrder: number;
}

export const COMMON_TEMPLATE_CLAUSES: ClauseInput[] = [
  {
    title: "계약 목적",
    content:
      "본 계약은 광고주와 랭크온이 네이버 플레이스 마케팅 서비스를 진행하기 위한 계약으로, 서비스 범위와 계약 기간, 비용, 양측의 권리와 의무를 정하는 것을 목적으로 합니다.",
    sortOrder: 0,
  },
  {
    title: "계약기간",
    content:
      "계약기간은 계약서에 기재된 시작일부터 종료일까지로 합니다.\n\n계약 종료 전 별도 의사표시가 없는 경우 양측 협의 후 연장할 수 있습니다.",
    sortOrder: 1,
  },
  {
    title: "서비스 내용",
    content:
      "계약서에 선택된 상품에 따라 서비스를 제공합니다.\n\n■ 월관리\n- 네이버 플레이스 관리\n- 플레이스 최적화\n- 플레이스 운영 관리\n- 리뷰 관리\n- 이미지 관리\n- 게시글 관리\n- 플레이스 품질 개선\n\n■ 월 순위보장\n- 계약서에 기재된 키워드 기준\n- 네이버 플레이스 상위 5위 진입을 목표로 진행\n- 계약서에 명시된 조건에 따라 서비스를 제공합니다.",
    sortOrder: 2,
  },
  {
    title: "계약금액",
    content:
      "계약금액은 계약서에 기재된 금액을 기준으로 합니다.\n\n부가세 포함 여부도 계약서에 표시합니다.",
    sortOrder: 3,
  },
  {
    title: "고객 협조사항",
    content:
      "서비스 진행을 위해 고객은 아래 자료를 제공합니다.\n\n- 사업자등록증\n- 플레이스 정보\n- 연락 가능한 담당자\n- 필요한 자료\n\n자료 제공이 지연될 경우 서비스 일정은 조정될 수 있습니다.",
    sortOrder: 4,
  },
  {
    title: "회사의 의무",
    content:
      "회사는 계약된 범위 내에서 성실하게 업무를 수행합니다.\n\n고객의 정보를 계약 목적 외 사용하지 않습니다.",
    sortOrder: 5,
  },
  {
    title: "계약 해지",
    content:
      "계약 해지가 필요한 경우 양측은 협의 후 진행합니다.\n\n이미 진행된 업무는 실제 진행 범위에 따라 정산합니다.",
    sortOrder: 6,
  },
  {
    title: "전자계약 및 전자서명",
    content:
      "본 계약은 전자문서로 작성되며 전자서명을 통해 계약이 체결됩니다.\n\n양측이 전자서명을 완료한 계약서는 전자문서 형태로 안전하게 보관됩니다.\n\n전자문서 및 전자서명은 관계 법령에 따라 계약 체결의 증빙자료로 사용됩니다.\n\n서명 완료 후 계약 내용은 변경되지 않으며, 변경이 필요한 경우 새로운 계약 또는 변경 계약서를 작성합니다.",
    sortOrder: 7,
  },
  {
    title: "분쟁 해결",
    content:
      "계약과 관련된 문제가 발생할 경우 양측은 우선 협의를 통해 해결하도록 노력합니다.\n\n협의가 어려운 경우에는 관계 법령에 따라 해결합니다.",
    sortOrder: 8,
  },
  {
    title: "특약사항",
    content:
      "계약별 추가 조건은 특약사항에 작성하며 특약사항은 본 계약과 동일한 효력을 가집니다.",
    sortOrder: 9,
  },
];

export const PRODUCT_ADDON_CLAUSES: Record<ContractType, ClauseInput> = {
  NAVER_PLACE_MONTHLY_MANAGEMENT: {
    title: "상품 안내 (월관리)",
    content:
      "본 상품은 네이버 플레이스를 지속적으로 관리하는 서비스입니다.\n\n특정 순위 또는 노출 결과를 보장하는 상품이 아닙니다.",
    sortOrder: 10,
  },
  NAVER_PLACE_MONTHLY_GUARANTEE: {
    title: "상품 안내 (월 순위보장)",
    content:
      "본 상품은 계약서에 기재된 키워드를 기준으로 네이버 플레이스 상위 5위 진입을 목표로 진행합니다.\n\n보장 기준 및 적용 조건은 계약서에 기재된 내용을 따릅니다.\n\n계약서에 기재된 보장 조건을 충족한 경우 계약된 비용을 지급합니다.",
    sortOrder: 10,
  },
};

/** @deprecated use COMMON_TEMPLATE_CLAUSES */
export const DEFAULT_TEMPLATE_CLAUSES = COMMON_TEMPLATE_CLAUSES;

function fallbackClauses(contractType: ContractType): ClauseInput[] {
  return [...COMMON_TEMPLATE_CLAUSES, PRODUCT_ADDON_CLAUSES[contractType]];
}

function findClauseContent(clauses: ClauseInput[], title: string): string | null {
  const match = clauses.find((c) => c.title === title);
  return match?.content ?? null;
}

export async function getActiveTemplateClauses(
  contractType: ContractType = DEFAULT_CONTRACT_TYPE
): Promise<ClauseInput[]> {
  const type = normalizeContractType(contractType);
  try {
    if (!("contractTemplateClause" in prisma) || !prisma.contractTemplateClause) {
      console.warn("[getActiveTemplateClauses] contractTemplateClause delegate unavailable, using defaults");
      return fallbackClauses(type);
    }
    const templates = await prisma.contractTemplateClause.findMany({
      where: { isActive: true, contractType: type },
      orderBy: { sortOrder: "asc" },
    });
    if (templates.length > 0) {
      return templates.map(({ title, content, sortOrder }) => ({ title, content, sortOrder }));
    }
    return fallbackClauses(type);
  } catch (err) {
    console.error("[getActiveTemplateClauses] error:", err);
    return fallbackClauses(type);
  }
}

export async function getTemplateVersion(
  contractType: ContractType = DEFAULT_CONTRACT_TYPE
): Promise<string> {
  const type = normalizeContractType(contractType);
  try {
    const latest = await prisma.contractTemplateClause.findFirst({
      where: { contractType: type, isActive: true },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });
    return latest?.updatedAt.toISOString() ?? "default";
  } catch {
    return "default";
  }
}

export async function getDefaultContractPurpose(
  contractType: ContractType = DEFAULT_CONTRACT_TYPE,
  preloadedClauses?: ClauseInput[]
): Promise<string> {
  const type = normalizeContractType(contractType);
  const clauses = preloadedClauses ?? (await getActiveTemplateClauses(type));
  const fromClause = findClauseContent(clauses, "계약 목적");
  if (fromClause) return fromClause;

  try {
    const settings = await prisma.companySettings.findFirst();
    if (type === "NAVER_PLACE_MONTHLY_GUARANTEE") {
      return settings?.defaultContractPurposeGuarantee || settings?.defaultContractPurpose || COMMON_TEMPLATE_CLAUSES[0].content;
    }
    return settings?.defaultContractPurpose || COMMON_TEMPLATE_CLAUSES[0].content;
  } catch {
    return COMMON_TEMPLATE_CLAUSES[0].content;
  }
}

export function getDefaultSpecialTermsPlaceholder(clauses: ClauseInput[]): string {
  return findClauseContent(clauses, "특약사항") ?? "";
}

export async function copyTemplateClausesToContract(
  contractId: string,
  contractType: ContractType = DEFAULT_CONTRACT_TYPE
) {
  if (!("contractClause" in prisma) || !prisma.contractClause) {
    console.warn("[copyTemplateClausesToContract] contractClause delegate unavailable, skipping");
    return [];
  }

  const type = normalizeContractType(contractType);
  const templates = await getActiveTemplateClauses(type);
  const addon = PRODUCT_ADDON_CLAUSES[type];
  const hasAddon = templates.some((t) => t.sortOrder === addon.sortOrder && t.title === addon.title);

  const clauseData = [
    ...templates.map((t) => ({
      contractId,
      title: t.title,
      content: t.content,
      sortOrder: t.sortOrder,
    })),
    ...(hasAddon
      ? []
      : [
          {
            contractId,
            title: addon.title,
            content: addon.content,
            sortOrder: addon.sortOrder,
          },
        ]),
  ];

  if (clauseData.length === 0) return [];

  await prisma.contractClause.createMany({ data: clauseData });

  return prisma.contractClause.findMany({
    where: { contractId },
    orderBy: { sortOrder: "asc" },
  });
}

export async function replaceContractClausesFromTemplate(
  contractId: string,
  contractType: ContractType
) {
  await prisma.contractClause.deleteMany({ where: { contractId } });
  return copyTemplateClausesToContract(contractId, contractType);
}

export async function getContractClauses(contractId: string) {
  return prisma.contractClause.findMany({
    where: { contractId },
    orderBy: { sortOrder: "asc" },
  });
}

async function seedClausesForType(contractType: ContractType, source?: ClauseInput[]) {
  const data = (source ?? COMMON_TEMPLATE_CLAUSES).map((c) => ({
    ...c,
    contractType,
    isActive: true,
  }));
  await prisma.contractTemplateClause.createMany({ data });
}

let legacyBrandMigrationDone = false;

/**
 * One-time-safe migration: rewrite legacy provider brand names in stored template text.
 * Idempotent — only updates rows that still contain legacy brand strings.
 */
export async function migrateLegacyProviderBrandInStoredTemplates(): Promise<void> {
  if (legacyBrandMigrationDone) return;
  if (!("contractTemplateClause" in prisma) || !prisma.contractTemplateClause) {
    return;
  }

  const clauses = await prisma.contractTemplateClause.findMany({
    select: { id: true, title: true, content: true },
  });

  await Promise.all(
    clauses.map(async (clause) => {
      const nextTitle = displayProviderCompanyInText(clause.title);
      const nextContent = displayProviderCompanyInText(clause.content);
      if (nextTitle === clause.title && nextContent === clause.content) return;

      await prisma.contractTemplateClause.update({
        where: { id: clause.id },
        data: { title: nextTitle, content: nextContent },
      });
    })
  );

  const settings = await prisma.companySettings.findFirst({
    select: {
      id: true,
      companyName: true,
      defaultContractPurpose: true,
      defaultContractPurposeGuarantee: true,
    },
  });

  if (!settings) return;

  const data: {
    companyName?: string;
    defaultContractPurpose?: string;
    defaultContractPurposeGuarantee?: string;
  } = {};

  if (containsLegacyProviderBrand(settings.companyName)) {
    data.companyName = PROVIDER_COMPANY_DISPLAY_NAME;
  }

  if (containsLegacyProviderBrand(settings.defaultContractPurpose)) {
    data.defaultContractPurpose = displayProviderCompanyInText(
      settings.defaultContractPurpose ?? ""
    );
  }
  if (containsLegacyProviderBrand(settings.defaultContractPurposeGuarantee)) {
    data.defaultContractPurposeGuarantee = displayProviderCompanyInText(
      settings.defaultContractPurposeGuarantee ?? ""
    );
  }

  if (Object.keys(data).length > 0) {
    await prisma.companySettings.update({
      where: { id: settings.id },
      data,
    });
  }

  legacyBrandMigrationDone = true;
}

/** Ensures admin-editable template rows exist per contract type. */
export async function ensureTemplateClausesInDb(contractType?: ContractType) {
  if (!("contractTemplateClause" in prisma) || !prisma.contractTemplateClause) {
    return;
  }

  const types: ContractType[] = contractType
    ? [normalizeContractType(contractType)]
    : ["NAVER_PLACE_MONTHLY_MANAGEMENT", "NAVER_PLACE_MONTHLY_GUARANTEE"];

  for (const type of types) {
    const count = await prisma.contractTemplateClause.count({ where: { contractType: type } });
    if (count > 0) continue;

    if (type === "NAVER_PLACE_MONTHLY_MANAGEMENT") {
      await seedClausesForType(type);
      continue;
    }

    const management = await prisma.contractTemplateClause.findMany({
      where: { contractType: "NAVER_PLACE_MONTHLY_MANAGEMENT" },
      orderBy: { sortOrder: "asc" },
    });

    if (management.length > 0) {
      await seedClausesForType(
        type,
        management.map(({ title, content, sortOrder }) => ({ title, content, sortOrder }))
      );
    } else {
      await seedClausesForType(type);
    }
  }
}

export async function seedDefaultTemplateClauses() {
  await prisma.contractTemplateClause.deleteMany();
  await seedClausesForType("NAVER_PLACE_MONTHLY_MANAGEMENT");
  await seedClausesForType("NAVER_PLACE_MONTHLY_GUARANTEE");
}

export function getContractTypeLabel(contractType: string): string {
  return CONTRACT_TYPE_LABELS[contractType] ?? CONTRACT_TYPE_LABELS[DEFAULT_CONTRACT_TYPE];
}

export async function buildTemplatePreview(contractType: ContractType) {
  const type = normalizeContractType(contractType);
  await migrateLegacyProviderBrandInStoredTemplates();
  await ensureTemplateClausesInDb(type);
  const [clauses, templateVersion] = await Promise.all([
    getActiveTemplateClauses(type),
    getTemplateVersion(type),
  ]);
  const defaultPurpose = await getDefaultContractPurpose(type, clauses);
  const defaultSpecialTerms = getDefaultSpecialTermsPlaceholder(clauses);

  return {
    contractType: type,
    contractTypeLabel: getContractTypeLabel(type),
    templateVersion,
    defaultPurpose,
    defaultSpecialTerms,
    clauses,
  };
}

/** @deprecated use getDefaultContractPurpose(contractType) */
export function getDefaultContractPurposeSync(): string {
  return COMMON_TEMPLATE_CLAUSES[0].content;
}
