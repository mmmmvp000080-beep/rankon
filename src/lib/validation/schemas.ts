import { z } from "zod";
import { MAX_SIGNATURE_DATA_URL_SIZE } from "@/lib/constants";
import { CONTRACT_TYPE_LABELS } from "@/lib/constants";
import { CUSTOMER_TYPES } from "@/lib/customer-type";
import { mobilePhoneSchema, representativePhoneSchema } from "@/lib/phone";
import {
  businessRegistrationSchema,
  corporateRegistrationSchema,
} from "@/lib/registration-number";

const customerTypeSchema = z.enum(CUSTOMER_TYPES).default("INDIVIDUAL");

const contractCustomerFieldsSchema = z.object({
  customerType: customerTypeSchema,
  companyName: z.string().min(1, "고객 정보를 입력하세요"),
  representativeName: z.string().optional().nullable().or(z.literal("")),
  contactName: z.string().optional().nullable().or(z.literal("")),
  phone: z.string().min(1, "대표번호를 입력하세요"),
  businessNumber: z.string().optional().nullable().or(z.literal("")),
  corporateRegistrationNumber: z.string().optional().nullable().or(z.literal("")),
});

function validateCustomerFields(
  data: z.infer<typeof contractCustomerFieldsSchema>,
  ctx: z.RefinementCtx
) {
  if (data.customerType === "INDIVIDUAL") {
    if (!data.companyName.trim()) {
      ctx.addIssue({ code: "custom", path: ["companyName"], message: "성명을 입력하세요" });
    }
    const phone = mobilePhoneSchema.safeParse(data.phone);
    if (!phone.success) {
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: phone.error.issues[0]?.message || "대표번호 형식이 올바르지 않습니다.",
      });
    }
    return;
  }

  if (!data.representativeName?.trim()) {
    ctx.addIssue({ code: "custom", path: ["representativeName"], message: "대표자를 입력하세요" });
  }

  const phone = representativePhoneSchema.safeParse(data.phone);
  if (!phone.success) {
    ctx.addIssue({
      code: "custom",
      path: ["phone"],
      message: phone.error.issues[0]?.message || "대표번호 형식이 올바르지 않습니다.",
    });
  }

  const business = businessRegistrationSchema.safeParse(data.businessNumber || "");
  if (!business.success) {
    ctx.addIssue({
      code: "custom",
      path: ["businessNumber"],
      message: business.error.issues[0]?.message || "사업자등록번호 10자리를 정확히 입력해주세요.",
    });
  }

  if (data.customerType === "CORPORATION") {
    const corporate = corporateRegistrationSchema.safeParse(data.corporateRegistrationNumber || "");
    if (!corporate.success) {
      ctx.addIssue({
        code: "custom",
        path: ["corporateRegistrationNumber"],
        message: corporate.error.issues[0]?.message || "법인등록번호 13자리를 정확히 입력해주세요.",
      });
    }
  }
}

export const loginSchema = z.object({
  username: z.string().min(1, "아이디를 입력하세요"),
  password: z.string().min(1, "비밀번호를 입력하세요"),
});

export const contractItemSchema = z.object({
  name: z.string().min(1, "서비스명을 입력하세요"),
  description: z.string().optional().nullable(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().int().min(0),
  sortOrder: z.number().int().min(0).optional(),
});

const contractFormFieldsSchema = contractCustomerFieldsSchema.extend({
  contractType: z
    .enum(["NAVER_PLACE_MONTHLY_MANAGEMENT", "NAVER_PLACE_MONTHLY_GUARANTEE"])
    .default("NAVER_PLACE_MONTHLY_MANAGEMENT"),
  startDate: z.string().min(1, "시작일을 입력하세요"),
  endDate: z.string().min(1, "종료일을 입력하세요"),
  totalAmount: z.number().int().min(0, "계약금액을 입력하세요"),
  vatIncluded: z.boolean(),
  specialTerms: z.string().optional().nullable(),
});

export const createContractSchema = contractFormFieldsSchema.superRefine(validateCustomerFields);

export const updateContractSchema = contractFormFieldsSchema
  .partial()
  .extend({
    internalMemo: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const hasCustomerValidation =
      data.customerType !== undefined ||
      data.companyName !== undefined ||
      data.representativeName !== undefined ||
      data.phone !== undefined ||
      data.businessNumber !== undefined ||
      data.corporateRegistrationNumber !== undefined;

    if (!hasCustomerValidation) return;

    validateCustomerFields(
      {
        customerType: data.customerType ?? "INDIVIDUAL",
        companyName: data.companyName ?? " ",
        representativeName: data.representativeName ?? "",
        contactName: data.contactName ?? "",
        phone: data.phone ?? "",
        businessNumber: data.businessNumber ?? "",
        corporateRegistrationNumber: data.corporateRegistrationNumber ?? "",
      },
      ctx
    );
  });

export const providerSignatureSchema = z.object({
  signerName: z.string().min(1, "서명자 이름을 입력하세요"),
  signerTitle: z.string().optional().nullable(),
  signatureDataUrl: z
    .string()
    .min(1, "서명을 입력하세요")
    .max(MAX_SIGNATURE_DATA_URL_SIZE, "서명 이미지가 너무 큽니다")
    .refine((v) => v.startsWith("data:image/png;base64,"), "올바른 서명 이미지가 아닙니다"),
});

export const customerSignSchema = z.object({
  agreed: z.literal(true, { message: "계약 내용 확인에 동의해야 합니다" }),
  signerName: z.string().min(1, "서명자 이름을 입력하세요"),
  signerTitle: z.string().optional().nullable(),
  signatureDataUrl: z
    .string()
    .min(1, "서명을 입력하세요")
    .max(MAX_SIGNATURE_DATA_URL_SIZE, "서명 이미지가 너무 큽니다")
    .refine((v) => v.startsWith("data:image/png;base64,"), "올바른 서명 이미지가 아닙니다"),
});

export const shareTokenUpdateSchema = z.object({
  isActive: z.boolean().optional(),
  expiresAt: z.string().nullable().optional(),
});

export const companySettingsSchema = z.object({
  companyName: z.string().min(1),
  representativeName: z.string().min(1),
  representativeTitle: z.string().optional().nullable(),
  businessNumber: z.string(),
  address: z.string(),
  phone: z.string(),
  email: z.string(),
  defaultContractPurpose: z.string().optional(),
  defaultContractPurposeGuarantee: z.string().optional(),
});

export const templateClauseSchema = z.object({
  title: z.string().min(1, "조항 제목을 입력하세요"),
  content: z.string().min(1, "조항 내용을 입력하세요"),
});

export const fileCategorySchema = z.enum(["BUSINESS_LICENSE", "BANKBOOK", "OTHER"]);

export function calculateItemAmount(quantity: number, unitPrice: number): number {
  return quantity * unitPrice;
}

export function calculateTotalAmount(items: Array<{ quantity: number; unitPrice: number }>): number {
  return items.reduce((sum, item) => sum + calculateItemAmount(item.quantity, item.unitPrice), 0);
}

export function buildContractItemFromType(
  contractType: keyof typeof CONTRACT_TYPE_LABELS,
  totalAmount: number
) {
  const name = CONTRACT_TYPE_LABELS[contractType] || "네이버 플레이스 서비스";
  return {
    name,
    description: null as string | null,
    quantity: 1,
    unitPrice: totalAmount,
    amount: totalAmount,
    sortOrder: 0,
  };
}
