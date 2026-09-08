"use client";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { LOGO_HEIGHT } from "@/lib/logo-assets";
import { CONTRACT_TYPE_PDF_SUBTITLE } from "@/lib/constants";

interface ContractHeroProps {
  contractType: string;
  contractNumber?: string;
}

export function ContractHero({ contractType, contractNumber }: ContractHeroProps) {
  const subtitle = CONTRACT_TYPE_PDF_SUBTITLE[contractType] || "서비스";

  return (
    <header className="contract-hero portal-animate-in">
      <div className="contract-hero-top">
        <div className="contract-hero-brand">
          <BrandLogo layout="full" color="original" height={LOGO_HEIGHT.portalMobile} priority maxWidth={200} />
          <div className="contract-hero-meta">
            <span className="contract-hero-studio">RANKON</span>
            <span className="contract-hero-divider" aria-hidden />
            <span className="contract-hero-badge">전자계약</span>
          </div>
        </div>
        {contractNumber && (
          <span className="contract-hero-number">{contractNumber}</span>
        )}
      </div>

      <div className="contract-hero-center">
        <p className="contract-hero-platform">네이버 플레이스</p>
        <h1 className="contract-hero-title">
          {contractType === "NAVER_PLACE_MONTHLY_GUARANTEE" ? "월보장 계약" : "월관리 계약"}
        </h1>
        <p className="contract-hero-subtitle">고객님의 계약서가 준비되었습니다.</p>
        <p className="contract-hero-product">{subtitle}</p>
      </div>
    </header>
  );
}
