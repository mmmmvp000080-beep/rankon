"use client";

import {
  CUSTOMER_TYPE_LABELS,
  CUSTOMER_TYPES,
  CustomerType,
  customerDisplayNameLabel,
} from "@/lib/customer-type";
import { MobilePhoneInput } from "@/components/ui/MobilePhoneInput";
import { RepresentativePhoneInput } from "@/components/ui/RepresentativePhoneInput";
import { RegistrationNumberInput } from "@/components/ui/RegistrationNumberInput";

export interface CustomerContractFormValues {
  customerType: CustomerType;
  companyName: string;
  representativeName: string;
  contactName: string;
  phone: string;
  businessNumber: string;
  corporateRegistrationNumber: string;
}

interface CustomerContractFieldsProps {
  values: CustomerContractFormValues;
  onChange: (patch: Partial<CustomerContractFormValues>) => void;
  disabled?: boolean;
  inputClass?: string;
}

export function CustomerContractFields({
  values,
  onChange,
  disabled = false,
  inputClass = "ui-input",
}: CustomerContractFieldsProps) {
  const { customerType } = values;

  const setType = (next: CustomerType) => {
    onChange({
      customerType: next,
      businessNumber: next === "INDIVIDUAL" ? "" : values.businessNumber,
      corporateRegistrationNumber: next === "CORPORATION" ? values.corporateRegistrationNumber : "",
      representativeName: next === "INDIVIDUAL" ? "" : values.representativeName,
    });
  };

  return (
    <>
      <div className="md:col-span-2">
        <span className="mb-2 block text-sm text-brand-muted">고객 유형 *</span>
        <div className="flex flex-wrap gap-2">
          {CUSTOMER_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              disabled={disabled}
              onClick={() => setType(type)}
              className={`ui-btn ui-btn-sm ${values.customerType === type ? "ui-btn-primary" : "ui-btn-secondary"}`}
            >
              {CUSTOMER_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm text-brand-muted">
          {customerDisplayNameLabel(customerType)} *
        </label>
        <input
          required
          disabled={disabled}
          value={values.companyName}
          onChange={(e) => onChange({ companyName: e.target.value })}
          className={inputClass}
        />
      </div>

      {customerType !== "INDIVIDUAL" && (
        <div>
          <label className="mb-1 block text-sm text-brand-muted">대표자 *</label>
          <input
            required
            disabled={disabled}
            value={values.representativeName}
            onChange={(e) => onChange({ representativeName: e.target.value })}
            className={inputClass}
          />
        </div>
      )}

      {customerType !== "INDIVIDUAL" && (
        <div>
          <label className="mb-1 block text-sm text-brand-muted">담당자명</label>
          <input
            disabled={disabled}
            value={values.contactName}
            onChange={(e) => onChange({ contactName: e.target.value })}
            className={inputClass}
          />
        </div>
      )}

      {(customerType === "SOLE_PROPRIETOR" || customerType === "CORPORATION") && (
        <div>
          <label className="mb-1 block text-sm text-brand-muted">사업자등록번호 *</label>
          <RegistrationNumberInput
            kind="business"
            required
            disabled={disabled}
            value={values.businessNumber}
            onChange={(businessNumber) => onChange({ businessNumber })}
            className={inputClass}
          />
        </div>
      )}

      {customerType === "CORPORATION" && (
        <div>
          <label className="mb-1 block text-sm text-brand-muted">법인등록번호 *</label>
          <RegistrationNumberInput
            kind="corporate"
            required
            disabled={disabled}
            value={values.corporateRegistrationNumber}
            onChange={(corporateRegistrationNumber) => onChange({ corporateRegistrationNumber })}
            className={inputClass}
          />
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm text-brand-muted">대표번호 *</label>
        {customerType === "INDIVIDUAL" ? (
          <MobilePhoneInput
            required
            disabled={disabled}
            value={values.phone}
            onChange={(phone) => onChange({ phone })}
            placeholder="010-0000-0000"
          />
        ) : (
          <RepresentativePhoneInput
            required
            disabled={disabled}
            value={values.phone}
            onChange={(phone) => onChange({ phone })}
          />
        )}
      </div>
    </>
  );
}
