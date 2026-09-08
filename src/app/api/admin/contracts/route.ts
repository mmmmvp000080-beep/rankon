import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/api-utils";
import { failure } from "@/lib/api-response";
import { createContractSchema, buildContractItemFromType } from "@/lib/validation/schemas";
import { generateContractNumber } from "@/lib/contract-number";
import { addContractHistory } from "@/lib/contract-history";
import { copyTemplateClausesToContract, getDefaultContractPurpose } from "@/lib/contract-template";
import { normalizeContractType } from "@/lib/contract-type";
import { generateToken } from "@/lib/contract-snapshot";
import { representativeToDbFields, serializeContract, contractRegistrationFields } from "@/lib/contract-fields";
import { normalizeCustomerType } from "@/lib/customer-type";
import { logServerError } from "@/lib/prisma-error";

export async function GET(request: NextRequest) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const companyName = searchParams.get("companyName") || "";
    const contactName = searchParams.get("contactName") || "";
    const phone = searchParams.get("phone") || "";
    const contractNumber = searchParams.get("contractNumber") || "";
    const status = searchParams.get("status") || "";
    const contractType = searchParams.get("contractType") || "";

    const where: Record<string, unknown> = {};
    if (companyName) where.companyName = { contains: companyName };
    if (contactName) where.contactName = { contains: contactName };
    if (phone) where.phone = { contains: phone };
    if (contractNumber) where.contractNumber = { contains: contractNumber };
    if (status) where.status = status;
    if (contractType) where.contractType = contractType;

    const contracts = await prisma.contract.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        contractNumber: true,
        companyName: true,
        contactName: true,
        contactTitle: true,
        customerType: true,
        phone: true,
        startDate: true,
        endDate: true,
        totalAmount: true,
        contractType: true,
        status: true,
        providerSignedAt: true,
        customerSignedAt: true,
        createdAt: true,
        _count: { select: { uploadedFiles: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: { contracts: contracts.map((contract) => serializeContract(contract)) },
    });
  } catch (err) {
    const detail = logServerError("Contract List Failed", err);
    return failure("계약 목록을 불러올 수 없습니다", 500, detail);
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = createContractSchema.safeParse(body);
    if (!parsed.success) {
      console.error("[Contract Create Failed] Zod validation:", parsed.error.flatten());
      return failure(parsed.error.issues[0]?.message || "입력값이 올바르지 않습니다", 400);
    }

    const data = parsed.data;
    const contractType = normalizeContractType(data.contractType);
    const item = buildContractItemFromType(contractType, data.totalAmount);
    const { contactName, contactTitle } = representativeToDbFields(data);
    const registration = contractRegistrationFields(data);
    const customerType = normalizeCustomerType(data.customerType);
    if (customerType !== "INDIVIDUAL" && !contactName) {
      return failure("대표자명을 입력하세요", 400);
    }

    const contractNumber = await generateContractNumber();
    const shareTokenValue = generateToken();

    const contract = await prisma.contract.create({
      data: {
        contractNumber,
        companyName: data.companyName,
        customerType,
        contactName: contactName || data.companyName.trim(),
        contactTitle,
        phone: data.phone,
        businessNumber: registration.businessNumber,
        corporateRegistrationNumber: registration.corporateRegistrationNumber,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        totalAmount: data.totalAmount,
        vatIncluded: data.vatIncluded,
        contractType,
        contractPurpose: await getDefaultContractPurpose(contractType),
        specialTerms: data.specialTerms || null,
        status: "DRAFT",
        items: { create: [item] },
        shareTokens: {
          create: {
            token: shareTokenValue,
            type: "CONTRACT_SIGN",
            isActive: true,
          },
        },
      },
      include: { items: true },
    });

    await copyTemplateClausesToContract(contract.id, contractType).catch((clauseErr) => {
      console.error("[Contract Create Failed] clause copy:", clauseErr);
    });
    await addContractHistory(contract.id, "CONTRACT_CREATED", `계약 ${contractNumber} 생성`).catch((historyErr) => {
      console.error("[Contract Create Failed] history write:", historyErr);
    });

    const responseContract = serializeContract({
      ...contract,
      contactTitle,
    });

    return NextResponse.json(
      {
        success: true,
        contract: {
          id: responseContract.id,
          shareToken: shareTokenValue,
          contractNumber: responseContract.contractNumber,
          companyName: responseContract.companyName,
          representativeName: responseContract.representativeName,
          contactName: responseContract.contactName,
          phone: responseContract.phone,
          totalAmount: responseContract.totalAmount,
          status: responseContract.status,
        },
        data: { contract: { ...responseContract, shareToken: shareTokenValue } },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[Contract Create Failed]", err);
    const message = err instanceof Error ? err.message : "계약 생성 중 오류가 발생했습니다";
    return failure(message, 500);
  }
}
